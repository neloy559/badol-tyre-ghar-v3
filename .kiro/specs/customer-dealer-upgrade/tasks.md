# Implementation Plan: Customer-to-Dealer Upgrade

## Overview

Implement the full vertical slice for the customer-to-dealer upgrade feature: extend the User schema, add the upgrade controller with 6 endpoints, wire new routes into the existing router, add the `DealerUpgradeSection` to `Profile.jsx`, add the "Upgrade Requests" tab to `AdminRegistrations.jsx`, and write unit, property-based, integration, and smoke tests.

---

## Tasks

- [x] 1. Extend User model with upgrade fields
  - Open `backend/src/modules/users/user.model.js`
  - Add `upgradeStatus` field: `{ type: String, enum: ['none','pending','approved','rejected'], default: 'none' }`
  - Add `upgradeRejectionReason` field: `{ type: String, default: null }`
  - Add `upgradeDetails` sub-document: `{ businessName: String, ownerName: String, address: String, appliedAt: Date }` — all fields optional, no `required`
  - Preserve all existing fields unchanged
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.1 Write smoke tests for User schema paths
    - Assert `upgradeStatus`, `upgradeRejectionReason`, and `upgradeDetails` paths exist on the schema
    - Assert `User.create({})` without `upgradeStatus` resolves with `upgradeStatus === 'none'`
    - **Property 1: Schema default for missing upgradeStatus**
    - **Validates: Requirements 1.5**

- [x] 2. Create upgrade.controller.js — Zod schemas and customer endpoints
  - Create `backend/src/modules/users/upgrade.controller.js`
  - Define `submitSchema`, `listQuerySchema`, and `rejectBodySchema` Zod schemas at the top of the file
  - Implement `submitUpgradeRequest`: validate body, check role guard (403), check conflict guards (409 × 2), write `upgradeDetails` + `upgradeStatus: 'pending'`, save, respond 200
  - Implement `withdrawUpgradeRequest`: check `upgradeStatus === 'pending'` (409), reset all upgrade fields, save, respond 200
  - Implement `getUpgradeStatus`: read `upgradeStatus`, `upgradeRejectionReason`, `upgradeDetails` from `req.user._id`; return `upgradeDetails` as `{}` when unset; never include `password`
  - Wrap all three handlers in `try/catch` calling `sendError(res, 500, err.message)`
  - _Requirements: 2.1–2.9, 3.1–3.7, 4.1–4.5_

  - [x] 2.1 Write property test for Zod input validation (Property 2)
    - Use fast-check to generate arbitrary strings for `businessName`, `ownerName`, `address`
    - Assert `submitSchema.safeParse` accepts iff all length constraints pass
    - **Property 2: Upgrade request input validation correctness**
    - **Validates: Requirements 2.2, 8.6, 12.1**

  - [x] 2.2 Write property test for role guard (Property 3)
    - Generate user objects with `role` ∈ `{admin, editor, sales_partner, dealer}`
    - Call `submitUpgradeRequest` controller; assert HTTP 403 returned for each
    - **Property 3: Role guard on upgrade submission**
    - **Validates: Requirements 2.4**

  - [x] 2.3 Write property test for submit persistence (Property 4)
    - Generate valid triples + users with `upgradeStatus` ∈ `['none','rejected']`
    - After controller call assert `upgradeStatus='pending'` and all four `upgradeDetails` fields saved correctly
    - **Property 4: Submit upgrade request persists state correctly**
    - **Validates: Requirements 2.7**

  - [x] 2.4 Write property test for submit-then-read round-trip (Property 5)
    - Generate valid triples; call submit then GET; assert returned fields match submitted values
    - **Property 5: Submit-then-read round-trip**
    - **Validates: Requirements 4.2**

  - [x] 2.5 Write property test for submit-then-withdraw full state reset (Property 6)
    - Generate valid submissions; call DELETE after POST; assert `upgradeStatus='none'` and all `upgradeDetails` fields are `null`
    - **Property 6: Submit-then-withdraw round-trip (full state reset)**
    - **Validates: Requirements 3.3, 3.4**

  - [x] 2.6 Write property test — password never in customer upgrade responses (Property 7, customer endpoints)
    - Generate users in any `upgradeStatus`; call GET /me/upgrade-request; assert no `password` key at any nesting level
    - **Property 7 (partial): Password never present in customer upgrade API response**
    - **Validates: Requirements 4.4, 12.7**

  - [x] 2.7 Write unit tests for customer endpoint guards
    - Submit: role guard (403) for dealer, admin, editor, sales_partner
    - Submit: duplicate-pending guard (409)
    - Submit: already-approved guard (409)
    - Withdraw: no-pending guard (409)
    - GET: returns `upgradeDetails: {}` when `upgradeStatus` is `'none'`
    - _Requirements: 2.4–2.6, 3.2, 4.3_

- [x] 3. Checkpoint — customer endpoints
  - Ensure all tests for tasks 1 and 2 pass; ask the user if questions arise.

- [x] 4. Create upgrade.controller.js — admin endpoints
  - In `backend/src/modules/users/upgrade.controller.js`, implement:
  - `listUpgradeRequests`: validate query with `listQuerySchema`; query Users by `role`+`upgradeStatus`+`isDeleted: false` (role is `"dealer"` when `status=approved`, else `"customer"`); sort by `upgradeDetails.appliedAt` desc; paginate; return `{ users, total, page, limit }` with safe field projection; never include `password`
  - `approveUpgradeRequest`: lookup by `:id` (404 guard), `upgradeStatus !== 'pending'` (409 guard); set `role='dealer'`, `upgradeStatus='approved'`, `registrationStatus='approved'`, `isVerified=true`; conditionally copy `businessName`→`profile.shopName` and `address`→`profile.address` when target fields are empty; save; fire-and-forget AuditLog (`APPROVE_DEALER_UPGRADE`); respond 200
  - `rejectUpgradeRequest`: validate body with `rejectBodySchema`; lookup by `:id` (404 guard), `upgradeStatus !== 'pending'` (409 guard); set `upgradeStatus='rejected'`, `upgradeRejectionReason`; role stays `"customer"`; save; fire-and-forget AuditLog (`REJECT_DEALER_UPGRADE`, `details: { rejectionReason }`); respond 200
  - Wrap all three in `try/catch`
  - _Requirements: 5.1–5.7, 6.1–6.8, 7.1–7.8_

  - [x] 4.1 Write property test for admin list filter correctness (Property 8)
    - Generate mixed user databases with varying `upgradeStatus` and `role`; assert every result matches requested filter
    - **Property 8: Admin list filter correctness**
    - **Validates: Requirements 5.3, 5.4**

  - [x] 4.2 Write property test for admin list sort order (Property 9)
    - Generate multiple upgrade requests with varying `appliedAt`; assert adjacent results satisfy descending order
    - **Property 9: Admin list sort order**
    - **Validates: Requirements 5.5**

  - [x] 4.3 Write property test for approve field updates (Property 10)
    - Generate users with `upgradeStatus='pending'`; after `approveUpgradeRequest` assert `role='dealer'`, `upgradeStatus='approved'`, `registrationStatus='approved'`, `isVerified=true`
    - **Property 10: Approve sets all required fields correctly**
    - **Validates: Requirements 6.4**

  - [x] 4.4 Write property test for approve conditional field copy (Property 11)
    - Generate users with varying `profile.shopName` / `profile.address` (null, empty, non-empty); assert conditional copy logic is correct post-approve
    - **Property 11: Approve conditional field copy**
    - **Validates: Requirements 6.5**

  - [x] 4.5 Write property test for reject preserves role + stores reason (Property 12)
    - Generate arbitrary reason strings (including `""`); after reject assert `upgradeStatus='rejected'`, reason preserved, `role='customer'`
    - **Property 12: Reject preserves customer role and stores reason**
    - **Validates: Requirements 7.4, 7.5**

  - [x] 4.6 Write property test — password never in admin upgrade responses (Property 7, admin endpoints)
    - Call `listUpgradeRequests`, `approveUpgradeRequest`, `rejectUpgradeRequest`; assert no `password` key in any response
    - **Property 7 (partial): Password never present in admin upgrade API responses**
    - **Validates: Requirements 5.6, 12.7**

  - [x] 4.7 Write unit tests for admin endpoint guards
    - Approve: user-not-found guard (404)
    - Approve: not-pending guard (409)
    - Reject: user-not-found guard (404)
    - Reject: not-pending guard (409)
    - AuditLog write failure on approve does not change HTTP 200 response
    - AuditLog write failure on reject does not change HTTP 200 response
    - _Requirements: 6.2, 6.3, 6.6, 7.3, 7.4, 7.6_

- [x] 5. Wire upgrade routes into Express routers
  - Create `backend/src/routes/users.js` with `protect` applied and the three customer routes:
    - `POST /me/upgrade-request` → `upgrade.submitUpgradeRequest`
    - `DELETE /me/upgrade-request` → `upgrade.withdrawUpgradeRequest`
    - `GET /me/upgrade-request` → `upgrade.getUpgradeStatus`
  - Mount `/users` router in `backend/src/routes/index.js`
  - Append three admin routes to `backend/src/routes/admin.js` (already protected by `protect` + `restrictTo`):
    - `GET /upgrade-requests` → `upgrade.listUpgradeRequests`
    - `PATCH /upgrade-requests/:id/approve` → `upgrade.approveUpgradeRequest`
    - `PATCH /upgrade-requests/:id/reject` → `upgrade.rejectUpgradeRequest`
  - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 12.3_

  - [x] 5.1 Write integration tests for route wiring
    - `protect` middleware rejects unauthenticated requests for all six endpoints (401)
    - `restrictTo('admin', 'editor')` rejects customer tokens on the three admin endpoints (403)
    - `GET /api/v1/admin/upgrade-requests?status=pending` returns expected response shape with a valid admin token
    - `PATCH /admin/upgrade-requests/:id/approve` triggers role change end-to-end against a test DB
    - _Requirements: 12.3, 5.1, 6.1, 7.1_

- [x] 6. Checkpoint — backend complete
  - Ensure all backend tests pass (unit, property-based, integration, smoke); ask the user if questions arise.

- [x] 7. Add DealerUpgradeSection to Profile.jsx
  - Open `src/pages/Profile.jsx`
  - Add a `DealerUpgradeSection` component (can be defined in the same file or a sibling file)
  - Render it conditionally only when `user.role === 'customer'`
  - Use `useQuery({ queryKey: ['my-upgrade-request'], queryFn: ... })` to fetch `GET /api/v1/users/me/upgrade-request` on mount
  - Loading state: render a skeleton placeholder inside the section
  - Error state: render error message + retry button scoped to the section (rest of page unaffected)
  - `upgradeStatus === 'none'` or `'rejected'`: render the upgrade application form
    - If `upgradeStatus === 'rejected'` and `upgradeRejectionReason` is non-empty, render rejection reason banner above form
    - Form fields: Business Name, Owner Name, Address
    - Validate with react-hook-form + Zod resolver (businessName min 2, ownerName min 2, address min 5); inline errors under each input
    - Submit mutation: POST to `/api/v1/users/me/upgrade-request`; disable button + show spinner while in-flight; on success invalidate `['my-upgrade-request']`; on error display API error inline below form
  - `upgradeStatus === 'pending'`: render read-only pending panel showing businessName, ownerName, address, appliedAt, and "Withdraw Application" button
    - On "Withdraw Application" click: open `<ConfirmDialog>`
    - On confirmation: call DELETE `/api/v1/users/me/upgrade-request`; on success invalidate `['my-upgrade-request']`; on error display API error inside the panel (dialog does not auto-close on failure)
  - `upgradeStatus === 'approved'`: render nothing (section hidden)
  - _Requirements: 8.1–8.14_

  - [x] 7.1 Write unit tests for DealerUpgradeSection
    - Renders nothing when `user.role !== 'customer'`
    - Skeleton shown during query loading
    - Error state + retry button shown on query error
    - Rejection reason banner shown when `upgradeStatus='rejected'` and reason is non-empty
    - Pending panel shows submitted details (businessName, ownerName, address, appliedAt)
    - ConfirmDialog opens on "Withdraw Application" click
    - API error displayed inline after submit mutation failure
    - _Requirements: 8.1–8.14_

- [x] 8. Add "Upgrade Requests" tab to AdminRegistrations.jsx
  - Open `src/pages/admin/AdminRegistrations.jsx`
  - Add an "Upgrade Requests" tab alongside existing dealer registration tabs
  - When tab is active:
    - `useQuery({ queryKey: ['upgrade-requests', { status, page }], queryFn: ... })` fetching `GET /api/v1/admin/upgrade-requests?status=pending&page=...`
    - Loading state: Skeleton layout consistent with existing dealer card skeleton
    - Error state: error message + retry button
    - Empty state: "No pending upgrade requests."
    - Cards display available fields only (`phone`, `profile.name` if present, `businessName`, `ownerName`, `address`, `appliedAt`); hide absent fields rather than blank label
    - "Approve" button: calls `PATCH /api/v1/admin/upgrade-requests/:id/approve`; on success invalidate `['upgrade-requests']`; on failure display API error inline on the card
    - "Reject" button: open `<ConfirmDialog>` with optional rejection reason textarea; on confirmation call `PATCH /api/v1/admin/upgrade-requests/:id/reject` with `{ rejectionReason }`; on success invalidate `['upgrade-requests']`; on failure display API error inline on the card
  - Tab badge: `useQuery({ queryKey: ['upgrade-requests-count'], queryFn: ... })` fetching `GET /api/v1/admin/upgrade-requests?status=pending&limit=1`; use `total` field for the numeric badge
  - Pagination: show controls when total > 20; driven by `page` metadata from API
  - _Requirements: 9.1–9.11_

  - [x] 8.1 Write unit tests for AdminRegistrations upgrade tab
    - Badge count reflects `total` from count query
    - Empty state message "No pending upgrade requests." when list is empty
    - Pagination controls hidden when total ≤ 20
    - `profile.name` field hidden when absent from API response
    - _Requirements: 9.5, 9.6, 9.10, 9.11_

- [x] 9. Write property-based tests for login and post-approval JWT behavior
  - `backend/tests/upgrade.pbt.test.js` (or equivalent)

  - [x] 9.1 Write property test — customer login not blocked by upgradeStatus (Property 13)
    - Generate customer users with any `upgradeStatus` value; assert login handler does not apply `registrationStatus` gate
    - **Property 13: Customer login not blocked by upgradeStatus**
    - **Validates: Requirements 10.1, 10.2, 10.3**

  - [x] 9.2 Write property test — post-approval JWT contains updated role (Property 14)
    - Generate users upgraded to dealer; generate new access token; assert JWT payload contains `role='dealer'`
    - **Property 14: Post-approval JWT contains updated role**
    - **Validates: Requirements 11.1**

  - [x] 9.3 Write property test for schema default (Property 1)
    - Generate User-like objects without an explicit `upgradeStatus` field
    - Instantiate via Mongoose and assert `upgradeStatus === 'none'`
    - **Property 1: Schema default for missing upgradeStatus**
    - **Validates: Requirements 1.5**

- [x] 10. Final checkpoint — full suite green
  - Ensure all tests pass (smoke, unit, property-based, integration); ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints (tasks 3, 6, 10) ensure incremental validation at each layer boundary.
- All 14 correctness properties from the design document are covered by property-based tests using fast-check (minimum 100 iterations each).
- Unit tests and property tests are complementary; neither replaces the other.
- AuditLog writes are fire-and-forget — test that a write failure does not change the HTTP 200 response.
- No separate migration script is needed; Mongoose schema defaults handle pre-existing documents.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"] },
    { "id": 3, "tasks": ["5.1"] },
    { "id": 4, "tasks": ["7.1", "8.1"] },
    { "id": 5, "tasks": ["9.1", "9.2", "9.3"] }
  ]
}
```
