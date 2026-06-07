/**
 * Property-Based Tests: upgrade.controller.js — admin-facing endpoints
 *
 * Feature: customer-dealer-upgrade
 * Library: fast-check (https://fast-check.dev/)
 * Min iterations per property: 100 (fast-check default)
 *
 * All DB interactions are fully mocked — no real MongoDB connection is needed.
 */

// ── Prevent Mongoose from trying to connect to a real DB ─────────────────────
jest.mock('../config/db', () =>
  jest.fn().mockResolvedValue({ connection: { host: 'mocked' } })
);

// ── Mock the User model BEFORE importing the controller ──────────────────────
jest.mock('../modules/users/user.model');

// ── Mock AuditLog ─────────────────────────────────────────────────────────────
jest.mock('../modules/ops/models', () => ({
  AuditLog: { create: jest.fn().mockResolvedValue({}) },
}));

const fc = require('fast-check');
const User = require('../modules/users/user.model');
const {
  listUpgradeRequests,
  approveUpgradeRequest,
  rejectUpgradeRequest,
} = require('../modules/users/upgrade.controller');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal Express mock-res that captures the last status code and JSON body. */
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

/** Build a mock Express request. */
function mockReq({ user = {}, body = {}, params = {}, query = {} } = {}) {
  return { user, body, params, query };
}

/**
 * Create a Mongoose query chain mock whose final `.lean()` resolves to `value`.
 */
function makeMockQuery(value) {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
  };
  return mockQuery;
}

/**
 * Build a mock user document that the controller can mutate and .save().
 */
function makeMockDbUser(overrides = {}) {
  return {
    _id: 'user-id-admin-pbt',
    role: 'customer',
    upgradeStatus: 'pending',
    upgradeRejectionReason: null,
    upgradeDetails: {
      businessName: 'Test Biz',
      ownerName: 'Test Owner',
      address: '123 Test Street',
      appliedAt: new Date(),
    },
    profile: {
      shopName: null,
      address: null,
    },
    isVerified: false,
    registrationStatus: 'pending',
    isDeleted: false,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

// =============================================================================
// Property 8: Admin list filter correctness
// Feature: customer-dealer-upgrade, Property 8: Admin list filter correctness
// Validates: Requirements 5.3, 5.4
// =============================================================================
describe('Property 8 — listUpgradeRequests filter correctness', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries with the correct role/upgradeStatus/isDeleted filter for each status value', async () => {
    const allStatuses = ['pending', 'approved', 'rejected'];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...allStatuses),
        // Generate 0–10 mock users that already satisfy the filter for this status
        fc.array(
          fc.record({
            _id: fc.string({ unit: 'binary-ascii', minLength: 1, maxLength: 10 }),
            phone: fc.string({ unit: 'binary-ascii', minLength: 5, maxLength: 15 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (status, rawUsers) => {
          const roleFilter = status === 'approved' ? 'dealer' : 'customer';

          // Build mock users that satisfy the filter
          const mockUsers = rawUsers.map((u) => ({
            ...u,
            role: roleFilter,
            upgradeStatus: status,
            isDeleted: false,
          }));

          const mockQuery = makeMockQuery(mockUsers);
          User.find.mockReturnValue(mockQuery);
          User.countDocuments.mockResolvedValue(mockUsers.length);

          const req = mockReq({ query: { status }, user: { _id: 'admin-id' } });
          const res = mockRes();

          await listUpgradeRequests(req, res);

          // 1. Response must be 200
          expect(res.status).toHaveBeenCalledWith(200);

          // 2. User.find must have been called with the correct filter
          expect(User.find).toHaveBeenCalledWith({
            role: roleFilter,
            upgradeStatus: status,
            isDeleted: false,
          });

          // 3. Every user in the response satisfies the filter constraints
          const jsonArg = res.json.mock.calls[0][0];
          const returnedUsers = jsonArg.data.users;

          for (const u of returnedUsers) {
            expect(u.role).toBe(roleFilter);
            expect(u.upgradeStatus).toBe(status);
            expect(u.isDeleted).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 9: Admin list sort order
// Feature: customer-dealer-upgrade, Property 9: Admin list sort order
// Validates: Requirements 5.5
// =============================================================================
describe('Property 9 — listUpgradeRequests requests descending sort by appliedAt', () => {
  beforeEach(() => jest.clearAllMocks());

  it('always calls sort with { upgradeDetails.appliedAt: -1 }', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 2–20 mock users, each with an arbitrary appliedAt Date
        fc.array(
          fc.record({
            _id: fc.string({ unit: 'binary-ascii', minLength: 1, maxLength: 10 }),
            upgradeStatus: fc.constant('pending'),
            role: fc.constant('customer'),
            isDeleted: fc.constant(false),
            upgradeDetails: fc.record({
              appliedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
              businessName: fc.string({ unit: 'binary-ascii', minLength: 2, maxLength: 50 }),
              ownerName: fc.string({ unit: 'binary-ascii', minLength: 2, maxLength: 50 }),
              address: fc.string({ unit: 'binary-ascii', minLength: 5, maxLength: 100 }),
            }),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        async (mockUsers) => {
          const mockQuery = makeMockQuery(mockUsers);
          User.find.mockReturnValue(mockQuery);
          User.countDocuments.mockResolvedValue(mockUsers.length);

          const req = mockReq({ query: { status: 'pending' }, user: { _id: 'admin-id' } });
          const res = mockRes();

          await listUpgradeRequests(req, res);

          expect(res.status).toHaveBeenCalledWith(200);

          // The controller must request descending sort by appliedAt
          expect(mockQuery.sort).toHaveBeenCalledWith({ 'upgradeDetails.appliedAt': -1 });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 10: Approve sets all required fields correctly
// Feature: customer-dealer-upgrade, Property 10: Approve sets all required fields correctly
// Validates: Requirements 6.4
// =============================================================================
describe('Property 10 — approveUpgradeRequest sets all required fields correctly', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets role=dealer, upgradeStatus=approved, registrationStatus=approved, isVerified=true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          _id: fc.string({ unit: 'binary-ascii', minLength: 1, maxLength: 24 }),
          businessName: fc.string({ unit: 'binary-ascii', minLength: 2, maxLength: 100 }),
          ownerName: fc.string({ unit: 'binary-ascii', minLength: 2, maxLength: 100 }),
          address: fc.string({ unit: 'binary-ascii', minLength: 5, maxLength: 300 }),
        }),
        async ({ _id, businessName, ownerName, address }) => {
          const dbUser = makeMockDbUser({
            _id,
            upgradeStatus: 'pending',
            role: 'customer',
            profile: { shopName: null, address: null },
            upgradeDetails: {
              businessName,
              ownerName,
              address,
              appliedAt: new Date(),
            },
          });

          User.findOne.mockResolvedValue(dbUser);

          const req = mockReq({
            params: { id: _id },
            user: { _id: 'admin-id' },
          });
          const res = mockRes();

          await approveUpgradeRequest(req, res);

          // HTTP 200
          expect(res.status).toHaveBeenCalledWith(200);

          // All four required fields must be updated
          expect(dbUser.role).toBe('dealer');
          expect(dbUser.upgradeStatus).toBe('approved');
          expect(dbUser.registrationStatus).toBe('approved');
          expect(dbUser.isVerified).toBe(true);

          // save() must have been called
          expect(dbUser.save).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 11: Approve conditional field copy
// Feature: customer-dealer-upgrade, Property 11: Approve conditional field copy
// Validates: Requirements 6.5
// =============================================================================
describe('Property 11 — approveUpgradeRequest conditional field copy logic', () => {
  beforeEach(() => jest.clearAllMocks());

  it('copies businessName→profile.shopName and address→profile.address only when the target is null/undefined/empty', async () => {
    const emptyOrNull = fc.oneof(fc.constant(null), fc.constant(''), fc.constant('Existing Name'));
    const emptyOrNullAddr = fc.oneof(fc.constant(null), fc.constant(''), fc.constant('Existing Address'));

    await fc.assert(
      fc.asyncProperty(
        // Original profile fields
        emptyOrNull,
        emptyOrNullAddr,
        // upgradeDetails source fields
        fc.string({ unit: 'binary-ascii', minLength: 2, maxLength: 100 }),
        fc.string({ unit: 'binary-ascii', minLength: 5, maxLength: 300 }),
        async (originalShopName, originalAddress, upgradeBusinessName, upgradeAddress) => {
          const dbUser = makeMockDbUser({
            upgradeStatus: 'pending',
            role: 'customer',
            profile: {
              shopName: originalShopName,
              address: originalAddress,
            },
            upgradeDetails: {
              businessName: upgradeBusinessName,
              ownerName: 'Test Owner',
              address: upgradeAddress,
              appliedAt: new Date(),
            },
          });

          User.findOne.mockResolvedValue(dbUser);

          const req = mockReq({
            params: { id: 'user-id-admin-pbt' },
            user: { _id: 'admin-id' },
          });
          const res = mockRes();

          await approveUpgradeRequest(req, res);

          expect(res.status).toHaveBeenCalledWith(200);

          const shopNameWasEmpty = !originalShopName; // null or ''
          const addressWasEmpty = !originalAddress;   // null or ''

          if (shopNameWasEmpty) {
            // Must have been copied from upgradeDetails.businessName
            expect(dbUser.profile.shopName).toBe(upgradeBusinessName);
          } else {
            // Must remain unchanged
            expect(dbUser.profile.shopName).toBe(originalShopName);
          }

          if (addressWasEmpty) {
            // Must have been copied from upgradeDetails.address
            expect(dbUser.profile.address).toBe(upgradeAddress);
          } else {
            // Must remain unchanged
            expect(dbUser.profile.address).toBe(originalAddress);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 12: Reject preserves customer role and stores reason
// Feature: customer-dealer-upgrade, Property 12: Reject preserves customer role and stores reason
// Validates: Requirements 7.4, 7.5
// =============================================================================
describe('Property 12 — rejectUpgradeRequest preserves role and stores reason', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets upgradeStatus=rejected, stores reason, and role stays customer', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ unit: 'binary-ascii', minLength: 0, maxLength: 500 }),
        async (rejectionReason) => {
          const dbUser = makeMockDbUser({
            upgradeStatus: 'pending',
            role: 'customer',
          });

          User.findOne.mockResolvedValue(dbUser);

          const req = mockReq({
            params: { id: 'user-id-admin-pbt' },
            body: { rejectionReason },
            user: { _id: 'admin-id' },
          });
          const res = mockRes();

          await rejectUpgradeRequest(req, res);

          // HTTP 200
          expect(res.status).toHaveBeenCalledWith(200);

          // upgradeStatus must be 'rejected'
          expect(dbUser.upgradeStatus).toBe('rejected');

          // The reason must be stored exactly as provided
          expect(dbUser.upgradeRejectionReason).toBe(rejectionReason);

          // Role must remain 'customer'
          expect(dbUser.role).toBe('customer');

          // save() must have been called
          expect(dbUser.save).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
