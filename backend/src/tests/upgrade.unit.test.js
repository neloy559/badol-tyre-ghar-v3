/**
 * Unit Tests: upgrade.controller.js — customer-facing endpoint guards
 *
 * Feature: customer-dealer-upgrade
 * Validates: Requirements 2.4–2.6, 3.2, 4.3
 *
 * Tests cover:
 *  - Role guard (403) for all non-customer roles on submitUpgradeRequest
 *  - Duplicate-pending guard (409) on submitUpgradeRequest
 *  - Already-approved guard (409) on submitUpgradeRequest
 *  - No-pending guard (409) on withdrawUpgradeRequest
 *  - GET returns upgradeDetails: {} when upgradeStatus is 'none' with no details set
 */

// ── Prevent Mongoose from trying to connect to a real DB ─────────────────────
jest.mock('../config/db', () =>
  jest.fn().mockResolvedValue({ connection: { host: 'mocked' } })
);

// ── Mock the User model BEFORE importing the controller ──────────────────────
jest.mock('../modules/users/user.model');

const User = require('../modules/users/user.model');
const {
  submitUpgradeRequest,
  withdrawUpgradeRequest,
  getUpgradeStatus,
} = require('../modules/users/upgrade.controller');

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockReq({ user = {}, body = {}, params = {} } = {}) {
  return { user, body, params };
}

/** Valid body that would pass Zod validation. */
const validBody = {
  businessName: 'Test Business',
  ownerName: 'Test Owner',
  address: 'Test Address Street 123',
};

// =============================================================================
// Submit: role guards — non-customer roles receive HTTP 403
// =============================================================================
describe('submitUpgradeRequest — role guard (403)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 for role: dealer', async () => {
    const req = mockReq({
      user: { _id: 'uid-1', role: 'dealer', upgradeStatus: 'none' },
      body: validBody,
    });
    const res = mockRes();

    await submitUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('returns 403 for role: admin', async () => {
    const req = mockReq({
      user: { _id: 'uid-2', role: 'admin', upgradeStatus: 'none' },
      body: validBody,
    });
    const res = mockRes();

    await submitUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('returns 403 for role: editor', async () => {
    const req = mockReq({
      user: { _id: 'uid-3', role: 'editor', upgradeStatus: 'none' },
      body: validBody,
    });
    const res = mockRes();

    await submitUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('returns 403 for role: sales_partner', async () => {
    const req = mockReq({
      user: { _id: 'uid-4', role: 'sales_partner', upgradeStatus: 'none' },
      body: validBody,
    });
    const res = mockRes();

    await submitUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });
});

// =============================================================================
// Submit: conflict guards
// =============================================================================
describe('submitUpgradeRequest — conflict guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 409 with correct message when upgradeStatus is already "pending"', async () => {
    const req = mockReq({
      user: { _id: 'uid-5', role: 'customer', upgradeStatus: 'pending' },
      body: validBody,
    });
    const res = mockRes();

    await submitUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'An upgrade request is already pending.',
      })
    );
  });

  it('returns 409 with correct message when upgradeStatus is "approved"', async () => {
    const req = mockReq({
      user: { _id: 'uid-6', role: 'customer', upgradeStatus: 'approved' },
      body: validBody,
    });
    const res = mockRes();

    await submitUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Your account has already been upgraded to dealer.',
      })
    );
  });
});

// =============================================================================
// Withdraw: no-pending guard
// =============================================================================
describe('withdrawUpgradeRequest — no-pending guard (409)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 409 with correct message when upgradeStatus is "none"', async () => {
    const req = mockReq({
      user: { _id: 'uid-7', upgradeStatus: 'none' },
    });
    const res = mockRes();

    await withdrawUpgradeRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'No pending upgrade request to withdraw.',
      })
    );
  });
});

// =============================================================================
// GET upgrade status: returns upgradeDetails: {} when upgradeStatus is 'none'
// =============================================================================
describe('getUpgradeStatus — returns upgradeDetails: {} for none status with no details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns upgradeDetails as {} (empty object) when upgradeStatus is "none" and businessName is null', async () => {
    const leanUser = {
      _id: 'uid-8',
      upgradeStatus: 'none',
      upgradeRejectionReason: null,
      upgradeDetails: {
        businessName: null,
        ownerName: null,
        address: null,
        appliedAt: null,
      },
    };

    User.findById.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(leanUser),
    });

    const req = mockReq({ user: { _id: 'uid-8' } });
    const res = mockRes();

    await getUpgradeStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.upgradeDetails).toEqual({});
  });

  it('returns upgradeDetails as {} when upgradeStatus is "none" and upgradeDetails is undefined', async () => {
    const leanUser = {
      _id: 'uid-9',
      upgradeStatus: 'none',
      upgradeRejectionReason: null,
      // upgradeDetails intentionally absent (simulates a pre-migration document)
    };

    User.findById.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(leanUser),
    });

    const req = mockReq({ user: { _id: 'uid-9' } });
    const res = mockRes();

    await getUpgradeStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.upgradeDetails).toEqual({});
    // Must not be null or undefined
    expect(payload.data.upgradeDetails).not.toBeNull();
    expect(payload.data.upgradeDetails).not.toBeUndefined();
  });
});
