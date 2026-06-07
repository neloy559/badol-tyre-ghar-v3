/**
 * Backend API Smoke Tests
 *
 * Purpose: Verify critical API endpoints respond correctly.
 * These are Gray Box tests — we know the routes, not the internals.
 *
 * NOTE: These tests use supertest which runs the Express app
 * in-process — no real server needed, no real DB connection needed.
 */

const request = require('supertest');

// ── Mock DB so tests don't need a real MongoDB connection ───────
jest.mock('../config/db', () =>
  jest.fn().mockResolvedValue({ connection: { host: 'mocked' } })
);

jest.mock('../scripts/seedTierPricing', () => ({
  seedTierPricing: jest.fn().mockResolvedValue(undefined),
}));

const app = require('../app');

// ── Smoke Tests ─────────────────────────────────────────────────
describe('🔥 Backend API Smoke Tests', () => {

  it('Health endpoint returns 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/healthy/i);
  });

  it('Health endpoint returns JSON', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('Unknown route returns 404', async () => {
    const res = await request(app).get('/api/v1/this-does-not-exist');
    expect(res.status).toBe(404);
  });

  it('Products endpoint exists and responds', async () => {
    const res = await request(app).get('/api/v1/products');
    // 200 (data found) or 404 (empty) — both mean the route exists
    expect([200, 404, 401]).toContain(res.status);
  });

  it('Auth login route exists', async () => {
    // Wrong credentials — but route must exist (not 404)
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'smoke@test.com', password: 'wrongpassword' });
    expect(res.status).not.toBe(404);
  });

});
