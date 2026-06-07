# Requirements Document

## Introduction

This feature enables an already-registered **customer** to apply for dealer account privileges from within their own profile, without creating a new account. It is distinct from the existing public dealer self-registration flow (`POST /api/v1/auth/dealer/register`), which creates a brand-new account. Here, the customer is already authenticated; they submit an upgrade request that queues their existing account for admin review.

The feature covers four areas:

1. **Upgrade Application**: a customer submits business details to request dealer privileges.
2. **Pending State Management**: the customer's account reflects the pending upgrade and the customer remains a functional customer until approval.
3. **Admin Review**: the admin reviews, approves, or rejects upgrade requests, integrated into the existing `AdminRegistrationsModule` at `/admin/registrations`.
4. **Post-Approval Transition**: on approval the account's `role` changes to `"dealer"`, `registrationStatus` becomes `"approved"`, and tier assignment is available immediately.

The system uses: React 19 + Vite (JSX) frontend, Node.js + Express 5 backend, MongoDB + Mongoose, JWT auth (protect / restrictTo middleware), and TanStack Query.

---

## Glossary

- **Customer**: A User whose `role` is `"customer"` and who has a valid, active account.
- **Upgrade Request**: An authenticated customer's application to become a dealer, stored as state on the User document rather than a separate collection.
- **UpgradeStatus**: The value of `upgradeStatus` field on the User document, tracking the customer's dealer-upgrade application. One of `"none"`, `"pending"`, `"approved"`, `"rejected"`.
- **User**: The Mongoose model at `backend/src/modules/users/user.model.js`.
- **AuthContext**: The React context at `src/context/AuthContext.jsx` that holds the authenticated user object and exposes `user`, `logout`, `isAdmin`.
- **Profile Page**: The React page at `src/pages/Profile.jsx` where a customer manages their account details.
- **AdminRegistrationsModule**: The existing admin component at `src/pages/admin/AdminRegistrations.jsx` that lists and processes dealer registrations. The upgrade queue is integrated here as a separate tab.
- **UpgradeController**: The new backend controller module at `backend/src/modules/users/upgrade.controller.js` that handles customer upgrade API operations.
- **protect**: The existing Express middleware that verifies JWT and attaches `req.user`.
- **restrictTo**: The existing Express middleware for role-based access control.
- **sendSuccess / sendError**: The existing Express response helpers used across all backend routes.
- **AuditLog**: The existing Mongoose model in `backend/src/modules/ops/models/index.js` that records admin actions.
- **ConfirmDialog**: The existing shared modal component at `src/components/ui/ConfirmDialog.jsx`.
- **TanStack Query**: The frontend data-fetching library used throughout the project (`useQuery`, `useMutation`, `useQueryClient`).

---

## Requirements

### Requirement 1: Upgrade Request Data Model

**User Story:** As a developer, I want the User document to carry upgrade-request state, so that no separate collection is needed and the existing registration approval infrastructure can process customer upgrades.

#### Acceptance Criteria

1. THE User model SHALL include an `upgradeStatus` field of type `String` with allowed enum values `["none", "pending", "approved", "rejected"]` and default value `"none"`.
2. THE User model SHALL include an `upgradeRejectionReason` field of type `String` that is nullable (may be explicitly set to `null`) with default value `null`, set by the admin when an upgrade request is rejected.
3. THE User model SHALL include an `upgradeDetails` sub-document with the following optional fields: `businessName` (String, optional), `ownerName` (String, optional), `address` (String, optional), and `appliedAt` (Date, optional); all four fields SHALL be undefined/absent by default and SHALL NOT be required at document creation time.
4. THE User model SHALL preserve all existing fields (`phone`, `password`, `role`, `isVerified`, `isDeleted`, `tier`, `registrationStatus`, `rejectionReason`, `discountMultiplier`, `creditLimit`, `paymentTerms`, `verificationDetails`, `profile`, `analytics`) without modification when the three new upgrade fields are added.
5. IF a User document does not have an explicit `upgradeStatus` value (pre-existing records migrated before the schema change), THEN THE User model SHALL treat the missing value as `"none"` via the schema default.

---

### Requirement 2: Submit Upgrade Request API

**User Story:** As a customer, I want to submit a dealer upgrade application via API, so that my existing account is queued for admin review without losing my customer access.

#### Acceptance Criteria

1. THE UpgradeController SHALL expose `POST /api/v1/users/me/upgrade-request` protected by the `protect` middleware.
2. THE UpgradeController SHALL validate the request body using a Zod schema requiring: `businessName` (String, min 2, max 100), `ownerName` (String, min 2, max 100), `address` (String, min 5, max 300).
3. IF Zod body validation fails, THEN THE UpgradeController SHALL respond with `sendError(res, 400, 'Validation failed', fieldErrors)` before any database operation is performed.
4. IF the authenticated user's `role` is not `"customer"`, THEN THE UpgradeController SHALL respond with `sendError(res, 403, 'Only customers can apply for a dealer upgrade.')`.
5. IF the authenticated user's `upgradeStatus` is `"pending"`, THEN THE UpgradeController SHALL respond with `sendError(res, 409, 'An upgrade request is already pending.')`.
6. IF the authenticated user's `upgradeStatus` is `"approved"`, THEN THE UpgradeController SHALL respond with `sendError(res, 409, 'Your account has already been upgraded to dealer.')`.
7. WHEN the validation passes and the authenticated user's `upgradeStatus` is `"none"` or `"rejected"` (i.e., no conflict exists), THE UpgradeController SHALL overwrite the User document's `upgradeDetails` fields: set `upgradeDetails.businessName` to the provided value, `upgradeDetails.ownerName` to the provided value, `upgradeDetails.address` to the provided value, and `upgradeDetails.appliedAt` to the current server timestamp; and set `upgradeStatus` to `"pending"`.
8. WHEN the upgrade request is saved successfully, THE UpgradeController SHALL respond with `sendSuccess(res, 200, 'Upgrade request submitted. Your application is under review.')`.
9. IF an error occurs during the database operation, THEN THE UpgradeController SHALL catch the error and call `sendError(res, 500, err.message)`.

---

### Requirement 3: Withdraw Upgrade Request API

**User Story:** As a customer, I want to withdraw my pending upgrade application, so that I can cancel an application I submitted by mistake.

#### Acceptance Criteria

1. THE UpgradeController SHALL expose `DELETE /api/v1/users/me/upgrade-request` protected by the `protect` middleware.
2. IF the authenticated user's `upgradeStatus` is not `"pending"`, THEN THE UpgradeController SHALL respond with `sendError(res, 409, 'No pending upgrade request to withdraw.')`.
3. WHEN the authenticated user's `upgradeStatus` is `"pending"`, THE UpgradeController SHALL reset `upgradeStatus` to `"none"` on the User document.
4. WHEN resetting `upgradeStatus`, THE UpgradeController SHALL also clear the `upgradeDetails` sub-document by setting `upgradeDetails.businessName`, `upgradeDetails.ownerName`, `upgradeDetails.address`, and `upgradeDetails.appliedAt` each to `null`.
5. WHEN the User document save operation succeeds, THE UpgradeController SHALL respond with `sendSuccess(res, 200, 'Upgrade request withdrawn.')`.
6. IF the User document save succeeds but a subsequent non-critical operation (such as logging) fails, THE UpgradeController SHALL still return the HTTP 200 success response; the withdrawal is considered complete once the User document is saved.
7. IF an error occurs during the User document save operation, THEN THE UpgradeController SHALL catch the error and call `sendError(res, 500, err.message)`.

---

### Requirement 4: Get Upgrade Request Status API

**User Story:** As a customer, I want to check the current status of my upgrade application via API, so that the frontend can display accurate application state without requiring a full profile reload.

#### Acceptance Criteria

1. THE UpgradeController SHALL expose `GET /api/v1/users/me/upgrade-request` protected by the `protect` middleware.
2. WHEN the endpoint is called by an authenticated user, THE UpgradeController SHALL read the `upgradeStatus`, `upgradeRejectionReason`, and `upgradeDetails` fields from the User document and respond with `sendSuccess(res, 200, ..., { upgradeStatus, upgradeRejectionReason, upgradeDetails })`.
3. WHEN `upgradeStatus` is `"none"` and `upgradeDetails` fields have not been set, THE UpgradeController SHALL return `upgradeDetails` as an empty object `{}` or `null` rather than omitting the field, so that the frontend can reliably destructure the response.
4. THE UpgradeController SHALL never include the `password` field in the response payload.
5. IF an error occurs during the database read operation, THEN THE UpgradeController SHALL catch the error and call `sendError(res, 500, err.message)`.

---

### Requirement 5: Admin: Fetch Upgrade Requests API

**User Story:** As an admin, I want to retrieve a paginated list of customers with pending upgrade requests, so that I can review and act on them efficiently.

#### Acceptance Criteria

1. THE UpgradeController SHALL expose `GET /api/v1/admin/upgrade-requests` protected by `protect` and `restrictTo('admin', 'editor')`.
2. THE UpgradeController SHALL validate query parameters using Zod: `status` (enum `["pending", "approved", "rejected"]`, default `"pending"`), `page` (coerce to integer, min 1, default 1), `limit` (coerce to integer, min 1, max 100, default 20).
3. WHEN `GET /api/v1/admin/upgrade-requests` is called with `status: "pending"` or `status: "rejected"`, THE UpgradeController SHALL query Users where `role` is `"customer"`, `upgradeStatus` matches the `status` parameter, and `isDeleted` is `false`.
4. WHEN `GET /api/v1/admin/upgrade-requests` is called with `status: "approved"`, THE UpgradeController SHALL query Users where `role` is `"dealer"`, `upgradeStatus` is `"approved"`, and `isDeleted` is `false`.
5. WHEN the query executes, THE UpgradeController SHALL return results sorted by `upgradeDetails.appliedAt` in descending order (most recent first), applying a skip of `(page - 1) * limit` and a limit of `limit`.
6. WHEN the query succeeds, THE UpgradeController SHALL respond with `{ users, total, page, limit }`, selecting only the fields `_id`, `profile`, `phone`, `role`, `upgradeStatus`, `upgradeRejectionReason`, `upgradeDetails`, and `createdAt`; the response SHALL never include the `password` field.
7. IF an error occurs, THEN THE UpgradeController SHALL call `sendError(res, 500, err.message)`.

---

### Requirement 6: Admin: Approve Upgrade Request API

**User Story:** As an admin, I want to approve a customer's dealer upgrade request, so that the customer's role is elevated to dealer and they gain access to wholesale pricing immediately.

#### Acceptance Criteria

1. THE UpgradeController SHALL expose `PATCH /api/v1/admin/upgrade-requests/:id/approve` protected by `protect` and `restrictTo('admin', 'editor')`.
2. IF the User specified by `:id` does not exist or has `isDeleted: true`, THEN THE UpgradeController SHALL respond with `sendError(res, 404, 'User not found.')`.
3. IF the User's `upgradeStatus` is not `"pending"`, THEN THE UpgradeController SHALL respond with `sendError(res, 409, 'No pending upgrade request for this user.')`.
4. WHEN the User exists, is not deleted, and has `upgradeStatus: "pending"`, THE UpgradeController SHALL update the User document: set `role` to `"dealer"`, `upgradeStatus` to `"approved"`, `registrationStatus` to `"approved"`, and `isVerified` to `true`.
5. WHEN updating the User document under the conditions of criterion 4, THE UpgradeController SHALL copy `upgradeDetails.businessName` to `profile.shopName` only if `profile.shopName` is `null`, `undefined`, or an empty string (`""`); and SHALL copy `upgradeDetails.address` to `profile.address` only if `profile.address` is `null`, `undefined`, or an empty string (`""`).
6. WHEN the User document is saved successfully, THE UpgradeController SHALL write an AuditLog entry with `action: "APPROVE_DEALER_UPGRADE"`, `targetId: user._id`, and `adminId: req.user._id`; IF the AuditLog write fails, THE UpgradeController SHALL not treat it as a fatal error and SHALL still return the success response.
7. WHEN the operation completes successfully, THE UpgradeController SHALL respond with `sendSuccess(res, 200, 'Upgrade approved. User is now a dealer.')`.
8. IF an error occurs during the User document save operation, THEN THE UpgradeController SHALL call `sendError(res, 500, err.message)`.

---

### Requirement 7: Admin: Reject Upgrade Request API

**User Story:** As an admin, I want to reject a customer's dealer upgrade request with an optional reason, so that the customer can understand the outcome and their account remains as a customer.

#### Acceptance Criteria

1. THE UpgradeController SHALL expose `PATCH /api/v1/admin/upgrade-requests/:id/reject` protected by `protect` and `restrictTo('admin', 'editor')`.
2. THE UpgradeController SHALL validate the request body using Zod: `rejectionReason` (String, optional, max 500 characters, default `""`).
3. IF the User specified by `:id` does not exist or has `isDeleted: true`, THEN THE UpgradeController SHALL respond with `sendError(res, 404, 'User not found.')`.
4. IF the User's `upgradeStatus` is not `"pending"`, THEN THE UpgradeController SHALL respond with `sendError(res, 409, 'No pending upgrade request for this user.')`.
5. WHEN the User exists, is not deleted, and has `upgradeStatus: "pending"`, THE UpgradeController SHALL update the User document: set `upgradeStatus` to `"rejected"` and set `upgradeRejectionReason` to the validated `rejectionReason` value (stored as `""` when not provided); the `role` SHALL remain `"customer"`.
6. WHEN the User document is saved successfully, THE UpgradeController SHALL write an AuditLog entry with `action: "REJECT_DEALER_UPGRADE"`, `targetId: user._id`, `details: { rejectionReason }`, and `adminId: req.user._id`; IF the AuditLog write fails, THE UpgradeController SHALL not treat it as a fatal error and SHALL still return the success response.
7. WHEN the operation completes successfully, THE UpgradeController SHALL respond with `sendSuccess(res, 200, 'Upgrade request rejected.')`.
8. IF an error occurs during the User document save operation, THEN THE UpgradeController SHALL call `sendError(res, 500, err.message)`.

---

### Requirement 8: Customer Profile UI: Upgrade Application Section

**User Story:** As a customer, I want to see a dealer upgrade application section on my profile page, so that I can submit, track, and withdraw my upgrade request without leaving the app.

#### Acceptance Criteria

1. WHEN a logged-in user with `role: "customer"` views the Profile page, THE Profile page SHALL render a "Become a Dealer" section below the existing profile info block.
2. THE Profile page SHALL use TanStack Query (`useQuery`) to fetch upgrade status from `GET /api/v1/users/me/upgrade-request` on mount with `queryKey: ['my-upgrade-request']`; WHILE the query is loading, THE Profile page SHALL render a skeleton placeholder for the "Become a Dealer" section.
3. IF the `['my-upgrade-request']` query returns an error, THE Profile page SHALL render an error state message and a retry button within the "Become a Dealer" section without affecting the rest of the profile page.
4. WHEN the customer's `upgradeStatus` is `"none"` or `"rejected"`, THE Profile page SHALL display an upgrade application form with fields: Business Name, Owner Name, and Address, along with an "Apply for Dealer Account" submit button.
5. IF the customer's `upgradeStatus` is `"rejected"` and `upgradeRejectionReason` is a non-empty string, THE Profile page SHALL display the rejection reason above the re-application form.
6. THE upgrade application form SHALL validate all three fields client-side using react-hook-form with a Zod resolver (businessName min 2, ownerName min 2, address min 5); required-field and min-length errors SHALL be displayed inline beneath each input before submission.
7. WHILE the upgrade submission mutation is in flight, THE Profile page SHALL disable the submit button and display a loading indicator.
8. WHEN the upgrade form is submitted with valid inputs and `POST /api/v1/users/me/upgrade-request` returns HTTP 200, THE Profile page SHALL invalidate the `['my-upgrade-request']` TanStack Query cache key so the section re-fetches and transitions to the pending state display.
9. IF `POST /api/v1/users/me/upgrade-request` returns an error, THE Profile page SHALL display the API error message inline below the form without navigating away.
10. WHEN the customer's `upgradeStatus` is `"pending"`, THE Profile page SHALL display a read-only pending status panel showing the submitted business name, owner name, address, application date, and a "Withdraw Application" button instead of the application form.
11. WHEN the customer clicks "Withdraw Application", THE Profile page SHALL display a ConfirmDialog asking for confirmation before calling `DELETE /api/v1/users/me/upgrade-request`.
12. WHEN `DELETE /api/v1/users/me/upgrade-request` returns HTTP 200, THE Profile page SHALL invalidate the `['my-upgrade-request']` TanStack Query cache key so the section re-fetches and transitions back to the application form state.
13. IF `DELETE /api/v1/users/me/upgrade-request` returns an error, THE Profile page SHALL display the API error message within the pending status panel without navigating away or closing the ConfirmDialog automatically.
14. WHEN a logged-in user with a role other than `"customer"` views the Profile page, THE Profile page SHALL NOT render the "Become a Dealer" section.

---

### Requirement 9: Admin UI: Upgrade Requests Tab in AdminRegistrationsModule

**User Story:** As an admin, I want to see and action customer upgrade requests within the existing Registrations admin module, so that I have one unified place for all dealer onboarding decisions.

#### Acceptance Criteria

1. THE AdminRegistrationsModule SHALL add an "Upgrade Requests" tab alongside the existing `pending`, `approved`, `rejected` dealer registration tabs.
2. WHEN the "Upgrade Requests" tab is active, THE AdminRegistrationsModule SHALL fetch data from `GET /api/v1/admin/upgrade-requests` with query parameters `status=pending&page=1&limit=20` using TanStack Query with `queryKey: ['upgrade-requests', { status, page }]`.
3. WHILE the upgrade requests query is loading, THE AdminRegistrationsModule SHALL render a Skeleton layout consistent with the existing dealer card skeleton.
4. IF the upgrade requests query returns an error, THE AdminRegistrationsModule SHALL render an error state with a retry button that re-executes the query.
5. IF the upgrade requests list is empty, THE AdminRegistrationsModule SHALL render an empty state message: "No pending upgrade requests."
6. WHEN the upgrade request card data is rendered, THE AdminRegistrationsModule SHALL display available fields only; IF a field such as `profile.name` is absent from the API response, THE AdminRegistrationsModule SHALL hide that field rather than displaying a blank label.
7. WHEN an admin clicks "Approve" on an upgrade request card, THE AdminRegistrationsModule SHALL call `PATCH /api/v1/admin/upgrade-requests/:id/approve`; IF the mutation succeeds, THE AdminRegistrationsModule SHALL invalidate the `['upgrade-requests']` TanStack Query cache key; IF the mutation fails, THE AdminRegistrationsModule SHALL display the API error message inline on the card without navigating away.
8. WHEN an admin clicks "Reject" on an upgrade request card, THE AdminRegistrationsModule SHALL display a ConfirmDialog with an optional rejection reason textarea before making any API call.
9. WHEN the admin confirms rejection in the ConfirmDialog, THE AdminRegistrationsModule SHALL call `PATCH /api/v1/admin/upgrade-requests/:id/reject` with `{ rejectionReason: string | "" }`; IF the mutation succeeds, THE AdminRegistrationsModule SHALL invalidate the `['upgrade-requests']` TanStack Query cache key; IF the mutation fails, THE AdminRegistrationsModule SHALL display the API error message inline on the card without navigating away.
10. THE AdminRegistrationsModule SHALL display a numeric badge on the "Upgrade Requests" tab label showing the count of pending upgrade requests; this count SHALL be fetched using TanStack Query with `queryKey: ['upgrade-requests-count']` from `GET /api/v1/admin/upgrade-requests?status=pending&limit=1`, using the `total` field from the response.
11. THE AdminRegistrationsModule SHALL display pagination controls when the total upgrade request count exceeds 20, using page metadata from the API response.

---

### Requirement 10: Login Behaviour: No Disruption for Pending-Upgrade Customers

**User Story:** As a customer with a pending upgrade request, I want to continue logging in and using the app normally, so that applying for dealer status does not interrupt my existing customer experience.

#### Acceptance Criteria

1. WHEN a customer with `upgradeStatus: "pending"` submits valid login credentials to `POST /api/v1/auth/login`, THE Auth module SHALL proceed with the existing login flow and issue tokens normally, without any blocking or additional checks based on `upgradeStatus`.
2. WHEN a customer with `upgradeStatus: "rejected"` submits valid login credentials to `POST /api/v1/auth/login`, THE Auth module SHALL proceed with the existing login flow and issue tokens normally.
3. THE login status-gating check for `registrationStatus` SHALL apply only to users with `role: "dealer"` and SHALL NOT apply to users with `role: "customer"`, regardless of their `upgradeStatus` value.

---

### Requirement 11: Post-Approval Session Update

**User Story:** As a newly upgraded dealer, I want my next login or token refresh to reflect my new dealer role and access level, so that I gain wholesale pricing access without any manual steps.

#### Acceptance Criteria

1. WHEN a user whose `role` was changed to `"dealer"` via upgrade approval issues a new JWT (by logging in fresh or using the refresh token endpoint), THE Auth module SHALL include `role: "dealer"` in the access token payload, because the JWT is generated from the current User document at token-issue time.
2. WHEN a user whose `role` was changed to `"dealer"` calls `GET /api/v1/auth/me`, THE Auth module SHALL return the updated `role: "dealer"` and `isVerified: true` from the live User document in MongoDB.
3. THE UpgradeController SHALL NOT force-expire or invalidate existing JWT tokens at approval time; the role change takes effect at the next natural token refresh or login.

---

### Requirement 12: Global Quality Standards

**User Story:** As a developer, I want all new code in this feature to comply with the project's established quality standards, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE system SHALL apply Zod validation to every new API endpoint's request body or query parameters before any database operation is performed.
2. THE system SHALL wrap every async route handler in a `try/catch` block that calls `sendError(res, 500, err.message)` in the catch clause.
3. THE system SHALL apply `protect` middleware to all new customer-facing endpoints and `protect` plus `restrictTo('admin', 'editor')` to all new admin endpoints; IF `restrictTo` middleware fails to load, THE system SHALL fail completely and not fall back to unprotected access.
4. THE system SHALL render loading, error, and empty states for every new list view and form component in the frontend.
5. THE system SHALL display a ConfirmDialog before executing any destructive or irreversible action (withdrawal, rejection) in the UI.
6. THE system SHALL paginate all new admin list endpoints with a default `limit` of 20 and accept `page` and `limit` as query parameters.
7. THE system SHALL never include the `password` field in any API response payload, regardless of the operation or requesting role.
8. WHERE react-hook-form is used for the upgrade application form, THE Profile page SHALL use a Zod resolver and display inline validation errors before submission.
