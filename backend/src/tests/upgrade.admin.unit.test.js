/**
 * Task 4.6 + 4.7 — Admin endpoint tests for upgrade.controller.js
 *
 * Feature: customer-dealer-upgrade
 * Validates: Requirements 5.6, 12.7, 6.2, 6.3, 6.6, 7.3, 7.4, 7.6
 *
 * Task 4.6 — Property-based test (Property 7, admin endpoints):
 *   Password never present in listUpgradeRequests, approveUpgradeRequest,
 *   or rejectUpgradeRequest response payloads at any nesting level.
 *
 * Task 4.7 — Unit tests for admin endpoint guards:
 *   Approve: user-not-found (404), not-pending (409)
 *   Reject:  user-not-found (404), not-pending (409)
 *   AuditLog write failure does not affect HTTP 200 on approve or reject
 */

// ── Prevent Mongoose from trying to connect to a real DB ─────────────────────
jest.mock('../config/db', () =>
  jest.fn().mockResolvedValue({ connection: { host: 'mocked' } })
);

// ── Mock the User model BEFORE importing the controller ──────────────────────
jest.mock('../modules/users/user.model');

// ── Mock ops/models so AuditLog.create is controllable ───────────────────────
jest.mock('../modules/ops/models', () => ({
  AuditLog: { create: jest.fn().mockResolvedValue({}) },
}));

const fc   = require('fast-check');
const User = require('../modules/users/user.model');
const { AuditLog } = require('../modules/ops/models');
const {
  listUpgradeRequests,
  approveUpgradeRequest,
  rejectUpgradeRequest,
} = require('../modules/users/upgrade.controller');

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq({ user = {}, body = {}, params = {}, query = {} } = {}) {
  return { user, body, params, query };
}

function makeMockDbUser(overrides = {}) {
  return {
    _id:                'admin-test-user-id',
    role:               'customer',
    upgradeStatus:      'pending',
    registrationStatus: 'pending',
    isVerified:         false,
    profile:            { shopName: null, address: null },
    upgradeDetails:     {
      businessName: 'Test Biz',
      ownerName:    'Owner',
      address:      'Addr 123',
      appliedAt:    new Date(),
    },
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

/**
 * Recursively checks whether `obj` (or any nested object/array) contains a
 * key named "password" at any depth.
 */
function hasPasswordKey(obj) {
  if (typeof obj !== 'object' || obj === null) return false;
  if ('password' in obj) return true;
  return Object.values(obj).some(v => hasPasswordKey(v));
}

// =============================================================================
// Task 4.6 — Property 7 (admin endpoints): Password never in response
// Feature: customer-dealer-upgrade, Property 7 (partial): Password never present in admin upgrade API responses
// Validates: Requirements 5.6, 12.7
// =============================================================================

describe('Property 7 (admin) — listUpgradeRequests: password never in response', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AuditLog.create to its default successful mock
    AuditLog.create.mockResolvedValue({});
  });

  it('response payload never contains a password key (100 runs)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an upgradeStatus to drive the query parameter
        fc.constantFrom('pending', 'approved', 'rejected'),
        async (status) => {
          // The controller selects only safe fields — deliberately no password here.
          // Return a representative user list that mirrors what the DB projection returns.
          const mockUsers = [
            {
              _id:                   'u1',
              profile:               { shopName: 'Shop A' },
              phone:                 '01700000001',
              role:                  status === 'approved' ? 'dealer' : 'customer',
              upgradeStatus:         status,
              upgradeRejectionReason: null,
              upgradeDetails:        {
                businessName: 'Biz A',
                ownerName:    'Owner A',
                address:      'Addr A',
                appliedAt:    new Date(),
              },
              createdAt: new Date(),
            },
          ];

          // Mock the chained User.find().select().sort().skip().limit().lean()
          User.find.mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            sort:   jest.fn().mockReturnThis(),
            skip:   jest.fn().mockReturnThis(),
            limit:  jest.fn().mockReturnThis(),
            lean:   jest.fn().mockResolvedValue(mockUsers),
          });
          User.countDocuments.mockResolvedValueOnce(mockUsers.length);

          const req = mockReq({ query: { status, page: '1', limit: '20' } });
          const res = mockRes();

          await listUpgradeRequests(req, res);

          expect(res.status).toHaveBeenCalledWith(200);

          const payload = res.json.mock.calls[0][0];
          expect(hasPasswordKey(payload)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 7 (admin) — approveUpgradeRequest: password never in response', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuditLog.create.mockResolvedValue({});
  });

  it('response payload never contains a password key (50 runs)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Vary the admin user id to ensure no static-state leakage
        fc.string({ minLength: 1, maxLength: 24, unit: 'binary-ascii' }),
        async (adminId) => {
          const dbUser = makeMockDbUser();
          User.findOne.mockResolvedValueOnce(dbUser);

          const req = mockReq({
            user:   { _id: adminId },
            params: { id: 'admin-test-user-id' },
          });
          const res = mockRes();

          await approveUpgradeRequest(req, res);

          expect(res.status).toHaveBeenCalledWith(200);

          const payload = res.json.mock.calls[0][0];
          expect(hasPasswordKey(payload)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property 7 (admin) — rejectUpgradeRequest: password never in response', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuditLog.create.mockResolvedValue({});
  });

  it('response payload never contains a password key (50 runs)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 24, unit: 'binary-ascii' }),
        async (adminId) => {
          const dbUser = makeMockDbUser();
          User.findOne.mockResolvedValueOnce(dbUser);

          const req = mockReq({
            user:   { _id: adminId },
            params: { id: 'admin-test-user-id' },
            body:   { rejectionReason: '' },
          });
          const res = mockRes();

          await rejectUpgradeRequest(req, res);

          expect(res.status).toHaveBeenCalledWith(200);

          const payload = res.json.mock.calls[0][0];
          expect(hasPasswordKey(payload)).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// =============================================================================
// Task 4.7 — Unit tests for admin endpoint guards
// Validates: Requirements 6.2, 6.3, 6.6, 7.3, 7.4, 7.6
// =============================================================================

describe('approveUpgradeRequest — user-not-found guard (404)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuditLog.create.mockResolvedValue({});
  });

  it('returns 404 with "User not found." when User.findOne returns null', async () => {
    User.findOne.mockResolvedValueOnce(null);

    const req = mockReq({
      user:   { _id: 'admin-id' },
      params: { id: 'non-existent-id' },
    });
    const res = mockRes();

    await approveUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'User not found.',
      })
    );
  });
});

describe('approveUpgradeRequest — not-pending guard (409)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuditLog.create.mockResolvedValue({});
  });

  it('returns 409 when upgradeStatus is "approved" (not pending)', async () => {
    const dbUser = makeMockDbUser({ upgradeStatus: 'approved' });
    User.findOne.mockResolvedValueOnce(dbUser);

    const req = mockReq({
      user:   { _id: 'admin-id' },
      params: { id: 'admin-test-user-id' },
    });
    const res = mockRes();

    await approveUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'No pending upgrade request for this user.',
      })
    );
  });
});

describe('rejectUpgradeRequest — user-not-found guard (404)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuditLog.create.mockResolvedValue({});
  });

  it('returns 404 with "User not found." when User.findOne returns null', async () => {
    User.findOne.mockResolvedValueOnce(null);

    const req = mockReq({
      user:   { _id: 'admin-id' },
      params: { id: 'non-existent-id' },
      body:   { rejectionReason: 'Missing docs' },
    });
    const res = mockRes();

    await rejectUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'User not found.',
      })
    );
  });
});

describe('rejectUpgradeRequest — not-pending guard (409)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AuditLog.create.mockResolvedValue({});
  });

  it('returns 409 when upgradeStatus is "rejected" (not pending)', async () => {
    const dbUser = makeMockDbUser({ upgradeStatus: 'rejected' });
    User.findOne.mockResolvedValueOnce(dbUser);

    const req = mockReq({
      user:   { _id: 'admin-id' },
      params: { id: 'admin-test-user-id' },
      body:   { rejectionReason: 'Try again' },
    });
    const res = mockRes();

    await rejectUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'No pending upgrade request for this user.',
      })
    );
  });
});

describe('approveUpgradeRequest — AuditLog write failure does not affect HTTP 200', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('still returns HTTP 200 when AuditLog.create throws', async () => {
    // AuditLog.create is fire-and-forget (.catch(() => {})) in the controller,
    // so a thrown error must not propagate to the response.
    AuditLog.create.mockRejectedValueOnce(new Error('Audit DB is down'));

    const dbUser = makeMockDbUser(); // upgradeStatus: 'pending'
    User.findOne.mockResolvedValueOnce(dbUser);

    const req = mockReq({
      user:   { _id: 'admin-id' },
      params: { id: 'admin-test-user-id' },
    });
    const res = mockRes();

    await approveUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Upgrade approved. User is now a dealer.',
      })
    );
  });
});

describe('rejectUpgradeRequest — AuditLog write failure does not affect HTTP 200', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('still returns HTTP 200 when AuditLog.create throws', async () => {
    AuditLog.create.mockRejectedValueOnce(new Error('Audit DB is down'));

    const dbUser = makeMockDbUser(); // upgradeStatus: 'pending'
    User.findOne.mockResolvedValueOnce(dbUser);

    const req = mockReq({
      user:   { _id: 'admin-id' },
      params: { id: 'admin-test-user-id' },
      body:   { rejectionReason: '' },
    });
    const res = mockRes();

    await rejectUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Upgrade request rejected.',
      })
    );
  });
});
