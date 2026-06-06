# Requirements Document

## Introduction

This document specifies requirements for completing BTG (Badol Tyre Ghar) v1.0.0. Three feature areas are in scope: an **Analytics Dashboard** for admin users, a **Dealer Tier Pricing System** for B2B price differentiation, and a **Registration → Verification Flow** that replaces the existing phone-only registration with a structured dealer onboarding process requiring admin approval before access is granted.

The system is a React 19 + Vite (JSX) frontend with a Node.js + Express 5 backend, MongoDB + Mongoose data layer, JWT authentication, TanStack Query for data fetching, and Recharts for data visualisation.

---

## Glossary

- **Analytics Dashboard**: The admin-only `/admin` route (DashboardHome) extended with KPI cards, charts, a top-viewed products table, and an activity feed.
- **AnalyticsController**: The backend controller at `backend/src/modules/ops/analytics.admin.controller.js` that handles `GET /api/v1/admin/analytics/summary`.
- **ActivityLog**: The Mongoose model in `backend/src/modules/ops/models/index.js` that records per-request metadata (userId, action, path, ip, meta).
- **AuditLog**: The Mongoose model in `backend/src/modules/ops/models/index.js` that records deliberate admin actions (adminId, action, targetId, details).
- **Product**: The Mongoose model at `backend/src/modules/catalog/models/Product.js`; contains `meta.views` for view counting.
- **Brand**: A Mongoose model referenced by Product's `brand` field.
- **User**: The Mongoose model at `backend/src/modules/users/user.model.js`; represents admins, dealers, and customers.
- **Dealer**: A User whose `role` is `"dealer"`.
- **Tier**: A named pricing category assigned to a Dealer; one of `standard`, `silver`, `gold`, or `platinum`.
- **TierPricingRule**: A new MongoDB collection storing per-tier discount configuration (tier, discountPercent, label, description).
- **TierPricingService**: A backend service function `getDealerPrice(publicPrice, tier)` that returns the tier-adjusted price.
- **DealerTierBadge**: A UI badge component that displays a dealer's tier on the dealer dashboard.
- **RegistrationPage**: The new public `/register` page for dealer self-registration.
- **RegistrationStatus**: A field on User indicating the dealer's registration state; one of `pending`, `approved`, or `rejected`.
- **AdminRegistrationsModule**: The new admin sub-page at `/admin/registrations` listing dealers with `registrationStatus: "pending"`.
- **PendingBadge**: A numeric badge on the admin sidebar link for Registrations showing the count of pending dealers.
- **DealerQueue**: The existing admin component at `src/pages/admin/DealerQueue.jsx`; updated to work with the new `registrationStatus` field.
- **Skeleton**: A placeholder loading UI shown while data is being fetched.
- **ConfirmDialog**: A modal requiring explicit user confirmation before a destructive action is executed.
- **sendSuccess / sendError**: Existing Express response helpers used across all backend routes.
- **protect / restrictTo**: Existing Express middleware for JWT authentication and role-based access control.
- **passwordHash**: The hashed password stored in the User document; must never appear in any API response.

---

## Requirements

### Requirement 1 — Analytics Dashboard: Backend KPI and Chart Data

**User Story:** As an admin, I want a single summary endpoint that returns KPI counts, chart datasets, a top-products table, and an activity feed, so that the dashboard can be populated from one API call.

#### Acceptance Criteria

1. WHEN `GET /api/v1/admin/analytics/summary` is called by an authenticated user with role `admin` or `editor`, THE AnalyticsController SHALL return an HTTP 200 response containing: `kpi` (object with `totalProducts`, `totalDealers`, `activeDealers`, `totalOrders`), `productsByBrand` (array of `{ brand: string, count: number }` sorted descending by count), `dealerRegistrations` (array of `{ date: string, count: number }` for each of the last 30 calendar days), `topViewedProducts` (array of up to 5 objects with `_id`, `name`, `slug`, `meta.views`), and `recentActivity` (array of up to 10 AuditLog entries sorted by `createdAt` descending, with `adminId` populated as `{ _id, profile.name }`).
2. WHEN the `totalOrders` KPI is requested and no Orders collection exists in the current schema, THE AnalyticsController SHALL return `totalOrders: 0` as a placeholder value.
3. WHEN the `activeDealers` KPI is computed, THE AnalyticsController SHALL count Users where `role` is `"dealer"` AND `registrationStatus` is `"approved"`.
4. WHEN the `totalDealers` KPI is computed, THE AnalyticsController SHALL count all Users where `role` is `"dealer"` and `isDeleted` is `false`.
5. WHEN the `productsByBrand` dataset is built, THE AnalyticsController SHALL aggregate Products grouped by the `brand` field, populate the brand `name`, and exclude products where `isDeleted` is `true`.
6. WHEN the `dealerRegistrations` dataset is built, THE AnalyticsController SHALL count new Users with `role: "dealer"` created on each calendar day within the 30 days prior to the request date, returning one entry per day including days with zero registrations.
7. WHEN the `topViewedProducts` dataset is built, THE AnalyticsController SHALL sort non-deleted Products by `meta.views` descending and return the top 5, selecting only `_id`, `name`, `slug`, and `meta.views`.
8. THE AnalyticsController SHALL execute all database queries for the summary endpoint in parallel using `Promise.all`.
9. IF an error occurs during the summary query, THEN THE AnalyticsController SHALL catch the error and call `sendError(res, 500, err.message)`.
10. THE AnalyticsController SHALL use the existing `protect` and `restrictTo('admin', 'editor')` middleware; no additional middleware is required.

---

### Requirement 2 — Analytics Dashboard: Frontend UI

**User Story:** As an admin, I want a rich dashboard page with KPI cards, charts, a top-products table, and an activity feed, so that I can monitor the business at a glance.

#### Acceptance Criteria

1. WHEN the DashboardHome component mounts, THE DashboardHome SHALL fetch analytics data via `GET /api/v1/admin/analytics/summary` using TanStack Query with `queryKey: ['analytics-summary']`.
2. WHILE the analytics query is in a loading state, THE DashboardHome SHALL render a Skeleton layout that mirrors the structure of the fully-loaded dashboard (KPI row, two chart placeholders, table placeholder, feed placeholder) using CSS-animated placeholders.
3. IF the analytics query returns an error, THEN THE DashboardHome SHALL render an error state message and a retry button that re-executes the query.
4. WHEN analytics data is loaded successfully, THE DashboardHome SHALL render four KPI cards labelled "Total Products", "Total Dealers", "Active Dealers", and "Total Orders", each displaying the corresponding numeric value from `data.kpi`.
5. WHEN analytics data is loaded successfully, THE DashboardHome SHALL render a horizontal bar chart using Recharts `BarChart` with `layout="vertical"` displaying `data.productsByBrand`, with brand names on the Y-axis and product counts on the X-axis.
6. WHEN analytics data is loaded successfully, THE DashboardHome SHALL render a line chart using Recharts `LineChart` displaying `data.dealerRegistrations` over the last 30 days, with date on the X-axis and registration count on the Y-axis.
7. WHEN analytics data is loaded successfully, THE DashboardHome SHALL render a table of up to 5 rows from `data.topViewedProducts`, with columns "Product Name", "Views", and a "View" link to `/catalog/{slug}`.
8. IF `data.topViewedProducts` is an empty array, THEN THE DashboardHome SHALL render an empty state message "No product views recorded yet" in place of the table.
9. WHEN analytics data is loaded successfully, THE DashboardHome SHALL render an activity feed listing up to 10 entries from `data.recentActivity`, each showing the action label, the admin name from `adminId.profile.name`, and a relative timestamp.
10. IF `data.recentActivity` is an empty array, THEN THE DashboardHome SHALL render an empty state message "No recent admin activity" in place of the feed.
11. THE DashboardHome SHALL apply Framer Motion `initial={{ opacity: 0, y: 10 }}` and `animate={{ opacity: 1, y: 0 }}` entrance animation to the dashboard container, consistent with the existing Admin page pattern.
12. THE DashboardHome SHALL use CSS Modules for component-scoped styles, consistent with the existing admin page style files.

---

### Requirement 3 — Dealer Tier Pricing: Data Model

**User Story:** As an admin, I want dealers to be categorised into pricing tiers, so that I can automatically apply differentiated wholesale prices without manually setting per-dealer multipliers.

#### Acceptance Criteria

1. THE User model SHALL include a `tier` field of type `String` with allowed enum values `["standard", "silver", "gold", "platinum"]` and default value `"standard"`.
2. THE TierPricingRule collection SHALL contain documents with the following fields: `tier` (String, required, enum `["standard", "silver", "gold", "platinum"]`, unique), `discountPercent` (Number, required, min 0, max 100), `label` (String, required), and `description` (String, optional).
3. THE system SHALL seed four default TierPricingRule documents on first run if the collection is empty: `{ tier: "standard", discountPercent: 0, label: "Standard", description: "No discount" }`, `{ tier: "silver", discountPercent: 5, label: "Silver", description: "5% off public price" }`, `{ tier: "gold", discountPercent: 10, label: "Gold", description: "10% off public price" }`, and `{ tier: "platinum", discountPercent: 15, label: "Platinum", description: "15% off public price" }`.
4. THE User model SHALL preserve all existing fields (`phone`, `password`, `role`, `isVerified`, `isDeleted`, `discountMultiplier`, `creditLimit`, `paymentTerms`, `verificationDetails`, `profile`, `analytics`) without modification when the `tier` field is added.

---

### Requirement 4 — Dealer Tier Pricing: Service and API

**User Story:** As a dealer, I want product prices to reflect my tier discount automatically, so that I always see accurate wholesale pricing without manual intervention.

#### Acceptance Criteria

1. THE TierPricingService SHALL expose a function `getDealerPrice(publicPrice, tier)` that retrieves the `discountPercent` for the given tier from TierPricingRule, computes the adjusted price as `publicPrice * (1 - discountPercent / 100)`, and returns the result rounded to two decimal places.
2. IF `getDealerPrice` is called with a `tier` value not present in TierPricingRule, THEN THE TierPricingService SHALL apply a discount of 0% and return `publicPrice` unchanged.
3. WHEN `GET /api/v1/catalog/:slug` is called and the request includes a valid dealer JWT in the `Authorization` header, THE Product detail API SHALL include a `tierPrice` object in the response containing `tier` (the dealer's tier string), `discountPercent` (the applicable discount), and `adjustedPrice` (the result of `getDealerPrice` applied to the product's `variants[0].pricing.wholesale` as the public price reference).
4. WHEN `GET /api/v1/catalog/:slug` is called without a dealer JWT or by a non-dealer user, THE Product detail API SHALL omit the `tierPrice` field from the response entirely.
5. THE Product detail API SHALL never return the `password` field on any embedded User object or the requesting user's `passwordHash` in the response.

---

### Requirement 5 — Dealer Tier Pricing: Admin UI

**User Story:** As an admin, I want to assign a tier to any dealer from the dealer edit form, so that tier-based pricing takes effect immediately after saving.

#### Acceptance Criteria

1. WHEN the admin opens the dealer edit view within the AdminRegistrationsModule, THE AdminRegistrationsModule SHALL display a tier dropdown with options "Standard", "Silver", "Gold", and "Platinum" pre-populated with the dealer's current `tier` value.
2. WHEN the admin selects a new tier and submits the form, THE AdminRegistrationsModule SHALL call `PATCH /api/v1/admin/dealers/:id/tier` with body `{ tier: string }`.
3. WHEN `PATCH /api/v1/admin/dealers/:id/tier` is called by an authenticated admin or editor, THE UserAdminController SHALL validate the `tier` field using Zod (enum `["standard", "silver", "gold", "platinum"]`), update the dealer's `tier` field, write an AuditLog entry with action `"UPDATE_DEALER_TIER"`, and respond with `sendSuccess(res, 200, ...)`.
4. IF `PATCH /api/v1/admin/dealers/:id/tier` is called with an invalid tier value, THEN THE UserAdminController SHALL respond with `sendError(res, 400, 'Validation failed', ...)` and the Zod field errors.
5. IF the dealer specified by `:id` does not exist or has `isDeleted: true`, THEN THE UserAdminController SHALL respond with `sendError(res, 404, 'Dealer not found.')`.
6. WHEN the tier update request succeeds, THE AdminRegistrationsModule SHALL invalidate the relevant TanStack Query cache key so the dealer list re-fetches with the updated tier.

---

### Requirement 6 — Dealer Tier Pricing: Dealer Dashboard UI

**User Story:** As a dealer, I want to see my tier badge and tier-adjusted prices on the product catalog and my dashboard, so that I understand my pricing level without contacting the admin.

#### Acceptance Criteria

1. WHEN a logged-in dealer views the product catalog page, THE Catalog page SHALL display the `tierPrice.adjustedPrice` on each product card in place of the standard public price, using the `tierPrice` data returned by the Product list API.
2. WHEN a logged-in dealer views a product detail page, THE Product detail page SHALL display the `tierPrice.adjustedPrice` alongside the dealer's tier label, using the `tierPrice` data returned by `GET /api/v1/catalog/:slug`.
3. WHEN a logged-in dealer views the Profile page, THE Profile page SHALL display a DealerTierBadge showing the dealer's tier label (e.g., "Gold Dealer") using a visually distinct colour per tier level.
4. WHEN the user is not logged in or has a non-dealer role, THE Catalog and Product pages SHALL omit tier-specific pricing UI and display standard public prices.

---

### Requirement 7 — Registration → Verification Flow: Data Model

**User Story:** As a new dealer, I want to self-register with my business details, so that my account is created and queued for admin review without manual admin involvement.

#### Acceptance Criteria

1. THE User model SHALL include a `registrationStatus` field of type `String` with allowed enum values `["pending", "approved", "rejected"]` and default value `"approved"` for users created through existing admin-facing flows, and value `"pending"` for users created through the public RegistrationPage.
2. THE User model SHALL include a `rejectionReason` field of type `String` that is set by the admin when a dealer registration is rejected and is `null` by default.
3. THE User model SHALL preserve the existing `isVerified` field; after the registration flow is implemented, `isVerified` SHALL be set to `true` when `registrationStatus` is set to `"approved"` and `false` otherwise.

---

### Requirement 8 — Registration → Verification Flow: Public Registration API

**User Story:** As a new dealer, I want to submit a registration form via API, so that my account is created in pending state and I can track my application status.

#### Acceptance Criteria

1. THE Auth module SHALL expose a new endpoint `POST /api/v1/auth/dealer/register` that accepts `businessName` (String, required, min 2), `ownerName` (String, required, min 2), `email` (String, required, valid email format), `phone` (String, required, min 11, max 14), `address` (String, required, min 5), and `password` (String, required, min 6).
2. THE Auth module SHALL validate all fields for `POST /api/v1/auth/dealer/register` using a Zod schema before any database operation.
3. IF the `phone` value in a dealer registration request matches an existing non-deleted User record, THEN THE Auth module SHALL respond with `sendError(res, 409, 'Phone number already registered.')`.
4. WHEN a valid dealer registration request is received, THE Auth module SHALL create a new User with `role: "dealer"`, `registrationStatus: "pending"`, `isVerified: false`, `profile.name` set to `ownerName`, `profile.shopName` set to `businessName`, `profile.address` set to `address`, and `verificationDetails.appliedAt` set to the current timestamp.
5. WHEN a dealer registration succeeds, THE Auth module SHALL respond with `sendSuccess(res, 201, 'Registration received. Your account is under review.', { userId: user._id })` and SHALL NOT issue any JWT tokens or set any cookies.
6. THE Auth module SHALL hash the dealer's password with bcryptjs (cost factor 12) before storing it in the User document.
7. THE Auth module SHALL never return the `password` field in the registration response.

---

### Requirement 9 — Registration → Verification Flow: Login Status Enforcement

**User Story:** As a system, I want login to be blocked for pending and rejected dealers, so that unverified dealers cannot access protected dealer features.

#### Acceptance Criteria

1. WHEN a dealer with `registrationStatus: "pending"` submits valid credentials to `POST /api/v1/auth/login`, THE Auth module SHALL respond with `sendError(res, 403, 'Your account is under review. Please wait for admin approval.')` and SHALL NOT issue any tokens.
2. WHEN a dealer with `registrationStatus: "rejected"` submits valid credentials to `POST /api/v1/auth/login`, THE Auth module SHALL respond with `sendError(res, 403, 'Your registration was not approved. Please contact Badol Tyre Ghar for assistance.')` and SHALL NOT issue any tokens.
3. WHEN a User with role other than `"dealer"` (e.g., `"admin"`, `"editor"`, `"customer"`) logs in, THE Auth module SHALL not apply `registrationStatus` checks and SHALL proceed with the existing login flow.
4. WHEN a dealer with `registrationStatus: "approved"` logs in with valid credentials, THE Auth module SHALL proceed with the existing login flow and issue tokens normally.

---

### Requirement 10 — Registration → Verification Flow: Public Registration UI

**User Story:** As a new dealer, I want a dedicated registration page with a business-focused form, so that I can apply for a dealer account without needing to contact the shop directly.

#### Acceptance Criteria

1. THE system SHALL expose a public route `/register` in `src/App.jsx` rendering the RegistrationPage component, accessible to unauthenticated users.
2. THE RegistrationPage SHALL render a form with fields: Business Name, Owner Name, Email, Phone, Address, and Password.
3. THE RegistrationPage SHALL validate all fields client-side using react-hook-form with a Zod resolver before submission; required field errors SHALL be displayed inline beneath each input.
4. WHEN the RegistrationPage form is submitted successfully with valid inputs, THE RegistrationPage SHALL call `POST /api/v1/auth/dealer/register` via the existing axios api instance from `src/services/api.js`.
5. WHILE the registration request is in flight, THE RegistrationPage SHALL disable the submit button and display a loading indicator.
6. WHEN the registration API returns HTTP 201, THE RegistrationPage SHALL replace the form with a success state message: "Your account is under review. We will notify you once approved." and a link back to the Login page.
7. IF the registration API returns an error (e.g., 409 conflict or 400 validation), THEN THE RegistrationPage SHALL display the error message from the API response beneath the form without navigating away.
8. THE RegistrationPage SHALL include a link to the existing `/login` page for users who already have an account.
9. THE RegistrationPage SHALL apply Framer Motion entrance animation consistent with other public-facing pages in the project.

---

### Requirement 11 — Registration → Verification Flow: Admin Registrations Module

**User Story:** As an admin, I want a dedicated registrations management page with approve and reject actions, so that I can efficiently process dealer applications.

#### Acceptance Criteria

1. THE Admin page (`src/pages/Admin.jsx`) SHALL include a new sidebar link "Registrations" pointing to `/admin/registrations` and a new Route rendering the AdminRegistrationsModule component.
2. THE ADMIN_LINKS array in `src/pages/Admin.jsx` SHALL include the Registrations entry with a PendingBadge displaying the count of users with `registrationStatus: "pending"`, fetched from `GET /api/v1/admin/dealers/registrations?status=pending&limit=1` (count derived from response metadata).
3. THE AdminRegistrationsModule SHALL fetch dealers from `GET /api/v1/admin/dealers/registrations` with default query parameters `status=pending&page=1&limit=20` using TanStack Query.
4. WHEN `GET /api/v1/admin/dealers/registrations` is called by an authenticated admin or editor, THE UserAdminController SHALL return a paginated list of Users with `role: "dealer"` filtered by the `status` query parameter, selecting fields `_id`, `profile`, `phone`, `registrationStatus`, `rejectionReason`, `tier`, `verificationDetails.appliedAt`, `createdAt`; the response SHALL never include `password`.
5. WHILE the registrations query is loading, THE AdminRegistrationsModule SHALL render a Skeleton table with placeholder rows.
6. IF the registrations query returns an error, THEN THE AdminRegistrationsModule SHALL render an error state with a retry option.
7. IF the registrations list is empty, THEN THE AdminRegistrationsModule SHALL render an empty state "No pending registrations."
8. WHEN an admin clicks "Approve" for a dealer, THE AdminRegistrationsModule SHALL call `PATCH /api/v1/admin/dealers/:id/approve`; on success, THE UserAdminController SHALL set the dealer's `registrationStatus` to `"approved"`, `isVerified` to `true`, and write an AuditLog entry with action `"APPROVE_DEALER"`.
9. WHEN an admin clicks "Reject" for a dealer, THE AdminRegistrationsModule SHALL display a ConfirmDialog that includes an optional rejection reason text input before making any API call.
10. WHEN the admin confirms rejection in the ConfirmDialog, THE AdminRegistrationsModule SHALL call `PATCH /api/v1/admin/dealers/:id/reject` with body `{ rejectionReason: string | "" }`; on success, THE UserAdminController SHALL set the dealer's `registrationStatus` to `"rejected"`, `isVerified` to `false`, `rejectionReason` to the provided value, and write an AuditLog entry with action `"REJECT_DEALER"`.
11. IF `PATCH /api/v1/admin/dealers/:id/approve` or `PATCH /api/v1/admin/dealers/:id/reject` receives an invalid dealer id or a dealer with `isDeleted: true`, THEN THE UserAdminController SHALL respond with `sendError(res, 404, 'Dealer not found.')`.
12. WHEN an approve or reject action completes successfully, THE AdminRegistrationsModule SHALL invalidate the `['dealer-registrations']` TanStack Query cache key to refresh the list.
13. THE `PATCH /api/v1/admin/dealers/:id/approve` and `PATCH /api/v1/admin/dealers/:id/reject` endpoints SHALL be protected by `protect` and `restrictTo('admin', 'editor')` middleware.
14. THE AdminRegistrationsModule SHALL display pagination controls when the total dealer count exceeds 20, using the page metadata from the API response.

---

### Requirement 12 — DealerQueue Migration

**User Story:** As an admin, I want the existing DealerQueue component to continue working after the User model is updated, so that there is no regression in dealer management functionality.

#### Acceptance Criteria

1. WHEN the DealerQueue component fetches dealers from `GET /api/v1/admin/dealers/pending`, THE UserAdminController SHALL return only Users where `registrationStatus: "pending"` (replacing the previous `isVerified: false` filter logic), maintaining backward compatibility with the DealerQueue query key `['pending-dealers']`.
2. THE DealerQueue component SHALL be updated so that the approve action calls `PATCH /api/v1/admin/dealers/:id/approve` and the reject action calls `PATCH /api/v1/admin/dealers/:id/reject` rather than the legacy `PATCH /api/v1/admin/dealers/:id/verify`.
3. WHEN the DealerQueue renders a dealer card, THE DealerQueue SHALL display the dealer's `registrationStatus` in place of or alongside the existing `role` tag.

---

### Requirement 13 — Global Quality Standards

**User Story:** As a developer, I want all new code to comply with the project's established quality standards, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE system SHALL apply Zod validation to every new API endpoint's request body or query parameters before any database operation is performed.
2. THE system SHALL wrap every async route handler in a `try/catch` block that calls `sendError(res, 500, err.message)` in the catch clause.
3. THE system SHALL apply `protect` middleware and at least one `restrictTo` or status check on every new protected route.
4. THE system SHALL render loading, error, and empty states for every new list view and form component in the frontend.
5. THE system SHALL display a ConfirmDialog before executing any destructive action (reject, delete) in the admin UI.
6. THE system SHALL paginate all new list endpoints with a default `limit` of 20 and accept `page` and `limit` as query parameters.
7. THE system SHALL never include the `password` field in any API response payload, regardless of the operation or requesting role.
8. WHERE Recharts is used for charts, THE DashboardHome SHALL import only the required Recharts components to avoid unnecessary bundle size increases.
