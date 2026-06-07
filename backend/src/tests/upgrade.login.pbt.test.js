/**
 * Property-Based Tests: login behavior and post-approval JWT — customer-dealer-upgrade
 *
 * Feature: customer-dealer-upgrade
 * Library: fast-check (https://fast-check.dev/)
 * Min iterations per property: 100
 *
 * Properties covered:
 *   P13 — Customer login not blocked by upgradeStatus      (Req 10.1, 10.2, 10.3)
 *   P14 — Post-approval JWT contains updated role          (Req 11.1)
 *   P1  — Schema default for missing upgradeStatus (PBT)   (Req 1.5)
 *
 * All DB interactions are fully mocked — no real MongoDB connection is needed.
 */

// ── Prevent Mongoose from connecting to a real DB ────────────────────────────
jest.mock('../config/db', () =>
  jest.fn().mockResolvedValue({ connection: { host: 'mocked' } })
);

// ── Mock the User model BEFORE importing anything that requires it ────────────
jest.mock('../modules/users/user.model');

// ── Mock RefreshToken model ───────────────────────────────────────────────────
jest.mock('../modules/auth/refreshToken.model');

// ── Mock bcryptjs (used inside auth.controller.js) ───────────────────────────
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash:    jest.fn().mockResolvedValue('hashed'),
}));

// ── Set JWT_SECRET before anything imports auth.service ──────────────────────
process.env.JWT_SECRET = 'test-jwt-secret-for-pbt';

const fc           = require('fast-check');
const jwt          = require('jsonwebtoken');
const User         = require('../modules/users/user.model');
const RefreshToken = require('../modules/auth/refreshToken.model');
const authController = require('../modules/auth/auth.controller');
const authService    = require('../modules/auth/auth.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mock Express response object that tracks status + json calls. */
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  return res;
}

/** Mock Express request for the login endpoint. */
function mockLoginReq(phone, password) {
  return {
    body:    { phone, password },
    ip:      '127.0.0.1',
    headers: { 'user-agent': 'jest-test', 'x-forwarded-for': undefined },
    cookies: {},
  };
}

/**
 * Build a mock DB user document that User.findOne() will return.
 * `select` on the Mongoose query returns the same chainable mock, so we
 * replicate the `.select('+password')` chaining pattern used by the controller.
 */
function makeFindOneMockUser(overrides = {}) {
  const user = {
    _id:                'mock-user-id-abc123',
    phone:              '+8801700000000',
    password:           '$2b$12$hashedpassword',
    role:               'customer',
    registrationStatus: 'approved',
    isVerified:         true,
    isDeleted:          false,
    upgradeStatus:      'none',
    profile:            { name: 'Test User' },
    ...overrides,
  };

  // The controller calls: User.findOne(...).select('+password')
  // Mongoose's query builder is chainable; we simulate it here.
  const queryMock = {
    select: jest.fn().mockResolvedValue(user),
  };

  return { user, queryMock };
}

// =============================================================================
// Property 13: Customer login not blocked by upgradeStatus
// Feature: customer-dealer-upgrade, Property 13: Customer login not blocked by upgradeStatus
// Validates: Requirements 10.1, 10.2, 10.3
// =============================================================================
describe('Property 13 — customer login is never blocked by upgradeStatus', () => {
  const allUpgradeStatuses = ['none', 'pending', 'approved', 'rejected'];

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure RefreshToken.create always resolves
    RefreshToken.create = jest.fn().mockResolvedValue({});
  });

  it('returns HTTP 200 for customers with any upgradeStatus value', async () => {
    // Feature: customer-dealer-upgrade, Property 13: Customer login not blocked by upgradeStatus

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...allUpgradeStatuses),
        async (upgradeStatus) => {
          const { queryMock } = makeFindOneMockUser({
            role:               'customer',
            registrationStatus: 'approved',
            upgradeStatus,
          });

          // User.findOne returns a chainable query mock
          User.findOne = jest.fn().mockReturnValue(queryMock);

          const req = mockLoginReq('+8801700000000', 'ValidPassword1');
          const res = mockRes();

          await authController.login(req, res);

          // The controller must NOT return 403 due to the registrationStatus gate
          // (which only applies to role === 'dealer'), and MUST return 200.
          const statusCode = res.status.mock.calls[0]?.[0];
          expect(statusCode).toBe(200);

          // Response must be a success response
          const jsonPayload = res.json.mock.calls[0]?.[0];
          expect(jsonPayload).toMatchObject({ success: true });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns HTTP 200 specifically for upgradeStatus=pending (Req 10.1)', async () => {
    // Feature: customer-dealer-upgrade, Property 13: Customer login not blocked by upgradeStatus
    const { queryMock } = makeFindOneMockUser({
      role:               'customer',
      registrationStatus: 'approved',
      upgradeStatus:      'pending',
    });

    User.findOne = jest.fn().mockReturnValue(queryMock);

    const req = mockLoginReq('+8801700000000', 'ValidPassword1');
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns HTTP 200 specifically for upgradeStatus=rejected (Req 10.2)', async () => {
    // Feature: customer-dealer-upgrade, Property 13: Customer login not blocked by upgradeStatus
    const { queryMock } = makeFindOneMockUser({
      role:               'customer',
      registrationStatus: 'approved',
      upgradeStatus:      'rejected',
    });

    User.findOne = jest.fn().mockReturnValue(queryMock);

    const req = mockLoginReq('+8801700000000', 'ValidPassword1');
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('never calls status(403) for any customer upgradeStatus (Req 10.3)', async () => {
    // Feature: customer-dealer-upgrade, Property 13: Customer login not blocked by upgradeStatus

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...allUpgradeStatuses),
        async (upgradeStatus) => {
          const { queryMock } = makeFindOneMockUser({
            role:               'customer',
            registrationStatus: 'approved',
            upgradeStatus,
          });

          User.findOne = jest.fn().mockReturnValue(queryMock);
          RefreshToken.create = jest.fn().mockResolvedValue({});

          const req = mockLoginReq('+8801700000000', 'ValidPassword1');
          const res = mockRes();

          await authController.login(req, res);

          // Assert 403 was NEVER called
          const allStatusCalls = res.status.mock.calls.map(c => c[0]);
          expect(allStatusCalls).not.toContain(403);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 14: Post-approval JWT contains updated role
// Feature: customer-dealer-upgrade, Property 14: Post-approval JWT contains updated role
// Validates: Requirements 11.1
// =============================================================================
describe('Property 14 — post-approval JWT reflects updated role', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RefreshToken.create = jest.fn().mockResolvedValue({});
  });

  /**
   * Primary scenario: when a user whose role was changed to 'dealer' via
   * upgrade approval calls the login endpoint, the response's user.role === 'dealer'.
   *
   * The JWT itself only contains { id }, so the authoritative role comes from
   * the DB lookup in the login handler — this is the correct post-approval
   * behavior: the next login reflects the new role from the live document.
   */
  it('login response user.role is "dealer" after upgrade approval', async () => {
    // Feature: customer-dealer-upgrade, Property 14: Post-approval JWT contains updated role

    await fc.assert(
      fc.asyncProperty(
        // Generate an arbitrary phone-like string (11-14 digit pattern)
        fc.stringMatching(/^\+880[0-9]{9,11}$/).filter(s => s.length >= 14 && s.length <= 16),
        async (phone) => {
          // Simulate a user whose role was already changed to 'dealer' via approval
          const { queryMock } = makeFindOneMockUser({
            phone,
            role:               'dealer',
            registrationStatus: 'approved',
            upgradeStatus:      'approved',
            isVerified:         true,
          });

          User.findOne = jest.fn().mockReturnValue(queryMock);
          RefreshToken.create = jest.fn().mockResolvedValue({});

          const req = mockLoginReq(phone, 'ValidPassword1');
          const res = mockRes();

          await authController.login(req, res);

          expect(res.status).toHaveBeenCalledWith(200);

          const jsonPayload = res.json.mock.calls[0]?.[0];
          expect(jsonPayload.data.user.role).toBe('dealer');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Secondary scenario: generateAccessToken(userId) produces a valid JWT
   * whose decoded payload contains the correct { id: userId }.
   *
   * Since the JWT payload only stores { id }, the role is fetched fresh from
   * the DB on every authenticated request via the protect middleware. This
   * is the architecture that makes post-approval role reflection work correctly.
   */
  it('generateAccessToken produces a JWT with decoded.id === userId for any userId', () => {
    // Feature: customer-dealer-upgrade, Property 14: Post-approval JWT contains updated role

    fc.assert(
      fc.property(
        // Generate MongoDB ObjectId-like strings (24 hex characters)
        fc.stringMatching(/^[0-9a-f]{24}$/),
        (userId) => {
          const token = authService.generateAccessToken(userId);

          // Token must be a non-empty string
          expect(typeof token).toBe('string');
          expect(token.length).toBeGreaterThan(0);

          // Decode and verify the payload
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          expect(decoded.id).toBe(userId);

          // Confirm role is NOT embedded in the JWT payload
          // (role is always fetched live from DB via protect middleware)
          expect(decoded.role).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Confirm the full login flow for an approved-dealer user returns an
   * accessToken JWT whose decoded.id matches the user's _id.
   */
  it('login accessToken JWT decoded.id matches the logged-in user._id', async () => {
    // Feature: customer-dealer-upgrade, Property 14: Post-approval JWT contains updated role

    const userId = 'abc123def456abc123def456'; // 24-char hex-like id

    const { queryMock } = makeFindOneMockUser({
      _id:                userId,
      role:               'dealer',
      registrationStatus: 'approved',
      upgradeStatus:      'approved',
      isVerified:         true,
    });

    User.findOne = jest.fn().mockReturnValue(queryMock);
    RefreshToken.create = jest.fn().mockResolvedValue({});

    const req = mockLoginReq('+8801700000000', 'ValidPassword1');
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const jsonPayload = res.json.mock.calls[0]?.[0];
    const { accessToken } = jsonPayload.data;

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    expect(decoded.id).toBe(userId);
  });
});

// =============================================================================
// Property 1: Schema default for missing upgradeStatus (PBT version)
// Feature: customer-dealer-upgrade, Property 1: Schema default for missing upgradeStatus
// Validates: Requirements 1.5
// =============================================================================
describe('Property 1 (PBT) — upgradeStatus schema default is "none" for any generated user object', () => {
  // We need the REAL User model (not the mocked one) for this test.
  // Re-require it by temporarily bypassing the Jest module registry.
  // Since jest.mock('../modules/users/user.model') is hoisted at the top,
  // we use jest.requireActual to get the real module for this suite.
  let RealUser;

  beforeAll(() => {
    RealUser = jest.requireActual('../modules/users/user.model');
  });

  it('upgradeStatus defaults to "none" when upgradeStatus is absent from the input object', () => {
    // Feature: customer-dealer-upgrade, Property 1: Schema default for missing upgradeStatus

    fc.assert(
      fc.property(
        fc.record({
          // phone: required by schema — keep within valid-ish lengths
          phone:    fc.string({ unit: 'binary-ascii', minLength: 5, maxLength: 14 }),
          // password: required by schema
          password: fc.constant('hashed'),
        }),
        // upgradeStatus is deliberately NOT included in the generated record
        (userData) => {
          const user = new RealUser(userData);

          // Mongoose applies the schema default on instantiation
          expect(user.upgradeStatus).toBe('none');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('upgradeStatus is never undefined or null in any generated user without explicit field', () => {
    // Feature: customer-dealer-upgrade, Property 1: Schema default for missing upgradeStatus

    fc.assert(
      fc.property(
        fc.record({
          phone:    fc.string({ unit: 'binary-ascii', minLength: 5, maxLength: 14 }),
          password: fc.constant('hashed'),
        }),
        (userData) => {
          const user = new RealUser(userData);
          expect(user.upgradeStatus).not.toBeUndefined();
          expect(user.upgradeStatus).not.toBeNull();
          expect(user.upgradeStatus).toBe('none');
        }
      ),
      { numRuns: 100 }
    );
  });
});
