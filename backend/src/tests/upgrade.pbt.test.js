/**
 * Property-Based Tests: upgrade.controller.js — customer-facing endpoints
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

const fc = require('fast-check');
const User = require('../modules/users/user.model');
const {
  submitUpgradeRequest,
  withdrawUpgradeRequest,
  getUpgradeStatus,
  submitSchema,
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
function mockReq({ user = {}, body = {}, params = {} } = {}) {
  return { user, body, params };
}

/**
 * Create a mock DB-user object that the controller can mutate and save.
 * Properties can be overridden via `overrides`.
 */
function makeMockDbUser(overrides = {}) {
  const dbUser = {
    _id: 'user-id-123',
    role: 'customer',
    upgradeStatus: 'none',
    upgradeRejectionReason: null,
    upgradeDetails: {
      businessName: null,
      ownerName: null,
      address: null,
      appliedAt: null,
    },
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  return dbUser;
}

// ── Fast-check arbitrary helpers ──────────────────────────────────────────────

/**
 * Arbitrary string in the binary-ascii range (code points 0-127).
 * Every character occupies exactly one JS code unit, so string.length
 * equals the grapheme count — which is exactly what Zod .min() / .max()
 * counts against.  This prevents surrogate-pair edge cases that could cause
 * a grapheme-length of N to have a JS .length > N.
 */
const asciiStr = (minLen, maxLen) =>
  fc.string({ unit: 'binary-ascii', minLength: minLen, maxLength: maxLen });

/** Arbitrary valid businessName (2..100 chars). */
const validBusinessName = asciiStr(2, 100);
/** Arbitrary valid ownerName (2..100 chars). */
const validOwnerName = asciiStr(2, 100);
/** Arbitrary valid address (5..300 chars). */
const validAddress = asciiStr(5, 300);

/** Arbitrary valid triple. */
const validTriple = fc.record({
  businessName: validBusinessName,
  ownerName: validOwnerName,
  address: validAddress,
});

// =============================================================================
// Property 2: Upgrade request input validation correctness
// Feature: customer-dealer-upgrade, Property 2: Upgrade request input validation correctness
// Validates: Requirements 2.2, 8.6, 12.1
// =============================================================================
describe('Property 2 — submitSchema Zod validation correctness', () => {
  /**
   * For any triple that satisfies all length constraints the schema MUST accept it.
   */
  it('accepts any triple where all length constraints are satisfied', () => {
    fc.assert(
      fc.property(validTriple, ({ businessName, ownerName, address }) => {
        const result = submitSchema.safeParse({ businessName, ownerName, address });
        expect(result.success).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * For any triple that violates at least one length constraint the schema MUST reject it.
   */
  it('rejects any triple where at least one length constraint is violated', () => {
    // Generators for out-of-bounds strings.
    // Using unit: 'binary-ascii' guarantees each character is a single JS
    // code unit, matching Zod's String.prototype.length counting exactly.
    const tooShortBusiness = fc.string({ unit: 'binary-ascii', minLength: 0, maxLength: 1 });   // < 2
    const tooLongBusiness  = fc.string({ unit: 'binary-ascii', minLength: 101, maxLength: 150 }); // > 100
    const tooShortOwner    = fc.string({ unit: 'binary-ascii', minLength: 0, maxLength: 1 });
    const tooLongOwner     = fc.string({ unit: 'binary-ascii', minLength: 101, maxLength: 150 });
    const tooShortAddress  = fc.string({ unit: 'binary-ascii', minLength: 0, maxLength: 4 });   // < 5
    const tooLongAddress   = fc.string({ unit: 'binary-ascii', minLength: 301, maxLength: 400 }); // > 300

    // Build an arbitrary that always violates at least one constraint
    const invalidTriple = fc.oneof(
      // businessName too short
      fc.record({ businessName: tooShortBusiness, ownerName: validOwnerName, address: validAddress }),
      // businessName too long
      fc.record({ businessName: tooLongBusiness, ownerName: validOwnerName, address: validAddress }),
      // ownerName too short
      fc.record({ businessName: validBusinessName, ownerName: tooShortOwner, address: validAddress }),
      // ownerName too long
      fc.record({ businessName: validBusinessName, ownerName: tooLongOwner, address: validAddress }),
      // address too short
      fc.record({ businessName: validBusinessName, ownerName: validOwnerName, address: tooShortAddress }),
      // address too long
      fc.record({ businessName: validBusinessName, ownerName: validOwnerName, address: tooLongAddress })
    );

    fc.assert(
      fc.property(invalidTriple, ({ businessName, ownerName, address }) => {
        const result = submitSchema.safeParse({ businessName, ownerName, address });
        expect(result.success).toBe(false);
      }),
      { numRuns: 200 }
    );
  });
});

// =============================================================================
// Property 3: Role guard on upgrade submission
// Feature: customer-dealer-upgrade, Property 3: Role guard on upgrade submission
// Validates: Requirements 2.4
// =============================================================================
describe('Property 3 — role guard rejects non-customer roles with HTTP 403', () => {
  const nonCustomerRoles = ['admin', 'editor', 'sales_partner', 'dealer'];

  it('returns 403 for every non-customer role', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonCustomerRoles),
        async (role) => {
          const req = mockReq({
            user: { _id: 'some-id', role, upgradeStatus: 'none' },
            body: { businessName: 'Test Biz', ownerName: 'Test Owner', address: 'Test Address 123' },
          });
          const res = mockRes();

          await submitUpgradeRequest(req, res);

          // The response must carry status 403
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 4: Submit upgrade request persists state correctly
// Feature: customer-dealer-upgrade, Property 4: Submit upgrade request persists state correctly
// Validates: Requirements 2.7
// =============================================================================
describe('Property 4 — submitUpgradeRequest persists state correctly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets upgradeStatus=pending and all upgradeDetails fields after a valid submission', async () => {
    const eligibleStatuses = ['none', 'rejected'];

    await fc.assert(
      fc.asyncProperty(
        validTriple,
        fc.constantFrom(...eligibleStatuses),
        async ({ businessName, ownerName, address }, initialStatus) => {
          // Set up mock DB user
          const dbUser = makeMockDbUser({
            role: 'customer',
            upgradeStatus: initialStatus,
          });
          User.findById.mockResolvedValue(dbUser);

          const beforeCall = Date.now();

          const req = mockReq({
            user: { _id: 'user-id-123', role: 'customer', upgradeStatus: initialStatus },
            body: { businessName, ownerName, address },
          });
          const res = mockRes();

          await submitUpgradeRequest(req, res);

          const afterCall = Date.now();

          // Should have responded with 200
          expect(res.status).toHaveBeenCalledWith(200);

          // save() must have been called
          expect(dbUser.save).toHaveBeenCalledTimes(1);

          // upgradeStatus must be 'pending' after the call
          expect(dbUser.upgradeStatus).toBe('pending');

          // upgradeDetails fields must match the submitted values
          expect(dbUser.upgradeDetails.businessName).toBe(businessName);
          expect(dbUser.upgradeDetails.ownerName).toBe(ownerName);
          expect(dbUser.upgradeDetails.address).toBe(address);

          // appliedAt must be a recent Date (within the test window)
          const appliedAt = dbUser.upgradeDetails.appliedAt;
          expect(appliedAt).toBeInstanceOf(Date);
          expect(appliedAt.getTime()).toBeGreaterThanOrEqual(beforeCall);
          expect(appliedAt.getTime()).toBeLessThanOrEqual(afterCall + 100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 5: Submit-then-read round-trip
// Feature: customer-dealer-upgrade, Property 5: Submit-then-read round-trip
// Validates: Requirements 4.2
// =============================================================================
describe('Property 5 — submit-then-read round-trip returns the same data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET returns upgradeStatus=pending and the same details that were POSTed', async () => {
    await fc.assert(
      fc.asyncProperty(
        validTriple,
        async ({ businessName, ownerName, address }) => {
          // ── STEP 1: submitUpgradeRequest ──────────────────────────────────
          const dbUserForSubmit = makeMockDbUser({ role: 'customer', upgradeStatus: 'none' });
          User.findById.mockResolvedValueOnce(dbUserForSubmit);

          const submitReq = mockReq({
            user: { _id: 'user-id-123', role: 'customer', upgradeStatus: 'none' },
            body: { businessName, ownerName, address },
          });
          const submitRes = mockRes();

          await submitUpgradeRequest(submitReq, submitRes);

          expect(submitRes.status).toHaveBeenCalledWith(200);

          // ── STEP 2: getUpgradeStatus ──────────────────────────────────────
          // The "database" after submit should reflect the mutated dbUserForSubmit state.
          // We build the lean read-model from the mutable object that was just saved.
          const leanReadUser = {
            _id: 'user-id-123',
            upgradeStatus: dbUserForSubmit.upgradeStatus,       // 'pending'
            upgradeRejectionReason: null,
            upgradeDetails: { ...dbUserForSubmit.upgradeDetails }, // copied
          };

          // findById returns a chainable .select().lean() object
          User.findById.mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(leanReadUser),
          });

          const getReq = mockReq({
            user: { _id: 'user-id-123' },
          });
          const getRes = mockRes();

          await getUpgradeStatus(getReq, getRes);

          // Status 200
          expect(getRes.status).toHaveBeenCalledWith(200);

          // Parse the response payload
          const jsonArg = getRes.json.mock.calls[0][0];
          const { data } = jsonArg;

          expect(data.upgradeStatus).toBe('pending');
          expect(data.upgradeDetails.businessName).toBe(businessName);
          expect(data.upgradeDetails.ownerName).toBe(ownerName);
          expect(data.upgradeDetails.address).toBe(address);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 6: Submit-then-withdraw full state reset
// Feature: customer-dealer-upgrade, Property 6: Submit-then-withdraw round-trip (full state reset)
// Validates: Requirements 3.3, 3.4
// =============================================================================
describe('Property 6 — submit-then-withdraw resets all upgrade fields to null/none', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('after withdraw: upgradeStatus=none and all upgradeDetails fields are null', async () => {
    await fc.assert(
      fc.asyncProperty(
        validTriple,
        async ({ businessName, ownerName, address }) => {
          // ── STEP 1: submitUpgradeRequest ──────────────────────────────────
          const dbUserForSubmit = makeMockDbUser({ role: 'customer', upgradeStatus: 'none' });
          User.findById.mockResolvedValueOnce(dbUserForSubmit);

          const submitReq = mockReq({
            user: { _id: 'user-id-123', role: 'customer', upgradeStatus: 'none' },
            body: { businessName, ownerName, address },
          });
          const submitRes = mockRes();

          await submitUpgradeRequest(submitReq, submitRes);
          expect(submitRes.status).toHaveBeenCalledWith(200);
          // After submit the user object has upgradeStatus='pending'

          // ── STEP 2: withdrawUpgradeRequest ───────────────────────────────
          // We need a separate mock user object in 'pending' state for the withdraw call.
          // We simulate the DB returning the same user (now in pending state).
          const dbUserForWithdraw = makeMockDbUser({
            role: 'customer',
            upgradeStatus: 'pending',
            upgradeDetails: {
              businessName,
              ownerName,
              address,
              appliedAt: new Date(),
            },
          });
          User.findById.mockResolvedValueOnce(dbUserForWithdraw);

          const withdrawReq = mockReq({
            user: { _id: 'user-id-123', upgradeStatus: 'pending' },
          });
          const withdrawRes = mockRes();

          await withdrawUpgradeRequest(withdrawReq, withdrawRes);

          // Should have responded 200
          expect(withdrawRes.status).toHaveBeenCalledWith(200);

          // save() must have been called
          expect(dbUserForWithdraw.save).toHaveBeenCalledTimes(1);

          // upgradeStatus MUST be 'none'
          expect(dbUserForWithdraw.upgradeStatus).toBe('none');

          // All four upgradeDetails fields MUST be null
          expect(dbUserForWithdraw.upgradeDetails.businessName).toBeNull();
          expect(dbUserForWithdraw.upgradeDetails.ownerName).toBeNull();
          expect(dbUserForWithdraw.upgradeDetails.address).toBeNull();
          expect(dbUserForWithdraw.upgradeDetails.appliedAt).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 7 (partial): Password never present in customer upgrade API response
// Feature: customer-dealer-upgrade, Property 7 (partial): Password never present in customer upgrade API response
// Validates: Requirements 4.4, 12.7
// =============================================================================
describe('Property 7 — password key is never present in getUpgradeStatus response', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper: recursively checks whether `obj` (or any nested object) contains a
   * key named "password" at any level of nesting.
   */
  function hasPasswordKey(obj) {
    if (typeof obj !== 'object' || obj === null) return false;
    if ('password' in obj) return true;
    return Object.values(obj).some(v => hasPasswordKey(v));
  }

  it('response payload never contains a password key for users in any upgradeStatus', async () => {
    const allStatuses = ['none', 'pending', 'approved', 'rejected'];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...allStatuses),
        async (upgradeStatus) => {
          // Build a lean user that mimics what the DB returns after .select().lean()
          // The select projection in getUpgradeStatus explicitly omits password,
          // so we deliberately DO NOT include it — but we also verify the
          // controller never smuggles it in from any other path.
          const leanUser = {
            _id: 'user-id-pbt7',
            upgradeStatus,
            upgradeRejectionReason: upgradeStatus === 'rejected' ? 'Some reason' : null,
            upgradeDetails:
              upgradeStatus === 'none'
                ? { businessName: null, ownerName: null, address: null, appliedAt: null }
                : {
                    businessName: 'Test Biz',
                    ownerName: 'Test Owner',
                    address: 'Test Address 123',
                    appliedAt: new Date(),
                  },
          };

          // findById(...).select(...).lean() chain
          User.findById.mockReturnValueOnce({
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(leanUser),
          });

          const req = mockReq({ user: { _id: 'user-id-pbt7' } });
          const res = mockRes();

          await getUpgradeStatus(req, res);

          expect(res.status).toHaveBeenCalledWith(200);

          // Extract the JSON payload passed to res.json()
          const payload = res.json.mock.calls[0][0];

          // The entire response payload must not contain a 'password' key at any depth
          expect(hasPasswordKey(payload)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
