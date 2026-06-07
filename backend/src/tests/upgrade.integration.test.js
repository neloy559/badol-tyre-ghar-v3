/**
 * Integration Tests: upgrade route wiring
 *
 * Feature: customer-dealer-upgrade
 * Validates: Requirements 12.3, 5.1, 6.1, 7.1
 *
 * Tests verify:
 *  1. protect middleware rejects unauthenticated requests (401) for all 6 endpoints
 *  2. restrictTo('admin','editor') rejects customer tokens on the 3 admin endpoints (403)
 *  3. GET /api/v1/admin/upgrade-requests?status=pending returns expected shape with admin token
 *  4. PATCH /api/v1/admin/upgrade-requests/:id/approve triggers role change (end-to-end shape)
 *
 * Uses supertest against an Express app built from the actual routers.
 * Auth middleware and DB are mocked so no real MongoDB connection is needed.
 */

// ── Mock DB BEFORE any module that touches it ─────────────────────────────────
jest.mock('../config/db', () =>
  jest.fn().mockResolvedValue({ connection: { host: 'mocked' } })
);

// ── Mock User model ───────────────────────────────────────────────────────────
jest.mock('../modules/users/user.model');

// ── Mock AuditLog ─────────────────────────────────────────────────────────────
jest.mock('../modules/ops/models', () => ({
  AuditLog: { create: jest.fn().mockResolvedValue({}) },
}));

// ── Mock auth middleware — MUST be mocked before requiring routes ─────────────
// protect: reads user from X-Test-User header (JSON-encoded)
// restrictTo: checks req.user.role against allowed roles
jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    const userHeader = req.headers['x-test-user'];
    if (!userHeader) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated. Please log in.',
      });
    }
    req.user = JSON.parse(userHeader);
    next();
  },
  restrictTo: (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  },
}));

const request = require('supertest');
const express = require('express');

// Build the test Express app using the actual routers
const app = express();
app.use(express.json());
const indexRouter = require('../routes/index');
app.use('/api/v1', indexRouter);

// ── Pull mocked modules for configuration in individual tests ─────────────────
const User      = require('../modules/users/user.model');
const { AuditLog } = require('../modules/ops/models');

// ── Test helpers ──────────────────────────────────────────────────────────────
const asUser = (user) => ({ 'x-test-user': JSON.stringify(user) });

const adminUser    = { _id: 'admin-id',    role: 'admin' };
const customerUser = { _id: 'customer-id', role: 'customer', upgradeStatus: 'none' };

// =============================================================================
// 1. protect rejects unauthenticated requests (401) for all 6 endpoints
// =============================================================================
describe('protect middleware — rejects unauthenticated requests (401)', () => {
  it('POST /api/v1/users/me/upgrade-request without auth header → 401', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/upgrade-request')
      .send({});
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });

  it('DELETE /api/v1/users/me/upgrade-request without auth header → 401', async () => {
    const res = await request(app)
      .delete('/api/v1/users/me/upgrade-request');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });

  it('GET /api/v1/users/me/upgrade-request without auth header → 401', async () => {
    const res = await request(app)
      .get('/api/v1/users/me/upgrade-request');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });

  it('GET /api/v1/admin/upgrade-requests without auth header → 401', async () => {
    const res = await request(app)
      .get('/api/v1/admin/upgrade-requests');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });

  it('PATCH /api/v1/admin/upgrade-requests/123/approve without auth header → 401', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/upgrade-requests/123/approve');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });

  it('PATCH /api/v1/admin/upgrade-requests/123/reject without auth header → 401', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/upgrade-requests/123/reject');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false });
  });
});

// =============================================================================
// 2. restrictTo('admin','editor') rejects customer tokens on 3 admin endpoints (403)
// =============================================================================
describe('restrictTo middleware — rejects customer tokens on admin endpoints (403)', () => {
  it('GET /api/v1/admin/upgrade-requests with customer token → 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/upgrade-requests')
      .set(asUser(customerUser));
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false });
  });

  it('PATCH /api/v1/admin/upgrade-requests/123/approve with customer token → 403', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/upgrade-requests/123/approve')
      .set(asUser(customerUser));
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false });
  });

  it('PATCH /api/v1/admin/upgrade-requests/123/reject with customer token → 403', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/upgrade-requests/123/reject')
      .set(asUser(customerUser));
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false });
  });
});

// =============================================================================
// 3. GET /api/v1/admin/upgrade-requests?status=pending returns expected shape
//    with a valid admin token
// =============================================================================
describe('GET /api/v1/admin/upgrade-requests — response shape with admin token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with { data: { users: [], total: 0, page: 1, limit: 20 } }', async () => {
    // Mock User.find(...).select().sort().skip().limit().lean() → []
    User.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort:   jest.fn().mockReturnThis(),
      skip:   jest.fn().mockReturnThis(),
      limit:  jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue([]),
    });
    User.countDocuments.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/v1/admin/upgrade-requests?status=pending')
      .set(asUser(adminUser));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      data: {
        users:  [],
        total:  0,
        page:   1,
        limit:  20,
      },
    });
  });
});

// =============================================================================
// 4. PATCH /api/v1/admin/upgrade-requests/:id/approve — end-to-end shape test
//    Verifies the controller executes and returns the expected success message
// =============================================================================
describe('PATCH /api/v1/admin/upgrade-requests/:id/approve — end-to-end shape', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuditLog.create.mockResolvedValue({});
  });

  it('returns 200 with { success: true, message: "Upgrade approved. User is now a dealer." }', async () => {
    const pendingUser = {
      _id:                'target-user-id',
      role:               'customer',
      upgradeStatus:      'pending',
      registrationStatus: 'pending',
      isVerified:         false,
      profile:            { shopName: null, address: null },
      upgradeDetails:     {
        businessName: 'Best Tyres Ltd',
        ownerName:    'Rahim Uddin',
        address:      'Dhaka Road 12',
        appliedAt:    new Date(),
      },
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(pendingUser);

    const res = await request(app)
      .patch('/api/v1/admin/upgrade-requests/target-user-id/approve')
      .set(asUser(adminUser));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Upgrade approved. User is now a dealer.',
    });
  });
});
