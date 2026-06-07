/**
 * Smoke Tests: User model — upgrade fields
 *
 * Purpose: Verify that upgradeStatus, upgradeRejectionReason, and upgradeDetails
 * schema paths exist and that upgradeStatus defaults to 'none' when not supplied.
 *
 * Feature: customer-dealer-upgrade, Property 1: Schema default for missing upgradeStatus
 * Validates: Requirements 1.5
 *
 * These tests run in-process — no real MongoDB connection is needed.
 * We use the Mongoose schema/model API directly to inspect paths and defaults.
 */

// ── Prevent Mongoose from trying to connect to a real DB ────────
jest.mock('../config/db', () =>
  jest.fn().mockResolvedValue({ connection: { host: 'mocked' } })
);

const mongoose = require('mongoose');
const User = require('../modules/users/user.model');

describe('User model — upgrade fields smoke tests', () => {

  // ── 1. Schema paths exist ──────────────────────────────────────
  describe('Schema path existence', () => {
    it('upgradeStatus path exists on the schema', () => {
      const path = User.schema.path('upgradeStatus');
      expect(path).toBeDefined();
    });

    it('upgradeRejectionReason path exists on the schema', () => {
      const path = User.schema.path('upgradeRejectionReason');
      expect(path).toBeDefined();
    });

    it('upgradeDetails sub-document exists (child paths are registered)', () => {
      // Mongoose registers nested object fields as child paths (e.g. upgradeDetails.businessName),
      // not as a single parent path. We verify at least one child path is present.
      const childPaths = Object.keys(User.schema.paths).filter(k => k.startsWith('upgradeDetails.'));
      expect(childPaths.length).toBeGreaterThan(0);
    });

    it('upgradeDetails.businessName path exists on the schema', () => {
      const path = User.schema.path('upgradeDetails.businessName');
      expect(path).toBeDefined();
    });

    it('upgradeDetails.ownerName path exists on the schema', () => {
      const path = User.schema.path('upgradeDetails.ownerName');
      expect(path).toBeDefined();
    });

    it('upgradeDetails.address path exists on the schema', () => {
      const path = User.schema.path('upgradeDetails.address');
      expect(path).toBeDefined();
    });

    it('upgradeDetails.appliedAt path exists on the schema', () => {
      const path = User.schema.path('upgradeDetails.appliedAt');
      expect(path).toBeDefined();
    });
  });

  // ── 2. upgradeStatus default value ────────────────────────────
  describe('upgradeStatus schema default (Property 1)', () => {
    it('upgradeStatus defaults to "none" when not supplied', () => {
      // Instantiate a User document without setting upgradeStatus.
      // phone + password are required, but we only care about the default here.
      const user = new User({ phone: '+8801700000000', password: 'hashed' });
      // Apply schema defaults by accessing the field (Mongoose populates defaults
      // on instantiation, so the path value is available without saving).
      expect(user.upgradeStatus).toBe('none');
    });

    it('upgradeStatus is "none" even when an explicit undefined is passed', () => {
      const user = new User({ phone: '+8801700000001', password: 'hashed', upgradeStatus: undefined });
      expect(user.upgradeStatus).toBe('none');
    });

    it('upgradeStatus schema path has default value "none"', () => {
      const pathDef = User.schema.path('upgradeStatus');
      expect(pathDef.defaultValue).toBe('none');
    });

    it('upgradeStatus enum contains the four expected values', () => {
      const pathDef = User.schema.path('upgradeStatus');
      const enumValues = pathDef.enumValues;
      expect(enumValues).toEqual(expect.arrayContaining(['none', 'pending', 'approved', 'rejected']));
      expect(enumValues).toHaveLength(4);
    });
  });

  // ── 3. upgradeRejectionReason defaults to null ────────────────
  describe('upgradeRejectionReason default', () => {
    it('upgradeRejectionReason defaults to null when not supplied', () => {
      const user = new User({ phone: '+8801700000002', password: 'hashed' });
      expect(user.upgradeRejectionReason).toBeNull();
    });
  });

  // ── 4. upgradeDetails sub-fields are optional (no required) ───
  describe('upgradeDetails sub-fields are optional', () => {
    it('instantiating a User without upgradeDetails does not throw a validation error', () => {
      const user = new User({ phone: '+8801700000003', password: 'hashed' });
      // Only check upgrade-related paths; phone+password are required but present
      const err = user.validateSync(['upgradeDetails', 'upgradeStatus', 'upgradeRejectionReason']);
      expect(err).toBeUndefined();
    });
  });

  // ── 5. Existing fields preserved ──────────────────────────────
  describe('Pre-existing fields still present (Requirements 1.4)', () => {
    // Scalar / array top-level paths are directly accessible via .path()
    const scalarFields = [
      'phone', 'password', 'role', 'isVerified', 'isDeleted',
      'tier', 'registrationStatus', 'rejectionReason',
      'discountMultiplier', 'creditLimit', 'paymentTerms',
    ];

    scalarFields.forEach((field) => {
      it(`"${field}" path still exists on the schema`, () => {
        expect(User.schema.path(field)).toBeDefined();
      });
    });

    // Mongoose registers nested objects as child paths, not as a single parent.
    // We verify each nested group via its known child paths.
    const nestedParents = ['verificationDetails', 'profile', 'analytics'];

    nestedParents.forEach((parent) => {
      it(`"${parent}" child paths still exist on the schema`, () => {
        const childPaths = Object.keys(User.schema.paths).filter(k => k.startsWith(parent + '.'));
        expect(childPaths.length).toBeGreaterThan(0);
      });
    });
  });

});
