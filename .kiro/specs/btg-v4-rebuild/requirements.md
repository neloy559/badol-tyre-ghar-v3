# Requirements Document

## Introduction

BTG v4 (Badol Tyre Ghar version 4) is a complete ground-up rebuild of the existing B2B product catalog and ERP/CRM web platform for a real tyre wholesale business in Bangladesh. The current v3 codebase has accumulated technical debt including mixed frontend/backend dependencies, inconsistent architectural patterns, prohibited libraries (Zod, TanStack Query, Framer Motion, react-hook-form), and structural issues that make further iteration difficult.

This rebuild creates a clean, production-grade full-stack application using a locked-in tech stack (React 19 + Vite frontend, Node.js + Express backend, MongoDB + Mongoose, Vercel deployment) while preserving all existing business functionality and adding new capabilities including a dedicated Media Manager, improved notification system, and cleaner dealer onboarding flow.

The platform serves three primary user groups: admin/editor staff who manage the catalog and CRM, approved dealers who browse the catalog and download B2B price lists, and public customers who browse products and submit inquiries.

---

## Glossary

- **BTG**: Badol Tyre Ghar — the business and the platform.
- **System**: The BTG v4 full-stack web application (frontend + backend combined).
- **Frontend**: The React 19 + Vite single-page application served from Vercel CDN.
- **Backend**: The Node.js + Express serverless API deployed as Vercel Functions.
- **API**: The Express REST API layer exposed by the Backend.
- **Auth_Service**: The backend module responsible for registration, login, token issuance, and token refresh (`backend/src/modules/auth/`).
- **Catalog_Service**: The backend module responsible for product, category, and brand CRUD operations (`backend/src/modules/catalog/`).
- **User_Service**: The backend module responsible for user management, dealer registration, and tier assignment (`backend/src/modules/users/`).
- **Pricing_Service**: The backend utility that calculates role-based prices (retail vs. wholesale) combined with dealer tier discounts and active campaign discounts (`backend/src/utils/pricingService.js`).
- **Tier_Pricing_Service**: The backend utility that reads `TierPricingRule` documents with a 60-second in-memory cache and returns the discount multiplier for a given dealer tier (`backend/src/utils/tierPricingService.js`).
- **Media_Service**: The backend module responsible for uploading, listing, and deleting media assets via Cloudinary (`backend/src/modules/media/`).
- **Notification_Service**: The backend module responsible for creating, listing, and marking notification documents (`backend/src/modules/notifications/`).
- **Admin**: A User with `role: "admin"` — full access to all modules.
- **Editor**: A User with `role: "editor"` — access to catalog management only, no user or CRM management.
- **Dealer (Approved)**: A User with `role: "dealer"` and `registrationStatus: "approved"` — can see tier-adjusted prices and download PDF catalogs.
- **Dealer (Pending)**: A User with `role: "dealer"` and `registrationStatus: "pending"` — logged in but limited to catalog browsing; cannot see prices or download PDFs.
- **Customer**: A User with `role: "customer"` — browse catalog, submit inquiries, no price access.
- **Public User**: An unauthenticated visitor — can browse catalog but cannot see any prices or submit inquiries.
- **Access_Token**: A short-lived JWT (15 minutes) stored in memory on the client, containing `userId`, `role`, and `registrationStatus`.
- **Refresh_Token**: A long-lived token (30 days) stored in an HTTP-only cookie, used to issue new Access_Tokens without re-login.
- **Tier**: A dealer classification level — one of `standard`, `silver`, `gold`, `platinum`.
- **discountMap**: The single source of truth for tier discount percentages, defined once in Tier_Pricing_Service and imported wherever needed.
- **Inquiry**: A request from a Customer or Dealer for product pricing or availability, stored in the `inquiries` collection.
- **Campaign**: A time-bound discount rule applied to specific products, categories, or brands, stored in the `campaigns` collection.
- **MediaAsset**: A record of an uploaded file stored in Cloudinary, tracked in the `mediaAssets` collection.
- **AuditLog**: An immutable record of admin actions (create, update, delete, approve, reject) stored in the `auditLogs` collection.
- **Notification**: An in-app alert delivered to admin users, stored in the `notifications` collection.
- **SiteConfig**: A single document storing branding, contact info, and social links, stored in the `siteConfigs` collection.
- **PBT**: Property-based test — a test that generates arbitrary inputs to verify invariants hold across many cases.
- **CSS_Module**: A `.module.css` file scoped to a single component — the only permitted styling mechanism outside of `variables.css` and `global.css`.
- **sendResponse**: The backend utility at `backend/src/utils/sendResponse.js` that produces the standard `{ success, message, data }` response shape.

---

## Requirements

### Requirement 1: Project Scaffold and Configuration

**User Story:** As a developer, I want a clean, correctly structured monorepo scaffold, so that all future development has a consistent foundation with no mixed dependencies or structural ambiguity.

#### Acceptance Criteria

1. THE System SHALL have a root directory named `btg-v4` containing exactly two application packages: `frontend/` and `backend/`, plus `api/`, `docs/`, `.github/`, `.gitignore`, `README.md`, and `vercel.json`.
2. THE Frontend SHALL have its own `package.json` containing only the approved library list: `react`, `react-dom`, `react-router-dom`, `lucide-react`, `@react-pdf/renderer`, `recharts` as runtime dependencies, and `vite`, `@vitejs/plugin-react`, `eslint`, `prettier`, `vitest`, `@testing-library/react` as dev dependencies.
3. THE Backend SHALL have its own `package.json` containing only the approved library list: `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `cors`, `multer`, `cloudinary` as runtime dependencies, and `nodemon`, `jest`, `supertest`, `fast-check` as dev dependencies.
4. THE Frontend `package.json` SHALL NOT include `zod`, `axios`, `dotenv`, `framer-motion`, `react-hook-form`, `@tanstack/react-query`, `react-helmet-async`, `express-rate-limit`, or `streamifier`.
5. THE Backend `package.json` SHALL NOT include `zod`, `morgan`, `express-rate-limit`, `streamifier`, or `xlsx`.
6. THE Frontend SHALL use `vite.config.js` configured with `@vitejs/plugin-react` and a proxy to the backend dev server.
7. THE Backend SHALL use Node 20+ with the `--env-file` flag to load environment variables, with no `dotenv` package.
8. THE System SHALL include `.env.example` files for both Frontend and Backend listing all required environment variable names without values.
9. THE System SHALL include `vercel.json` at the root configured to route `/api/*` to the serverless entry at `api/index.js` and all other routes to the Frontend build output.
10. THE System SHALL include a `docs/` directory containing `ARCHITECTURE.md`, `SOP.md`, `API.md`, `CONTRIBUTING.md`, and `CHANGELOG.md`.
11. THE System SHALL include `.github/COMMIT_CONVENTION.md` and `.github/pull_request_template.md`.

---

### Requirement 2: Authentication — Registration

**User Story:** As a visitor, I want to register as a customer or apply as a dealer in a single flow, so that I can access the platform features appropriate to my role immediately after registration.

#### Acceptance Criteria

1. WHEN a visitor submits a customer registration form with `name`, `phone`, and `password`, THE Auth_Service SHALL create a User document with `role: "customer"`, `registrationStatus: "approved"`, and `isVerified: true`, then issue an Access_Token and Refresh_Token and return `201`.
2. WHEN a visitor submits a dealer application form with `businessName`, `ownerName`, `phone`, `address`, and `password`, THE Auth_Service SHALL create a User document with `role: "dealer"`, `registrationStatus: "pending"`, and `isVerified: false`, then issue an Access_Token and Refresh_Token and return `201`.
3. WHEN a dealer registration is successfully created, THE Notification_Service SHALL create a Notification of type `dealer_application` for all Admin users.
4. IF a registration request contains a `phone` number that already exists in the `users` collection, THEN THE Auth_Service SHALL return `409` with message `"Phone number already registered."`.
5. IF a registration request is missing any required field or any field fails validation, THEN THE Auth_Service SHALL return `400` with a message identifying the failing fields, without performing any database write.
6. THE Auth_Service SHALL hash the submitted password using `bcryptjs` with `saltRounds: 12` and a `PASSWORD_PEPPER` string (from environment) prepended to the password before hashing.
7. THE Auth_Service SHALL never return the `password` field in any registration response.
8. THE Register page SHALL display two distinct registration paths: a standard "Create Account" form and a "Apply as Dealer" section with a bold call-to-action, rendered in the same page component.
9. THE Register page SHALL render a password strength indicator showing one of `"weak"`, `"medium"`, or `"strong"` based on the `usePasswordStrength` hook evaluating the current password field value in real time.
10. THE Register page SHALL render a confirm-password field with real-time match validation — a green indicator WHEN the values match and a red indicator WHEN they do not match.
11. THE Register page SHALL render a password visibility toggle (show/hide eye icon using `lucide-react`) on all password fields.
12. WHEN a dealer's application is in `registrationStatus: "pending"` state, THE Frontend SHALL display a prominent "Your application is under review" message on the dealer's Profile page and restrict access to dealer-only features.

---

### Requirement 3: Authentication — Login and Token Management

**User Story:** As a registered user, I want to log in and stay logged in securely, so that I can access the platform without re-entering credentials on every visit.

#### Acceptance Criteria

1. WHEN a user submits valid credentials to `POST /api/v1/auth/login`, THE Auth_Service SHALL verify the password by prepending `PASSWORD_PEPPER` then comparing with `bcryptjs.compare`, then issue a new Access_Token (15-minute JWT) in the response body and a new Refresh_Token (30-day JWT) as an HTTP-only, Secure, SameSite=Strict cookie.
2. IF the submitted credentials do not match any user document, THEN THE Auth_Service SHALL return `401` with message `"Invalid credentials."` without revealing whether the phone or password was incorrect.
3. IF a user with `role: "dealer"` and `registrationStatus: "pending"` submits valid credentials, THEN THE Auth_Service SHALL return `403` with message `"Your account is under review."`.
4. IF a user with `role: "dealer"` and `registrationStatus: "rejected"` submits valid credentials, THEN THE Auth_Service SHALL return `403` with message `"Your registration was not approved."`.
5. WHEN a client submits a valid Refresh_Token cookie to `POST /api/v1/auth/refresh`, THE Auth_Service SHALL issue a new Access_Token and a new Refresh_Token, invalidate the old Refresh_Token document in the `refreshTokens` collection, and return `200`.
6. WHEN a Refresh_Token is used, THE Auth_Service SHALL store a hash of the new Refresh_Token (not the raw token) in the `refreshTokens` collection alongside `userId`, `expiresAt`, `isRevoked: false`, and `deviceInfo`.
7. IF a Refresh_Token that has already been used (rotated) is submitted again, THEN THE Auth_Service SHALL revoke all Refresh_Tokens for that user and return `401`, treating the event as a potential token theft.
8. WHEN a user calls `POST /api/v1/auth/logout`, THE Auth_Service SHALL mark the current Refresh_Token document as `isRevoked: true` and clear the HTTP-only cookie, returning `200`.
9. THE Auth_Service SHALL expose `GET /api/v1/auth/me` (protected) that returns the current user's `_id`, `role`, `registrationStatus`, `tier`, `profile`, and `phone` — never the `password` field.
10. THE Frontend `api.js` service SHALL automatically retry any `401` response from any API call by calling the refresh endpoint once before re-attempting the original request — if the refresh also fails, the user SHALL be logged out.

---

### Requirement 4: Role-Based Access Control

**User Story:** As a system operator, I want every API endpoint and UI route to enforce role-based access, so that users can only access features permitted for their role.

#### Acceptance Criteria

1. THE Backend SHALL include an `auth` middleware at `backend/src/middleware/auth.js` that verifies the Access_Token JWT and attaches the decoded user object to `req.user`; IF the token is missing or invalid, THE middleware SHALL return `401`.
2. THE Backend SHALL include a `restrictTo(...roles)` function in the `auth` middleware that checks `req.user.role` against the allowed roles; IF the role is not permitted, THE middleware SHALL return `403`.
3. THE Backend SHALL include an `optionalAuth` middleware at `backend/src/middleware/optionalAuth.js` that attaches `req.user` when a valid Access_Token is present and sets `req.user` to `null` when no token is present, without returning an error.
4. WHILE a user is not authenticated, THE Frontend SHALL redirect any attempt to access `/profile`, `/admin/*`, or `/cart` to `/login`.
5. WHILE a user has `role: "customer"` or `role: "dealer"` with `registrationStatus: "pending"`, THE Frontend SHALL redirect any attempt to access `/admin/*` to `/`.
6. THE Admin panel route `/admin/catalog`, `/admin/products`, `/admin/brands`, `/admin/tags`, `/admin/search-intel`, `/admin/pdf`, `/admin/media` SHALL be accessible to users with `role: "admin"` or `role: "editor"`.
7. THE Admin panel routes `/admin/dealers`, `/admin/registrations`, `/admin/inquiries`, `/admin/campaigns`, `/admin/markup`, `/admin/export`, `/admin/branding`, `/admin/notifications` SHALL be accessible only to users with `role: "admin"`.

---

### Requirement 5: Product Catalog — Data Model and API

**User Story:** As an admin, I want to manage a complete product catalog with variants, pricing, and visibility controls, so that the correct products and prices are shown to each user role.

#### Acceptance Criteria

1. THE Catalog_Service SHALL maintain a `products` collection with fields: `name`, `slug` (unique), `sku` (unique), `category` (ref: Category), `brand` (ref: Brand), `images[]` (Cloudinary URLs), `specs` (object: size, pattern, rim, origin), `variants[]` (array of `{ sku, ply, retailPrice, wholesalePrice, stock }`), `isVisible` (Boolean, default true), `showPrice` (Boolean, default false), `searchTags[]`, `viewCount` (Number, default 0), `isDeleted` (Boolean, default false).
2. THE Catalog_Service SHALL maintain a `categories` collection with fields: `name`, `slug` (unique), `parentCategory` (ref: Category, nullable), `isActive`, `displayOrder`.
3. THE Catalog_Service SHALL maintain a `brands` collection with fields: `name`, `slug` (unique), `logo` (Cloudinary URL), `description`, `isActive`.
4. WHEN a request is made to `GET /api/v1/catalog`, THE Catalog_Service SHALL return only products where `isVisible: true` and `isDeleted: false`, paginated with default `limit: 20`, supporting query parameters `category`, `brand`, `search`, `page`, and `limit`.
5. WHEN a request to `GET /api/v1/catalog` is made by an authenticated Dealer (Approved), THE Pricing_Service SHALL compute and include a `tierPrice` field for each product variant based on the dealer's `tier` and any active Campaign discount.
6. WHEN a request to `GET /api/v1/catalog` is made by a Public User, Customer, or Dealer (Pending), THE Catalog_Service SHALL omit `retailPrice`, `wholesalePrice`, and `tierPrice` from all variants in the response.
7. WHEN a request is made to `GET /api/v1/catalog/:slug`, THE Catalog_Service SHALL increment the product's `viewCount` by 1 and return the full product document, applying the same pricing visibility rules as criterion 6.
8. IF a request is made to `GET /api/v1/catalog/:slug` for a product where `isVisible: false` or `isDeleted: true`, THEN THE Catalog_Service SHALL return `404`.
9. THE Catalog_Service SHALL expose admin endpoints under `/api/v1/admin/catalog` for full CRUD on products, protected by `protect` and `restrictTo('admin', 'editor')`.
10. WHEN a product is created or updated via the admin API, THE Catalog_Service SHALL auto-generate the `slug` from the product `name` if `slug` is not provided, replacing spaces with hyphens and converting to lowercase.
11. THE Catalog_Service SHALL support bulk product creation via `POST /api/v1/admin/catalog/bulk` accepting a JSON array of product objects, returning a summary of `{ created, failed, errors[] }`.

---

### Requirement 6: Pricing System

**User Story:** As a dealer, I want to see my tier-adjusted price for every product, so that I know exactly what I pay without having to call the shop.

#### Acceptance Criteria

1. THE Pricing_Service SHALL compute prices server-side only — the Frontend SHALL never calculate prices independently.
2. THE Pricing_Service SHALL apply the following logic in order: (a) start with `wholesalePrice` for dealers or `retailPrice` for customers/public, (b) apply dealer `discountMultiplier` if set on the User document, (c) apply the tier discount from Tier_Pricing_Service, (d) apply any active Campaign discount for the product, category, or brand.
3. THE Tier_Pricing_Service SHALL define `discountMap` once as: `{ standard: 0, silver: 5, gold: 10, platinum: 15 }` and this map SHALL be the single import used by all other modules that need tier discount values.
4. THE Tier_Pricing_Service SHALL cache the `TierPricingRule` documents in memory with a 60-second TTL, falling back to the `discountMap` defaults if the database is unreachable.
5. IF a dealer's `tier` value is not one of the four defined tiers, THE Tier_Pricing_Service SHALL apply a `0%` discount and log a warning.
6. THE Pricing_Service SHALL round all computed prices to 2 decimal places using `Math.round(price * 100) / 100`.

---

### Requirement 7: Search and Filtering

**User Story:** As a visitor, I want to search and filter the product catalog by keyword, brand, and category, so that I can quickly find the tyre I need.

#### Acceptance Criteria

1. WHEN a search query is submitted to `GET /api/v1/catalog?search={term}`, THE Catalog_Service SHALL match products by `name`, `sku`, `specs.size`, `specs.pattern`, and `searchTags[]` using a case-insensitive regex search.
2. WHEN a search term produces results, THE Catalog_Service SHALL upsert a `SearchLog` document for that term — incrementing `count` by 1, updating `lastSearchedAt`, and recording `resultCount`.
3. WHEN a search term produces zero results, THE Catalog_Service SHALL still log the term in `SearchLog` with `resultCount: 0`.
4. THE Admin panel Search Intelligence module SHALL expose `GET /api/v1/admin/search-logs` returning search terms sorted by `count` descending, paginated.
5. WHEN an admin assigns a search term to a product via the Search Intelligence module, THE Catalog_Service SHALL add the term to that product's `searchTags[]` array if it is not already present.
6. THE Catalog page FilterSidebar SHALL support filtering by `category` and `brand` simultaneously, updating the URL query string on each selection and reading from the URL query string on mount.

---

### Requirement 8: Dealer Registration and Onboarding

**User Story:** As a tyre dealer, I want to apply for a dealer account, get immediately logged in, and wait for admin approval, so that I can start browsing the catalog while my account is reviewed.

#### Acceptance Criteria

1. WHEN a dealer submits the dealer registration form, THE Auth_Service SHALL create the User document, issue tokens, and log the user in — the dealer SHALL NOT be blocked from logging in while their status is `"pending"`.
2. WHEN a dealer with `registrationStatus: "pending"` accesses the catalog, THE Frontend SHALL display the catalog in full but hide all pricing and disable the PDF download button, showing a "Prices visible after account approval" message.
3. THE Admin panel Registrations module SHALL display all dealer registrations grouped by `registrationStatus`: `pending`, `approved`, and `rejected`.
4. WHEN an admin approves a dealer registration via `PATCH /api/v1/admin/dealers/:id/approve`, THE User_Service SHALL set `registrationStatus: "approved"`, `isVerified: true`, and assign a default `tier: "standard"`.
5. WHEN an admin rejects a dealer registration via `PATCH /api/v1/admin/dealers/:id/reject`, THE User_Service SHALL set `registrationStatus: "rejected"` and store the `rejectionReason` string on the User document.
6. WHEN an admin assigns or changes a dealer's tier via `PATCH /api/v1/admin/dealers/:id/tier`, THE User_Service SHALL update the `tier` field to the provided value and write an AuditLog entry.
7. WHEN a dealer registration is approved or rejected, THE Notification_Service SHALL create a Notification of type `dealer_application` for all Admin users recording the outcome.
8. THE Admin panel Registrations module SHALL display a count badge on the "Pending" tab showing the current number of pending registrations, fetched separately from the list data.

---

### Requirement 9: Inquiry CRM

**User Story:** As a customer or dealer, I want to submit a product inquiry, and as an admin I want to track each inquiry through a status pipeline, so that no sales lead is lost.

#### Acceptance Criteria

1. WHEN an authenticated user (customer or dealer) submits an inquiry via `POST /api/v1/inquiries`, THE Catalog_Service SHALL create an Inquiry document with `user` reference, `items[]` (productId + variantSku + quantity), `status: "inquired"`, and auto-generated `whatsappMessage`.
2. THE `whatsappMessage` field SHALL be a pre-formatted string suitable for sending via WhatsApp, constructed from the inquiry items' names, SKUs, and quantities.
3. IF an unauthenticated visitor submits an inquiry, THE Catalog_Service SHALL create an Inquiry document with `user: null` and all other fields as in criterion 1.
4. THE Admin panel Inquiry CRM module SHALL display all inquiries sorted by `createdAt` descending, paginated, filterable by `status`.
5. THE Inquiry `status` field SHALL accept transitions: `"inquired"` → `"replied"` → `"converted"`.
6. WHEN an admin updates an inquiry's status via `PATCH /api/v1/admin/inquiries/:id/status`, THE Catalog_Service SHALL update the `status` field and write an AuditLog entry.
7. WHEN an admin adds a note to an inquiry via `PATCH /api/v1/admin/inquiries/:id/note`, THE Catalog_Service SHALL update the `adminNote` field on the Inquiry document.
8. THE Inquiry CRM module SHALL display a "Copy WhatsApp Message" button on each inquiry card that copies the `whatsappMessage` to the clipboard.

---

### Requirement 10: Campaign and Discount Management

**User Story:** As an admin, I want to create time-bound discount campaigns applied to products, categories, or brands, so that I can run promotions without modifying individual product prices.

#### Acceptance Criteria

1. THE Catalog_Service SHALL maintain a `campaigns` collection with fields: `name`, `type` (enum: `"percent"`, `"flat"`), `value` (Number), `appliesTo` (object: `products[]`, `categories[]`, `brands[]`), `startDate`, `endDate`, `isActive`.
2. WHEN the Pricing_Service computes a price and one or more active campaigns apply to the product (by direct product ID, category, or brand), THE Pricing_Service SHALL apply the campaign with the highest discount value.
3. IF multiple campaigns are active for the same product, THE Pricing_Service SHALL apply only the single campaign that results in the lowest final price.
4. WHEN a campaign's `endDate` is in the past, THE Catalog_Service SHALL treat the campaign as inactive regardless of its `isActive` flag.
5. THE Admin panel Campaign Manager module SHALL support creating, editing, toggling `isActive`, and deleting campaigns via standard CRUD API endpoints under `/api/v1/admin/campaigns`.
6. WHEN a campaign is deleted, THE Catalog_Service SHALL perform a soft delete by setting `isActive: false` and `isDeleted: true`, not a hard delete.

---

### Requirement 11: Media Management

**User Story:** As an admin, I want to upload and manage all media assets (product images, logos, banners) from a dedicated admin module, so that I have one controlled place for all visual content.

#### Acceptance Criteria

1. THE Media_Service SHALL expose `POST /api/v1/admin/media/upload` accepting `multipart/form-data` with a file field, uploading the file to Cloudinary using `multer` for parsing, and saving a `MediaAsset` document with `filename`, `cloudinaryUrl`, `cloudinaryPublicId`, `type`, `uploadedBy`, `size`, and `format`.
2. THE Media_Service SHALL expose `GET /api/v1/admin/media` returning all MediaAsset documents, paginated and filterable by `type`.
3. THE Media_Service SHALL expose `DELETE /api/v1/admin/media/:id` that deletes the file from Cloudinary by `cloudinaryPublicId` and then deletes the `MediaAsset` document from the database.
4. IF the Cloudinary deletion fails, THEN THE Media_Service SHALL return `500` and SHALL NOT delete the `MediaAsset` document from the database.
5. THE Admin panel Media Manager module SHALL display uploaded media assets in a grid view with filename, format, size, and upload date.
6. WHEN an admin uploads an image intended for a product, THE Admin panel SHALL allow the admin to copy the Cloudinary URL for use in the product form.
7. THE Media_Service SHALL accept file types `image/jpeg`, `image/png`, and `image/webp` only; IF any other MIME type is submitted, THE Media_Service SHALL return `400` with message `"Unsupported file type."`.
8. THE Media_Service SHALL enforce a maximum individual file size of 5MB; IF the file exceeds this limit, THE Media_Service SHALL return `413`.

---

### Requirement 12: Site Branding and Configuration

**User Story:** As an admin, I want to update the site's logo, name, slogan, contact info, and social links from the admin panel, so that branding changes take effect without a code deployment.

#### Acceptance Criteria

1. THE Backend SHALL maintain a single `SiteConfig` document in the `siteConfigs` collection with sub-documents: `branding` (logo URL, siteName, slogan), `contact` (whatsapp, phone, email), and `social` (links object).
2. THE Backend SHALL expose `GET /api/v1/site-config` as a public, unauthenticated endpoint returning the current `SiteConfig` document.
3. THE Backend SHALL expose `PATCH /api/v1/admin/site-config` protected by `protect` and `restrictTo('admin')` for updating any field in the `SiteConfig` document.
4. WHEN the Frontend mounts, THE Frontend SHALL fetch `GET /api/v1/site-config` and use the returned `branding.siteName` for `document.title` and the `branding.logo` URL for the site logo.
5. IF the `GET /api/v1/site-config` request fails, THE Frontend SHALL fall back to hardcoded default values defined in `src/utils/constants.js`.

---

### Requirement 13: Notification System

**User Story:** As an admin, I want to receive real-time in-app notifications for dealer applications, new inquiries, and low-stock alerts, so that I can take action without manually checking every module.

#### Acceptance Criteria

1. THE Notification_Service SHALL maintain a `notifications` collection with fields: `recipientId` (ref: User), `type` (enum: `"dealer_application"`, `"new_inquiry"`, `"low_stock"`, `"system"`), `title`, `message`, `link`, `isRead` (Boolean, default false), `createdAt`.
2. THE Notification_Service SHALL expose `GET /api/v1/admin/notifications/unread-count` returning `{ count: Number }` for the requesting admin user.
3. THE Notification_Service SHALL expose `GET /api/v1/admin/notifications` returning the 50 most recent notifications for the requesting admin user, ordered by `createdAt` descending.
4. THE Notification_Service SHALL expose `PATCH /api/v1/admin/notifications/:id/read` that sets `isRead: true` on the specified notification.
5. THE Notification_Service SHALL expose `PATCH /api/v1/admin/notifications/read-all` that sets `isRead: true` on all unread notifications for the requesting admin user.
6. THE Admin panel `NotificationBell` component SHALL poll `GET /api/v1/admin/notifications/unread-count` every 30 seconds using a `setInterval` inside a `useEffect` hook, clearing the interval on component unmount.
7. WHEN the unread count increases between polls, THE Frontend SHALL call the `playSound` utility from `src/utils/sounds.js` to play a notification sound.
8. THE `NotificationBell` component SHALL display a badge showing the unread count; WHEN the count is zero, the badge SHALL be hidden.
9. WHEN an admin clicks the `NotificationBell`, THE Frontend SHALL display a dropdown list of the 10 most recent notifications, each showing `title`, `message`, relative timestamp, and read/unread state.
10. WHEN an admin clicks a notification in the dropdown, THE Frontend SHALL mark it as read via `PATCH /api/v1/admin/notifications/:id/read` and navigate to the `link` URL if one is present.

---

### Requirement 14: PDF Catalog Generation

**User Story:** As an approved dealer, I want to download a PDF product catalog with my tier-adjusted prices, so that I can share pricing with my own customers during field visits.

#### Acceptance Criteria

1. THE Frontend SHALL expose PDF generation via the `usePdfDownload` custom hook at `src/hooks/usePdfDownload.js` — this hook SHALL be the single implementation used by both the Home page and the Catalog page.
2. WHEN an approved dealer triggers the PDF download, THE `usePdfDownload` hook SHALL first check a device-local cache (localStorage with a timestamp key); IF a cached PDF exists and is less than 24 hours old, THE hook SHALL serve the cached version.
3. IF no valid cache exists, THE `usePdfDownload` hook SHALL request the current catalog data from the API and generate the PDF using `@react-pdf/renderer`.
4. THE PDF document component at `src/components/pdf/CatalogDocument.jsx` SHALL display product name, SKU, size, pattern, ply variants, and the dealer's tier-adjusted price for each variant.
5. IF the user is not an approved Dealer, THE Frontend SHALL render the PDF download button as disabled with a tooltip reading `"Available for approved dealers only"`.
6. WHEN a PDF is generated, THE Backend SHALL expose an optional `POST /api/v1/admin/pdf/upload` endpoint that allows admins to upload a generated PDF to Cloudinary and store the URL for sharing.

---

### Requirement 15: Admin Dashboard Analytics

**User Story:** As an admin, I want a dashboard showing key business metrics, so that I can understand business performance at a glance.

#### Acceptance Criteria

1. THE Backend SHALL expose `GET /api/v1/admin/analytics/summary` protected by `protect` and `restrictTo('admin', 'editor')`, running all aggregate queries in parallel via `Promise.all`.
2. THE analytics summary response SHALL include: `totalProducts` (non-deleted), `totalDealers` (all dealers), `activeDealers` (approved dealers), `pendingRegistrations` count, `productsByBrand` (grouped by brand, sorted by count descending), `dealerRegistrations` (last 30 days with gap-fill to 30 data points), `topViewedProducts` (top 5 by `viewCount`), and `recentActivity` (last 10 AuditLog entries).
3. THE Admin Dashboard page SHALL render loading skeleton cards WHILE the analytics query is in flight.
4. IF the analytics query fails, THE Admin Dashboard SHALL render an error state with a retry button without crashing the page.
5. THE Admin Dashboard SHALL render at least 4 KPI metric cards, a bar chart of products by brand using `recharts`, and a line chart of dealer registrations over the last 30 days using `recharts`.
6. THE Frontend SHALL import only required named exports from `recharts` (e.g. `BarChart`, `Bar`, `XAxis`) rather than the full library to support tree-shaking.

---

### Requirement 16: Admin Catalog Management

**User Story:** As an admin or editor, I want to create, edit, and delete products with full control over visibility and price display, so that the public catalog is always accurate.

#### Acceptance Criteria

1. THE Admin Catalog Manager module SHALL provide forms for creating and editing products including all fields: name, SKU, category, brand, images, specs, and variants.
2. WHEN an admin toggles a product's `isVisible` flag via `PATCH /api/v1/admin/products/:id/visibility`, THE Catalog_Service SHALL update the flag and return the updated product.
3. WHEN an admin toggles a product's `showPrice` flag via `PATCH /api/v1/admin/products/:id/show-price`, THE Catalog_Service SHALL update the flag and return the updated product.
4. THE Admin Products Manager module SHALL display all products grouped by category with individual `isVisible` and `showPrice` toggle switches per product.
5. THE Admin Bulk Markup module SHALL expose `PATCH /api/v1/admin/products/bulk-markup` accepting `{ categoryId, brandId, adjustmentType, adjustmentValue }` and updating `retailPrice` and `wholesalePrice` for all matching products in a single bulk operation.
6. WHEN a bulk markup operation is performed, THE Catalog_Service SHALL write a single AuditLog entry recording the criteria and the number of products affected.
7. THE Admin Data Export module SHALL expose `GET /api/v1/admin/export/csv` that streams a CSV response containing all non-deleted products with their variants, compatible with re-import.
8. THE Admin Catalog Manager SHALL support bulk import via `POST /api/v1/admin/catalog/bulk` accepting a JSON payload parsed from an uploaded CSV file on the frontend before submission.

---

### Requirement 17: Admin User and Dealer Management

**User Story:** As an admin, I want to view and manage all dealers including their tier, status, and profile, so that I can maintain accurate dealer records.

#### Acceptance Criteria

1. THE Admin Dealer Management module SHALL expose `GET /api/v1/admin/dealers` returning all users with `role: "dealer"`, paginated and filterable by `registrationStatus` and `tier`.
2. THE Admin Dealer Management module SHALL expose `GET /api/v1/admin/dealers/:id` returning the full dealer profile excluding the `password` field.
3. WHEN an admin changes a dealer's tier via the Dealer Management module, THE User_Service SHALL update the `tier` field and write an AuditLog entry with `action: "TIER_CHANGE"`, `adminId`, `targetId`, and `details: { oldTier, newTier }`.
4. THE Admin Dealer Management module SHALL expose `PATCH /api/v1/admin/dealers/:id/status` allowing an admin to toggle `isDeleted` (soft delete) on a dealer account.
5. WHEN a dealer account is soft-deleted, THE Auth_Service SHALL reject all subsequent login attempts for that account with `403` and message `"Account has been deactivated."`.
6. THE Admin Notification Center module SHALL display all notifications for the requesting admin with read/unread filtering and a "Mark All as Read" action.

---

### Requirement 18: Rate Limiting

**User Story:** As a system operator, I want basic rate limiting on auth endpoints, so that brute-force login and registration attacks are mitigated without installing external packages.

#### Acceptance Criteria

1. THE Backend SHALL include a custom `rateLimiter` middleware at `backend/src/middleware/rateLimiter.js` implemented using a plain JavaScript `Map` to store request counts per IP address — no external rate-limiting library SHALL be used.
2. THE `rateLimiter` middleware SHALL limit `POST /api/v1/auth/login` to 10 requests per IP per 15-minute window; IF the limit is exceeded, THE middleware SHALL return `429` with message `"Too many requests. Please try again later."`.
3. THE `rateLimiter` middleware SHALL limit `POST /api/v1/auth/register` and `POST /api/v1/auth/dealer/register` to 5 requests per IP per 60-minute window.
4. THE `rateLimiter` middleware SHALL clear expired entries from the `Map` periodically to prevent unbounded memory growth.

---

### Requirement 19: Activity Logging and Audit Trail

**User Story:** As an admin, I want an audit trail of all significant admin actions, so that I can investigate issues and hold operators accountable.

#### Acceptance Criteria

1. THE Backend SHALL include an `activityLogger` middleware at `backend/src/middleware/activityLogger.js` that writes an AuditLog entry for every mutating request (`POST`, `PATCH`, `PUT`, `DELETE`) made by an authenticated admin or editor.
2. THE AuditLog document SHALL include: `adminId` (ref: User), `action` (descriptive string), `targetId` (ref to affected document), `details` (object containing `old` and `new` snapshots where applicable), and `createdAt`.
3. THE AuditLog collection SHALL be append-only — no update or delete endpoints SHALL be exposed for AuditLog documents.
4. THE `recentActivity` field in the analytics summary SHALL populate the `adminId` reference to return the admin's `profile.name` alongside the action.

---

### Requirement 20: Error Handling and API Response Standards

**User Story:** As a developer, I want all API responses to follow a consistent shape and all errors to be handled safely, so that the frontend can reliably parse responses and users never see raw stack traces.

#### Acceptance Criteria

1. THE API SHALL return all responses using the `sendResponse` utility shape: `{ success: Boolean, message: String, data: Object|null }`.
2. WHEN pagination applies, THE API SHALL include a `pagination` object in the response: `{ page, limit, total, totalPages }`.
3. IF an unhandled error occurs in any async route handler in `NODE_ENV: "production"`, THE API SHALL return `500` with `message: "Internal server error."` and SHALL NOT include stack traces or `err.message`.
4. IF an unhandled error occurs in any async route handler in `NODE_ENV: "development"`, THE API SHALL return `500` with `message: err.message` for debugging.
5. EVERY async route handler in the Backend SHALL be wrapped in a `try/catch` block — no unhandled promise rejections SHALL propagate to the Express default error handler.
6. THE API SHALL use standard HTTP status codes: `200` for successful reads/updates, `201` for successful creates, `400` for validation failures, `401` for missing/invalid tokens, `403` for authorization failures, `404` for missing resources, `409` for conflicts, `413` for oversized payloads, `429` for rate-limit exceeded, `500` for server errors.

---

### Requirement 21: Frontend Code Architecture and Patterns

**User Story:** As a developer, I want all frontend code to follow consistent, readable patterns, so that the codebase is maintainable by any developer familiar with React.

#### Acceptance Criteria

1. THE Frontend SHALL use CSS Modules exclusively for component-level styles — every component file `ComponentName.jsx` SHALL have a corresponding `ComponentName.module.css` file; global styles SHALL be limited to `src/styles/variables.css` and `src/styles/global.css`.
2. THE Frontend SHALL implement data fetching using custom hooks with `useEffect` — no `@tanstack/react-query` or `axios` SHALL be used.
3. THE Frontend `src/services/api.js` SHALL be the single fetch wrapper used by all components and hooks, handling `Authorization` header injection, automatic token refresh on `401`, and standard error parsing.
4. THE Frontend SHALL use native `<form>` elements with `useState` for form state management — no `react-hook-form` SHALL be used.
5. THE Frontend SHALL use native if/else conditional logic — ternary chains exceeding two levels of nesting SHALL NOT be used.
6. ALL hardcoded string values, numeric constants, and configuration values SHALL be defined in `src/utils/constants.js` and imported where needed — no inline magic values.
7. THE Frontend SHALL render loading, error, and empty states for every list view and form component.
8. THE Frontend SHALL use `document.title = pageName` for setting the browser tab title on each page — no `react-helmet-async` SHALL be used.
9. THE Frontend SHALL implement all transitions and animations using CSS transitions in `.module.css` files — no `framer-motion` SHALL be used.
10. THE `AuthContext` at `src/context/AuthContext.jsx` and `CartContext` at `src/context/CartContext.jsx` SHALL be the only two React contexts in the application.

---

### Requirement 22: Backend Code Architecture and Patterns

**User Story:** As a developer, I want all backend code to follow consistent patterns with a clear module structure, so that any new endpoint can be added by following established conventions.

#### Acceptance Criteria

1. THE Backend SHALL use CommonJS (`require`/`module.exports`) throughout — no ES module `import`/`export` syntax SHALL be used.
2. EVERY backend module SHALL follow the pattern: `routes.js` defines Express routes and attaches middleware, `controller.js` contains request/response logic, `service.js` (where applicable) contains business logic separate from HTTP concerns, and `model.js` contains the Mongoose schema.
3. THE `sendResponse` utility SHALL be imported and used in every controller for all success and error responses — no ad-hoc `res.json()` calls.
4. ALL native if/else validation SHALL be completed before any database operation in every controller function.
5. THE `discountMap` in `Tier_Pricing_Service` SHALL be the single definition of tier discount values — no other file SHALL hardcode tier discount percentages.
6. THE Backend index route at `backend/src/routes/index.js` SHALL register all public and authenticated user routes; the admin route file at `backend/src/routes/admin.js` SHALL register all admin routes.
7. THE Vercel serverless entry at `api/index.js` SHALL export the Express `app` instance — no business logic SHALL exist in this file.

---

### Requirement 23: Testing Standards

**User Story:** As a developer, I want comprehensive tests for critical business logic, so that regressions are caught before they reach production.

#### Acceptance Criteria

1. THE Backend SHALL use `jest` and `supertest` for integration tests on all auth and catalog API endpoints.
2. THE Backend SHALL use `fast-check` for property-based tests on the Pricing_Service and Tier_Pricing_Service — specifically verifying that computed prices are always non-negative, always less than or equal to the base price, and that the round-trip of `encode(price)` → `decode` produces the original value within floating-point tolerance.
3. THE Frontend SHALL use `vitest` and `@testing-library/react` for unit tests on all custom hooks and utility functions.
4. WHEN the Pricing_Service computes a tier-discounted price, FOR ALL valid non-negative base prices and all four valid tier values, the resulting price SHALL be greater than or equal to zero (non-negative invariant).
5. WHEN the Pricing_Service applies a campaign discount after a tier discount, FOR ALL valid inputs the final price SHALL be less than or equal to the tier-discounted price (monotone discount invariant).
6. THE `validators.js` utility at `src/utils/validators.js` SHALL be covered by property-based tests verifying that valid phone numbers always pass and invalid phone numbers (non-numeric, wrong length) always fail.

---

### Requirement 24: Documentation

**User Story:** As a developer joining the project, I want complete documentation covering architecture, API, and contribution guidelines, so that I can contribute effectively without reverse-engineering the codebase.

#### Acceptance Criteria

1. THE `README.md` at the project root SHALL include: project description, live URL, tech stack table, local setup instructions (prerequisites, install, env setup, dev server commands), and links to all docs.
2. THE `docs/ARCHITECTURE.md` SHALL include: system architecture diagram (ASCII), data flow description for the three main user journeys (browse catalog, dealer login + price fetch, admin approve dealer), and rationale for all major tech decisions.
3. THE `docs/API.md` SHALL document every API endpoint with: method, path, auth requirement, request body/query params, response shape, and error codes.
4. THE `docs/SOP.md` SHALL document operational procedures: how to seed the database, how to add a new admin user, how to run exports, and how to deploy.
5. THE `docs/CONTRIBUTING.md` SHALL document: branch naming conventions, commit message format (Conventional Commits), PR process, and code review checklist.
6. THE `.github/COMMIT_CONVENTION.md` SHALL specify the Conventional Commits format with allowed types (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`) and scope examples.
7. THE `.github/pull_request_template.md` SHALL include sections for: summary of changes, testing performed, screenshots (if UI change), and checklist (tests pass, no console errors, docs updated).

---

### Requirement 25: Deployment and Environment Configuration

**User Story:** As a developer, I want the project configured for zero-friction Vercel deployment, so that every push to main can go live without manual steps.

#### Acceptance Criteria

1. THE `vercel.json` at the project root SHALL configure `rewrites` so that all `/api/*` paths are forwarded to `api/index.js` and all other paths serve the Frontend build output from `frontend/dist`.
2. THE Backend SHALL read all environment variables using Node 20's `--env-file` flag in `package.json` scripts — no `dotenv` package SHALL be used.
3. THE Frontend Vite build SHALL read `VITE_API_URL` and `VITE_WHATSAPP_NUMBER` from the environment at build time using `import.meta.env`.
4. THE Backend `.env.example` SHALL list all required variables: `MONGODB_URI`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `PASSWORD_PEPPER`, `FRONTEND_URL`, `NODE_ENV`.
5. THE Frontend `.env.example` SHALL list all required variables: `VITE_API_URL`, `VITE_WHATSAPP_NUMBER`.
6. THE `.gitignore` SHALL exclude `.env` files, `node_modules/`, `dist/`, and `*.log` from version control.
