# Implementation Plan: BTG v4 Rebuild

## Overview

Ground-up rebuild of the Badol Tyre Ghar B2B/B2C tyre wholesale platform. The implementation follows a backend-first, model-driven approach: scaffold → models → auth → business logic → frontend foundation → frontend features → admin panel → tests → docs → deployment config. Each task builds directly on the previous; no code is left unintegrated.

Language: **JavaScript** (Node.js / CommonJS for backend, React 19 / ESM for frontend).

---

## Tasks

- [ ] 1. Project scaffold — monorepo structure and configuration files
  - [-] 1.1 Create root `btg-v4/` directory with `frontend/`, `backend/`, `api/`, `docs/`, `.github/` subdirectories and root-level `README.md`, `.gitignore`
    - Create the full folder skeleton exactly as defined in the design's Backend File Structure and Frontend File Structure sections
    - Add `.gitignore` excluding `.env`, `node_modules/`, `dist/`, `*.log`
    - _Requirements: 1.1, 25.6_
  - [-] 1.2 Create `backend/package.json` with exact approved dependency list
    - Runtime deps: `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `cors`, `multer`, `cloudinary`
    - Dev deps: `nodemon`, `jest`, `supertest`, `fast-check`
    - Add npm scripts: `"dev": "node --env-file=.env src/app.js"`, `"test": "jest --testEnvironment node --coverage"`
    - _Requirements: 1.3, 1.5, 22.1_
  - [-] 1.3 Create `frontend/package.json` with exact approved dependency list
    - Runtime deps: `react`, `react-dom`, `react-router-dom`, `lucide-react`, `@react-pdf/renderer`, `recharts`
    - Dev deps: `vite`, `@vitejs/plugin-react`, `eslint`, `prettier`, `vitest`, `@testing-library/react`
    - Add npm scripts: `"dev": "vite"`, `"build": "vite build"`, `"test": "vitest --run --coverage"`
    - _Requirements: 1.2, 1.4, 21.2_
  - [-] 1.4 Create `frontend/vite.config.js` with `@vitejs/plugin-react` and dev-server proxy to backend
    - Configure `server.proxy` to forward `/api/*` to `http://localhost:3000`
    - _Requirements: 1.6_
  - [-] 1.5 Create `vercel.json` at root with builds and rewrites config
    - Build `api/index.js` with `@vercel/node`; build `frontend/package.json` with `@vercel/static-build` (`distDir: "dist"`)
    - Rewrite `/api/:path*` → `api/index.js`; rewrite `/(.*)` → `/index.html`
    - _Requirements: 1.9, 25.1_
  - [-] 1.6 Create `backend/.env.example` and `frontend/.env.example`
    - Backend: `MONGODB_URI`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `PASSWORD_PEPPER`, `FRONTEND_URL`, `NODE_ENV`
    - Frontend: `VITE_API_URL`, `VITE_WHATSAPP_NUMBER`
    - _Requirements: 1.8, 25.4, 25.5_
  - [-] 1.7 Create `docs/` placeholder files: `ARCHITECTURE.md`, `SOP.md`, `API.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
    - Add minimal headings only; content filled in task 22
    - _Requirements: 1.10_
  - [-] 1.8 Create `.github/COMMIT_CONVENTION.md` and `.github/pull_request_template.md`
    - Commit convention: Conventional Commits, types `feat|fix|refactor|docs|test|chore`, scope examples
    - PR template: summary, testing performed, screenshots, checklist (tests pass, no console errors, docs updated)
    - _Requirements: 1.11, 24.6, 24.7_

- [ ] 2. Git branching — archive v3 and initialize v4 main
  - [~] 2.1 Create and push an `archive/v3` branch from the current HEAD of the v3 repo
    - Run `git checkout -b archive/v3 && git push origin archive/v3`
    - _Requirements: 1.1_
  - [~] 2.2 Reset `main` to the new v4 scaffold commit
    - Stage and commit the scaffold created in task 1 with message `chore: initialize btg-v4 monorepo scaffold`
    - _Requirements: 1.1_

- [ ] 3. Backend foundation — Express app, DB connection, and middleware
  - [~] 3.1 Create `backend/src/app.js` — Express app setup with all global middleware, no `listen()`
    - Apply: `cors({ origin: FRONTEND_URL, credentials: true })`, `cookieParser()`, `express.json()`
    - Mount route files: `require('./routes/index')` and `require('./routes/admin')`
    - Add 404 handler and global error handler (env-aware message, no stack trace in prod)
    - _Requirements: 22.7, 20.3, 20.4_
  - [~] 3.2 Create `api/index.js` serverless entry — export only
    - `const app = require('../backend/src/app'); module.exports = app;` — no other logic
    - _Requirements: 22.7_
  - [~] 3.3 Create `backend/src/utils/sendResponse.js`
    - Signature: `sendResponse(res, statusCode, success, message, data, pagination)`
    - Include optional `pagination` field in body when supplied
    - _Requirements: 20.1, 20.2, 22.3_
  - [~] 3.4 Create `backend/src/middleware/auth.js` — `protect()`, `restrictTo(...roles)`, `optionalAuth()`
    - `protect`: verify `Authorization: Bearer <token>` JWT, attach `req.user`, return 401 on failure
    - `restrictTo`: check `req.user.role`, return 403 if not in allowed list
    - `optionalAuth`: attach `req.user` if valid token present, set `null` otherwise, never error
    - _Requirements: 4.1, 4.2, 4.3_
  - [~] 3.5 Create `backend/src/middleware/rateLimiter.js` — Map-based, no external library
    - Implement `createRateLimiter({ maxRequests, windowMs, message })` factory
    - Export `loginLimiter` (10 req / 15 min) and `registerLimiter` (5 req / 60 min)
    - Add `setInterval` cleanup every 10 minutes removing entries older than 1 hour
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  - [~] 3.6 Create `backend/src/middleware/activityLogger.js`
    - On every mutating request (`POST/PATCH/PUT/DELETE`) by authenticated admin/editor, write AuditLog via `auditLogger.js`
    - _Requirements: 19.1_
  - [~] 3.7 Create `backend/src/utils/auditLogger.js` — `createAuditLog({ adminId, action, targetId, details })`
    - Imports and writes to `AuditLog` model; no update/delete logic
    - _Requirements: 19.2, 19.3_
  - [~] 3.8 Create `backend/src/routes/index.js` and `backend/src/routes/admin.js` — empty scaffolds with comments
    - Routes populated as each module is built; these files simply `require` and mount module routers
    - _Requirements: 22.6_

- [ ] 4. MongoDB models — all 14 collections
  - [~] 4.1 Create `backend/src/modules/users/User.model.js`
    - Fields: `phone`, `password`, `role` (enum admin|editor|dealer|customer), `registrationStatus` (approved|pending|rejected), `isVerified`, `isDeleted`, `tier` (standard|silver|gold|platinum), `discountMultiplier`, `rejectionReason`, `profile` sub-doc (name, businessName, ownerName, address, avatar), timestamps
    - Indexes: `{ phone: 1 }`, `{ role: 1, registrationStatus: 1 }`
    - _Requirements: 5.1 (User), 8.4_
  - [~] 4.2 Create `backend/src/modules/auth/RefreshToken.model.js`
    - Fields: `userId` (ref User), `tokenHash`, `isRevoked`, `deviceInfo`, `expiresAt`, `createdAt`
    - Indexes: `{ userId: 1 }`, `{ tokenHash: 1 }`, TTL index on `expiresAt`
    - _Requirements: 3.6_
  - [~] 4.3 Create `backend/src/modules/catalog/Product.model.js`
    - Fields: `name`, `slug` (unique), `sku` (unique), `category` (ref), `brand` (ref), `images[]`, `specs` (size|pattern|rim|origin), `variants[]` (sku|ply|retailPrice|wholesalePrice|stock), `isVisible`, `showPrice`, `searchTags[]`, `viewCount`, `isDeleted`, timestamps
    - Text index on `{ name, sku, 'specs.size', 'specs.pattern', searchTags }` plus field indexes
    - _Requirements: 5.1_
  - [~] 4.4 Create `backend/src/modules/catalog/Category.model.js`
    - Fields: `name`, `slug` (unique), `parentCategory` (self-ref nullable), `isActive`, `displayOrder`, timestamps
    - _Requirements: 5.2_
  - [~] 4.5 Create `backend/src/modules/catalog/Brand.model.js`
    - Fields: `name`, `slug` (unique), `logo`, `description`, `isActive`, timestamps
    - _Requirements: 5.3_
  - [~] 4.6 Create `backend/src/modules/catalog/Campaign.model.js`
    - Fields: `name`, `type` (percent|flat), `value`, `appliesTo` (products[]|categories[]|brands[]), `startDate`, `endDate`, `isActive`, `isDeleted`, timestamps
    - Index: `{ isActive: 1, isDeleted: 1, endDate: 1 }`
    - _Requirements: 10.1_
  - [~] 4.7 Create `backend/src/modules/catalog/Inquiry.model.js`
    - Fields: `user` (ref nullable), `items[]` (productId|variantSku|quantity), `status` (inquired|replied|converted), `whatsappMessage`, `adminNote`, timestamps
    - Indexes: `{ status: 1 }`, `{ createdAt: -1 }`
    - _Requirements: 9.1_
  - [~] 4.8 Create `backend/src/modules/catalog/SearchLog.model.js`
    - Fields: `term` (unique), `count`, `lastSearchedAt`, `resultCount`
    - Indexes: `{ term: 1 }`, `{ count: -1 }`
    - _Requirements: 7.2_
  - [~] 4.9 Create `backend/src/modules/media/MediaAsset.model.js`
    - Fields: `filename`, `cloudinaryUrl`, `cloudinaryPublicId`, `type` (product|logo|banner|other), `uploadedBy` (ref), `size`, `format`, `createdAt`
    - Indexes: `{ type: 1 }`, `{ createdAt: -1 }`
    - _Requirements: 11.1_
  - [~] 4.10 Create `backend/src/modules/notifications/Notification.model.js`
    - Fields: `recipientId` (ref), `type` (dealer_application|new_inquiry|low_stock|system), `title`, `message`, `link`, `isRead`, `createdAt`
    - Indexes: `{ recipientId: 1, isRead: 1 }`, `{ createdAt: -1 }`
    - _Requirements: 13.1_
  - [~] 4.11 Create `backend/src/modules/siteConfig/SiteConfig.model.js`
    - Fields: `branding` (logo|siteName|slogan), `contact` (whatsapp|phone|email), `social` (Map of String), `updatedAt`
    - Single-document pattern — always upserted via `findOneAndUpdate`
    - _Requirements: 12.1_
  - [~] 4.12 Create `backend/src/utils/AuditLog.model.js`
    - Fields: `adminId` (ref), `action`, `targetId`, `details` (object), `createdAt`
    - Indexes: `{ adminId: 1 }`, `{ createdAt: -1 }`
    - Append-only: no update or delete routes
    - _Requirements: 19.2_
  - [~] 4.13 Create `TierPricingRule` model (inline in `tierPricingService.js` or separate file)
    - Fields: `tier` (unique enum), `discountPercent`, `updatedAt`
    - Used as optional DB override; falls back to `discountMap`
    - _Requirements: 6.4_
  - [~] 4.14 Create DB connection module `backend/src/config/db.js`
    - Call `mongoose.connect(process.env.MONGODB_URI)` with `{ useNewUrlParser: true, useUnifiedTopology: true }`
    - Import and call in `app.js` on startup
    - _Requirements: 1.7 (Node --env-file)_

- [ ] 5. Auth system — registration, login, JWT rotation, pepper+salt
  - [~] 5.1 Create `backend/src/modules/auth/auth.service.js`
    - `registerCustomer({ name, phone, password })`: validate → check duplicate phone → hash `PASSWORD_PEPPER + password` with bcrypt saltRounds 12 → create User (role: customer, status: approved) → `issueTokenPair`
    - `registerDealer({ businessName, ownerName, phone, address, password })`: same but role: dealer, status: pending → trigger `notificationService.createDealerApplicationNotification`
    - `login({ phone, password })`: find user → check isDeleted/status → bcrypt.compare with pepper → `issueTokenPair`
    - `issueTokenPair(userId)`: sign 15m access JWT → generate raw refresh token → SHA-256 hash → save RefreshToken doc → set HTTP-only cookie → return `{ accessToken, user }`
    - `refreshToken(rawToken)`: hash → find doc → check revoked/expired → theft detection (revoke all if reused) → issue new pair
    - `logout(tokenHash)`: mark RefreshToken `isRevoked: true`, clear cookie
    - Never return `password` field in any response
    - _Requirements: 2.1, 2.2, 2.6, 2.7, 3.1, 3.5, 3.6, 3.7, 3.8_
  - [~] 5.2 Create `backend/src/modules/auth/auth.controller.js` and `auth.routes.js`
    - Routes: `POST /register`, `POST /dealer/register`, `POST /login` (with rateLimiters), `POST /refresh`, `POST /logout`, `GET /me`
    - Each handler: validate inputs with native if/else before any DB call → call service → `sendResponse`
    - Apply `loginLimiter` to `/login`; `registerLimiter` to both register routes
    - `GET /me` returns `_id`, `role`, `registrationStatus`, `tier`, `profile`, `phone` — not `password`
    - Mount router in `backend/src/routes/index.js` under `/api/v1/auth`
    - _Requirements: 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.9, 20.5, 20.6_
  - [ ]* 5.3 Write property test for password hash non-reversibility (Property 8)
    - **Property 8: Password Hash Non-reversibility Invariant**
    - **Validates: Requirements 2.6, 3.1**
    - File: `backend/tests/properties/auth.test.js`
    - Use `fast-check` to assert: (a) stored hash !== plaintext, (b) `bcrypt.compare(PEPPER + password, hash)` is `true`, (c) wrong password returns `false`

- [ ] 6. Pricing utilities — `tierPricingService` and `pricingService`
  - [~] 6.1 Create `backend/src/utils/tierPricingService.js`
    - Define `discountMap = { standard: 0, silver: 5, gold: 10, platinum: 15 }` — this is the single definition
    - Implement module-level cache with 60-second TTL; `getDiscountPercent(tier)` queries `TierPricingRule`, falls back to `discountMap` on DB error, logs warning for unknown tier
    - Export `{ discountMap, getDiscountPercent }`
    - _Requirements: 6.3, 6.4, 6.5_
  - [~] 6.2 Create `backend/src/utils/pricingService.js`
    - Implement `computePrice(variant, user, activeCampaigns)`:
      1. `basePrice` = wholesalePrice (dealer) or retailPrice (customer/public)
      2. Apply `user.discountMultiplier` if > 0
      3. Apply `tierPricingService.getDiscountPercent(user.tier)`
      4. Find applicable campaigns (filter by product/category/brand, active, endDate > now), pick max effective discount
      5. `Math.round(price * 100) / 100`; `Math.max(0, price)`
    - Export `{ computePrice }`
    - _Requirements: 6.1, 6.2, 6.6, 10.2, 10.3, 10.4_
  - [ ]* 6.3 Write property tests for pricing (Properties 1, 2, 3, 4)
    - **Property 1: Non-negative Price Invariant** — `computePrice` always ≥ 0 for valid inputs
    - **Property 2: Combined Monotone Discount Invariant** — campaign never increases price above tier-only result; multiple campaigns resolve to single lowest-price campaign
    - **Property 3: Tier Discount Monotonicity** — standard ≤ silver ≤ gold ≤ platinum for same base price
    - **Property 4: Price Rounding Idempotence** — applying rounding twice equals applying once
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.6, 10.2, 10.3, 23.4, 23.5**
    - File: `backend/tests/properties/pricing.test.js`
    - Use `fast-check` with `numRuns: 500`

- [ ] 7. Catalog system — products, categories, brands, search, pricing visibility
  - [~] 7.1 Create `backend/src/modules/catalog/catalog.service.js`
    - `getProducts(filters, user)`: query `isVisible: true, isDeleted: false` with pagination; apply `pricingService.computePrice` per variant for approved dealers; omit raw prices for all other roles; handle `search` via case-insensitive regex on name/sku/specs/searchTags; upsert `SearchLog` on every search
    - `getProductBySlug(slug, user)`: increment `viewCount`, apply same pricing rules, return 404 for invisible/deleted
    - `createProduct(data)`: auto-generate `slug` from `name` if not provided; insert document
    - `updateProduct(id, data)`: partial update
    - `softDeleteProduct(id)`: set `isDeleted: true`
    - `bulkCreateProducts(array)`: loop insert, collect errors, return `{ created, failed, errors[] }`
    - `toggleVisibility(id, isVisible)`, `toggleShowPrice(id, showPrice)`, `bulkMarkup({ categoryId, brandId, adjustmentType, adjustmentValue })`
    - `getCategories()`, `createCategory(data)`, `updateCategory(id, data)`
    - `getBrands()`, `createBrand(data)`, `updateBrand(id, data)`
    - `getSearchLogs(page, limit)`
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 7.1, 7.2, 7.3, 7.5, 16.2, 16.3, 16.5, 16.7, 16.8_
  - [~] 7.2 Create `backend/src/modules/catalog/catalog.controller.js` and `catalog.routes.js`
    - Public routes (optionalAuth): `GET /catalog`, `GET /catalog/:slug`, `GET /categories`, `GET /brands`
    - Admin routes (protect + admin|editor): full CRUD under `/admin/catalog`, `/admin/products/:id/visibility`, `/admin/products/:id/show-price`, `/admin/products/bulk-markup`, `GET /admin/export/csv` (stream), `GET /admin/search-logs`
    - Mount public routes in `routes/index.js` under `/api/v1`; admin routes in `routes/admin.js`
    - _Requirements: 5.4, 5.9, 7.4, 16.1, 16.4, 16.6, 16.7_
  - [~] 7.3 Implement CSV export endpoint `GET /api/v1/admin/export/csv`
    - Stream response with `Content-Type: text/csv` header; include all non-deleted products with flattened variants
    - Write AuditLog for export action
    - _Requirements: 16.7_

- [ ] 8. User and dealer management
  - [~] 8.1 Create `backend/src/modules/users/users.service.js`
    - `getDealers(filters)`: query role: dealer with pagination; filterable by `registrationStatus` and `tier`
    - `getDealerById(id)`: return full profile excluding `password`
    - `approveDealer(id)`: set `registrationStatus: "approved"`, `isVerified: true`, `tier: "standard"`; create notification for admins
    - `rejectDealer(id, rejectionReason)`: set `registrationStatus: "rejected"`, store reason; create notification
    - `changeTier(id, tier, adminId)`: update `tier`; write AuditLog `action: "TIER_CHANGE"` with `{ oldTier, newTier }`
    - `softDeleteDealer(id, adminId)`: set `isDeleted: true`; write AuditLog
    - `getPendingCount()`: count dealers with `registrationStatus: "pending"`
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 17.1, 17.2, 17.3, 17.4, 17.5_
  - [~] 8.2 Create `backend/src/modules/users/users.controller.js` and `users.routes.js`
    - Admin routes (protect + admin): `GET /admin/dealers`, `GET /admin/dealers/:id`, `PATCH /admin/dealers/:id/approve`, `PATCH /admin/dealers/:id/reject`, `PATCH /admin/dealers/:id/tier`, `PATCH /admin/dealers/:id/status`, `GET /admin/registrations/count`
    - Analytics route (protect + admin|editor): `GET /admin/analytics/summary`
    - Mount in `routes/admin.js`
    - _Requirements: 8.3, 8.8, 15.1, 17.1_
  - [~] 8.3 Implement `GET /api/v1/admin/analytics/summary`
    - Run all 8 aggregate queries in `Promise.all`: `totalProducts`, `totalDealers`, `activeDealers`, `pendingRegistrations`, `productsByBrand`, `dealerRegistrations` (last 30 days gap-filled), `topViewedProducts` (top 5 viewCount), `recentActivity` (last 10 AuditLogs with populated adminId.profile.name)
    - _Requirements: 15.1, 15.2, 19.4_

- [ ] 9. Campaign management system
  - [~] 9.1 Create `backend/src/modules/catalog/campaign.service.js` (or extend catalog.service.js)
    - `getCampaigns()`: list all non-deleted campaigns
    - `createCampaign(data)`: insert
    - `updateCampaign(id, data)`: partial update
    - `softDeleteCampaign(id)`: set `isActive: false, isDeleted: true`
    - `getActiveCampaignsForProduct(productId, categoryId, brandId)`: filter `isActive: true, isDeleted: false, endDate > now`, return matching campaigns
    - _Requirements: 10.1, 10.4, 10.5, 10.6_
  - [~] 9.2 Create campaign routes and controller under `/api/v1/admin/campaigns`
    - `GET /admin/campaigns`, `POST /admin/campaigns`, `PATCH /admin/campaigns/:id`, `DELETE /admin/campaigns/:id`
    - All protected by `protect` + `restrictTo('admin')`
    - Mount in `routes/admin.js`
    - _Requirements: 10.5_

- [ ] 10. Media management
  - [~] 10.1 Create `backend/src/modules/media/media.service.js`
    - `uploadMedia(file, type, uploadedBy)`: validate MIME type (jpeg|png|webp only → 400) and size (≤ 5MB → 413) → upload to Cloudinary → save MediaAsset document
    - `listMedia(filters)`: paginated list, filterable by `type`
    - `deleteMedia(id)`: delete from Cloudinary first; if Cloudinary fails return 500 and skip DB delete; on success delete MediaAsset document
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.7, 11.8_
  - [~] 10.2 Create `backend/src/modules/media/media.controller.js` and `media.routes.js`
    - Configure `multer` with `memoryStorage`, 5MB file size limit
    - Routes (protect + admin|editor): `POST /admin/media/upload`, `GET /admin/media`, `DELETE /admin/media/:id`
    - Mount in `routes/admin.js`
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 11. Notifications system
  - [~] 11.1 Create `backend/src/modules/notifications/notifications.service.js`
    - `createNotification({ recipientId, type, title, message, link })`: insert Notification document
    - `createNotificationForAllAdmins({ type, title, message, link })`: query all `role: "admin"` users → bulk-insert Notification for each
    - `getNotifications(userId)`: return 50 most recent for recipient, ordered by `createdAt` desc
    - `getUnreadCount(userId)`: count `isRead: false` for recipient
    - `markRead(notificationId, userId)`: set `isRead: true`
    - `markAllRead(userId)`: `updateMany` `isRead: true` for recipient
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 2.3, 8.7_
  - [~] 11.2 Create `backend/src/modules/notifications/notifications.controller.js` and `notifications.routes.js`
    - Routes (protect + admin): `GET /admin/notifications/unread-count`, `GET /admin/notifications`, `PATCH /admin/notifications/:id/read`, `PATCH /admin/notifications/read-all`
    - Mount in `routes/admin.js`
    - _Requirements: 13.2, 13.3, 13.4, 13.5_

- [ ] 12. Inquiry / CRM
  - [~] 12.1 Create inquiry service methods (extend `catalog.service.js` or separate `inquiry.service.js`)
    - `createInquiry({ user, items })`: auto-generate `whatsappMessage` string from items (name + SKU + qty); insert Inquiry; create `new_inquiry` notification for all admins
    - `getInquiries(filters, page)`: sorted by `createdAt` desc, filterable by `status`
    - `updateInquiryStatus(id, status, adminId)`: validate transition (inquired→replied→converted); update; write AuditLog
    - `addInquiryNote(id, adminNote, adminId)`: update `adminNote`; write AuditLog
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - [~] 12.2 Create inquiry routes and controller
    - Public/optionalAuth: `POST /api/v1/inquiries`
    - Admin (protect + admin): `GET /admin/inquiries`, `PATCH /admin/inquiries/:id/status`, `PATCH /admin/inquiries/:id/note`
    - Mount public route in `routes/index.js`; admin routes in `routes/admin.js`
    - _Requirements: 9.1, 9.4, 9.6, 9.7_

- [ ] 13. Site configuration
  - [~] 13.1 Create `backend/src/modules/siteConfig/siteConfig.service.js` and `siteConfig.controller.js`
    - `getSiteConfig()`: `findOne()` — returns single SiteConfig document
    - `updateSiteConfig(data)`: `findOneAndUpdate({}, data, { new: true, upsert: true })`
    - Routes: public `GET /api/v1/site-config` (no auth), protected `PATCH /api/v1/admin/site-config` (protect + admin), `GET /api/v1/admin/site-config` (protect + admin)
    - Mount public route in `routes/index.js`; admin routes in `routes/admin.js`
    - _Requirements: 12.1, 12.2, 12.3_

- [~] 14. Backend checkpoint — all routes integrated and tested
  - Ensure all module routers are mounted in `routes/index.js` and `routes/admin.js`
  - Verify `api/index.js` exports app correctly
  - Run `npm test` in `backend/` — all integration tests and PBT should pass
  - Ask the user if there are any questions or adjustments before moving to frontend

- [ ] 15. Frontend foundation — Vite, routing, contexts, utilities, services
  - [~] 15.1 Create `frontend/src/main.jsx` — React root with context providers
    - Wrap app in `AuthContext.Provider` → `CartContext.Provider` → `BrowserRouter` → `App`
    - _Requirements: 21.10_
  - [~] 15.2 Create `frontend/src/services/api.js` — single fetch wrapper
    - Module-level `let accessToken = null` (in-memory only)
    - `apiFetch(url, options)`: inject `Authorization: Bearer` header, set `credentials: 'include'`, on 401 attempt single refresh → retry; on second failure call `AuthContext.logout()` and return
    - Export named helpers: `api.get(url)`, `api.post(url, body)`, `api.patch(url, body)`, `api.delete(url)`
    - Expose `setAccessToken(token)` for AuthContext to call after login/refresh
    - _Requirements: 3.10, 21.3_
  - [~] 15.3 Create `frontend/src/context/AuthContext.jsx`
    - Provider state: `user`, `accessToken`, `loading`
    - Derived: `isDealer = user?.role === 'dealer' && user?.registrationStatus === 'approved'`
    - Bootstrap on mount: `POST /api/v1/auth/refresh` → `GET /api/v1/auth/me` → set state
    - Exports: `user`, `accessToken`, `isDealer`, `loading`, `login(accessToken, user)`, `logout()`, `refreshUser()`
    - _Requirements: 3.10, 21.10_
  - [~] 15.4 Create `frontend/src/context/CartContext.jsx`
    - Provider state: `items` (in-memory only — no persistence)
    - Exports: `items`, `addToCart(item)`, `removeFromCart(variantSku)`, `updateQty(variantSku, qty)`, `clear()`, `itemCount`
    - _Requirements: 21.10_
  - [~] 15.5 Create `frontend/src/utils/constants.js`
    - Define all hardcoded values: `API_BASE_URL`, `PDF_CACHE_KEY`, `PDF_CACHE_TTL`, `NOTIFICATION_POLL_INTERVAL`, `DEFAULT_SITE_NAME`, `DEFAULT_LOGO`, whatsapp link template, pagination defaults, etc.
    - _Requirements: 21.6_
  - [~] 15.6 Create `frontend/src/utils/validators.js`
    - `isValidBDPhone(phone)`: returns `true` iff string is exactly 11 digits starting with `01`
    - `isValidPassword(password)`: minimum length, etc.
    - Pure functions only — no side effects
    - _Requirements: 2.5, 23.6_
  - [~] 15.7 Create `frontend/src/utils/formatters.js`
    - `formatPrice(amount)`: format to BDT 2 decimal places
    - `formatDate(dateStr)`: human-readable relative and absolute formats
    - `formatNumber(n)`: comma-separated
    - _Requirements: 21.2_
  - [~] 15.8 Create `frontend/src/utils/sounds.js`
    - `playSound(name)`: play notification chime using `new Audio(...)` — no external library
    - _Requirements: 13.7_
  - [~] 15.9 Create custom hooks: `useFetch`, `usePasswordStrength`, `useNotifications`
    - `useFetch(url, deps)`: `{ data, loading, error, refetch }` generic GET hook; uses `api.get()`
    - `usePasswordStrength(password)`: returns `'weak' | 'medium' | 'strong'` based on design algorithm
    - `useNotifications()`: polls `GET /api/v1/admin/notifications/unread-count` every 30s via `setInterval`; calls `playSound` when count increases; clears interval on unmount
    - _Requirements: 13.6, 13.7, 2.9, 21.2_
  - [~] 15.10 Create `frontend/src/App.jsx` with React Router routes and guards
    - Public routes: `/`, `/catalog`, `/catalog/:slug`, `/contact`
    - Auth routes: `/login`, `/register`
    - Protected: `/profile` (ProtectedRoute)
    - Admin: `/admin/*` (ProtectedRoute + RoleGate `['admin', 'editor']`)
    - Fetch and apply SiteConfig on mount: `document.title`, logo
    - _Requirements: 4.4, 4.5, 12.4, 21.8_
  - [~] 15.11 Create `frontend/src/components/auth/ProtectedRoute.jsx` and `RoleGate.jsx`
    - `ProtectedRoute`: shows Spinner while loading, redirects to `/login` if no user
    - `RoleGate`: redirects to `/` if user role not in `allowedRoles`
    - _Requirements: 4.4, 4.5, 4.6, 4.7_
  - [~] 15.12 Create CSS foundation: `src/styles/variables.css` and `src/styles/global.css`
    - `variables.css`: `--color-primary`, `--color-bg`, `--color-text`, `--color-border`, `--spacing-*`, `--font-*` custom properties
    - `global.css`: box-sizing reset, base font, body background — nothing else
    - _Requirements: 21.1_
  - [~] 15.13 Create shared UI components with CSS modules: `Button`, `Input`, `Modal`, `Badge`, `Spinner`, `SkeletonCard`, `Pagination`, `ToggleSwitch`
    - Each: `ComponentName.jsx` + `ComponentName.module.css`; use standard CSS module naming convention from design
    - _Requirements: 21.1, 21.7_

- [ ] 16. Frontend auth pages — Register and Login
  - [~] 16.1 Create `frontend/src/pages/auth/Login/` page
    - Form fields: phone, password with eye toggle (lucide-react)
    - Uses `useState` for form state — no react-hook-form
    - On submit: `api.post('/api/v1/auth/login', ...)` → call `AuthContext.login()` → navigate to `/catalog` or `/admin`
    - Show error messages inline; `document.title = 'Login — BTG'`
    - _Requirements: 3.1, 21.4, 21.8_
  - [~] 16.2 Create `frontend/src/pages/auth/Register/` page — two distinct paths in one component
    - Section 1 "Create Account": name, phone, password, confirm-password
    - Section 2 "Apply as Dealer" (bold CTA): businessName, ownerName, phone, address, password, confirm-password
    - `usePasswordStrength` driving real-time strength indicator (`weak`|`medium`|`strong`)
    - Real-time confirm-password match (green/red indicator)
    - Eye toggles on all password fields via `lucide-react`
    - On submit: call appropriate registration endpoint → `AuthContext.login()` → navigate
    - _Requirements: 2.8, 2.9, 2.10, 2.11, 21.4, 21.8_
  - [ ]* 16.3 Write property-based test for `usePasswordStrength` (Property 6)
    - **Property 6: Password Strength Monotonicity**
    - **Validates: Requirements 2.9**
    - File: `frontend/tests/properties/usePasswordStrength.test.js`
    - Verify appending complexity-adding chars never decreases strength
  - [ ]* 16.4 Write property-based test for `validators.isValidBDPhone` (Property 5)
    - **Property 5: Phone Validator Soundness and Completeness**
    - **Validates: Requirements 2.5, 23.6**
    - File: `frontend/tests/properties/validators.test.js`
    - Valid 11-digit `01...` always passes; non-numeric / wrong length always fails

- [ ] 17. Frontend catalog — product list, filters, product detail
  - [~] 17.1 Create catalog UI components: `ProductCard`, `ProductGrid`, `FilterSidebar`, `VariantTable`
    - `ProductCard`: image, name, size, brand; no price for public/pending; tier price for approved dealer
    - `FilterSidebar`: category checkboxes, brand checkboxes; updates URL query params on change; reads from URL on mount
    - `ProductGrid`: renders `ProductCard` list with loading skeletons and empty state
    - `VariantTable`: sku, ply, stock, tierPrice (dealer only) — read from server data
    - _Requirements: 5.5, 5.6, 7.6, 8.2, 21.1, 21.7_
  - [~] 17.2 Create `frontend/src/pages/public/Catalog/` page
    - Uses `useFetch` with `?category&brand&search&page&limit` query derived from URL params
    - `FilterSidebar` on left; `ProductGrid` on right
    - Pagination component at bottom
    - PDF download button: enabled for approved dealers (calls `usePdfDownload.download()`), disabled with tooltip for others
    - `document.title = 'Catalog — BTG'`
    - _Requirements: 5.4, 8.2, 14.5, 21.7, 21.8_
  - [~] 17.3 Create `usePdfDownload` hook at `frontend/src/hooks/usePdfDownload.js`
    - Check `localStorage` cache (key from `constants.js`, 24h TTL)
    - If cache miss: fetch `/api/v1/catalog?limit=500` → generate PDF via `@react-pdf/renderer` → cache blob → trigger download
    - Return `{ download, generating }`
    - Only enabled for approved dealers — no-op for others
    - _Requirements: 14.1, 14.2, 14.3, 14.5_
  - [~] 17.4 Create `frontend/src/components/pdf/CatalogDocument.jsx`
    - `@react-pdf/renderer` Document with: product name, SKU, specs (size, pattern, ply), tier-adjusted price per variant
    - _Requirements: 14.4_
  - [~] 17.5 Create `frontend/src/pages/public/ProductDetail/` page
    - Fetch product by slug via `useFetch('/api/v1/catalog/:slug')`
    - Show image gallery, specs, `VariantTable`, add-to-cart button (authenticated users only)
    - `document.title = '{productName} — BTG'`
    - _Requirements: 5.7, 21.8_
  - [~] 17.6 Create `frontend/src/pages/public/Home/` and `Contact/` pages
    - Home: hero section, featured products, PDF download button (shares `usePdfDownload`)
    - Contact: static contact info from SiteConfig; WhatsApp link using `VITE_WHATSAPP_NUMBER`
    - `document.title` set appropriately on each
    - _Requirements: 12.4, 21.8_

- [ ] 18. Frontend cart and inquiry
  - [~] 18.1 Create cart UI components and cart/inquiry flow
    - Cart panel/page: list items from `CartContext`, quantity controls, remove button
    - Inquiry submission form: items from cart, submit via `api.post('/api/v1/inquiries', ...)`
    - On success: show confirmation with `whatsappMessage`, "Copy WhatsApp Message" clipboard button
    - Clear cart after successful submission
    - _Requirements: 9.1, 9.2, 9.8, 21.4_
  - [~] 18.2 Create `frontend/src/components/layout/Navbar/` and `Footer/`
    - Navbar: logo from SiteConfig, nav links, cart icon with `itemCount` badge, login/profile link
    - Footer: contact info and social links from SiteConfig
    - Both: `Navbar.module.css`, `Footer.module.css`
    - _Requirements: 12.4, 21.1_

- [ ] 19. Frontend dealer profile
  - [~] 19.1 Create `frontend/src/pages/dealer/Profile/` page
    - Show dealer's profile info: name, businessName, phone, tier, registrationStatus
    - For `registrationStatus: "pending"`: render prominent "Your application is under review" message and disable dealer-only features
    - For approved dealers: show tier badge, tier price access notice, PDF download button
    - _Requirements: 2.12, 8.2_

- [ ] 20. Admin panel foundation — layout, routing, notification bell
  - [~] 20.1 Create `frontend/src/components/layout/AdminLayout/` with sidebar navigation
    - Sidebar: links to all 15+ admin modules, role-gated visibility (editor sees only catalog modules)
    - `NotificationBell` in header
    - `AdminLayout.module.css` with responsive sidebar
    - _Requirements: 4.6, 4.7, 21.1_
  - [~] 20.2 Create `frontend/src/components/notifications/NotificationBell/`
    - Uses `useNotifications()` hook for polling every 30s
    - Badge showing unread count (hidden when 0)
    - Dropdown on click: 10 most recent notifications (title, message, relative time, read/unread)
    - On notification click: `PATCH .../read` → navigate to `link` if present → refetch count
    - `NotificationBell.module.css`
    - _Requirements: 13.6, 13.7, 13.8, 13.9, 13.10_

- [ ] 21. Admin modules — all 15 panels
  - [~] 21.1 Create `frontend/src/pages/admin/Dashboard/` page
    - Loading skeleton cards while `useFetch('/api/v1/admin/analytics/summary')` resolves
    - Error state with retry button
    - 4+ KPI metric cards (totalProducts, totalDealers, activeDealers, pendingRegistrations)
    - `recharts` BarChart for products by brand; LineChart for dealer registrations (30 days)
    - Import only named exports from recharts for tree-shaking
    - `document.title = 'Dashboard — BTG Admin'`
    - _Requirements: 15.3, 15.4, 15.5, 15.6, 21.7, 21.8_
  - [~] 21.2 Create `frontend/src/pages/admin/Products/` page (Catalog Manager)
    - List all products grouped by category; `ToggleSwitch` per product for `isVisible` and `showPrice`
    - Inline edit and delete actions; "Add Product" modal with full product form (name, SKU, category, brand, images, specs, variants)
    - Bulk CSV import: parse CSV on frontend, submit JSON array to `POST /api/v1/admin/catalog/bulk`
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.8_
  - [~] 21.3 Create `frontend/src/pages/admin/Categories/` and `Brands/` pages
    - CRUD for categories (with parent category select) and brands (with logo upload via Media Manager URL)
    - _Requirements: 5.2, 5.3_
  - [~] 21.4 Create `frontend/src/pages/admin/Campaigns/` page (Campaign Manager)
    - List all campaigns; create/edit form (name, type, value, appliesTo, startDate, endDate); toggle `isActive`; soft delete
    - _Requirements: 10.5_
  - [~] 21.5 Create `frontend/src/pages/admin/Dealers/` page (Dealer Management)
    - Paginated dealer list, filterable by status and tier
    - Tier selector dropdown per dealer row; soft-delete action
    - AuditLog confirmation displayed on tier change
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  - [~] 21.6 Create `frontend/src/pages/admin/Registrations/` page
    - Tabbed view: Pending / Approved / Rejected
    - Count badge on "Pending" tab fetched separately from list
    - Approve and Reject actions with rejection reason input on reject
    - _Requirements: 8.3, 8.4, 8.5, 8.8_
  - [~] 21.7 Create `frontend/src/pages/admin/Inquiries/` page (CRM)
    - Sorted by `createdAt` desc, paginated, filterable by `status`
    - Status pipeline control (inquired → replied → converted)
    - "Copy WhatsApp Message" clipboard button per inquiry
    - Admin note editor per inquiry
    - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8_
  - [~] 21.8 Create `frontend/src/pages/admin/Media/` page (Media Manager)
    - Grid view of uploaded assets with filename, format, size, upload date
    - Upload form (drag-and-drop or file picker); type selector (product|logo|banner|other)
    - "Copy URL" button per asset; delete with confirmation
    - _Requirements: 11.5, 11.6_
  - [~] 21.9 Create `frontend/src/pages/admin/SearchIntel/` page
    - Table of search terms sorted by count desc; link each term to a "Assign to Product" action
    - Calls `PATCH .../searchTags` to add term to product's searchTags array
    - _Requirements: 7.4, 7.5_
  - [~] 21.10 Create `frontend/src/pages/admin/Notifications/` page
    - Full notification list with read/unread filter
    - "Mark All as Read" button
    - _Requirements: 17.6_
  - [~] 21.11 Create `frontend/src/pages/admin/SiteConfig/` page
    - Form fields for branding (logo URL from Media Manager, siteName, slogan), contact (whatsapp, phone, email), social links (key-value pairs)
    - On save: `PATCH /api/v1/admin/site-config`
    - _Requirements: 12.3_
  - [~] 21.12 Create `frontend/src/pages/admin/Analytics/` page (extended analytics, if needed beyond dashboard)
    - Extended charts: top viewed products, recent activity feed
    - _Requirements: 15.2_
  - [~] 21.13 Create `frontend/src/pages/admin/BulkMarkup/` page
    - Form: category selector, brand selector, adjustment type (percent|flat), value
    - Preview count of affected products before applying
    - Calls `PATCH /api/v1/admin/products/bulk-markup`
    - _Requirements: 16.5, 16.6_
  - [~] 21.14 Create `frontend/src/pages/admin/PdfManager/` page
    - Upload generated PDF to Cloudinary via `POST /api/v1/admin/pdf/upload`
    - Display stored PDF URL with copy and preview actions
    - _Requirements: 14.6_
  - [~] 21.15 Create `api/cron/regenerate-pdfs.js` Vercel cron job
    - Runs on a schedule, triggers PDF regeneration/cache invalidation
    - _Requirements: 14.6_

- [ ] 22. PDF system — `CatalogDocument` and `usePdfDownload` wiring
  - [~] 22.1 Wire `usePdfDownload` into both Home page and Catalog page (verify single shared hook instance)
    - Confirm PDF download button behaviour: disabled with tooltip for non-approved dealers, enabled for approved
    - Confirm 24-hour localStorage cache works end-to-end
    - _Requirements: 14.1, 14.2, 14.3, 14.5_

- [ ] 23. Documentation — README, ARCHITECTURE, SOP, API, CONTRIBUTING
  - [~] 23.1 Write `README.md` at project root
    - Project description, live URL, tech stack table, prerequisites, install steps, env setup, `npm run dev` commands for both frontend and backend, links to all docs
    - _Requirements: 24.1_
  - [~] 23.2 Write `docs/ARCHITECTURE.md`
    - ASCII system architecture diagram (from design), data flow for 3 user journeys (browse catalog, dealer login + price fetch, admin approve dealer), tech decision rationale
    - _Requirements: 24.2_
  - [~] 23.3 Write `docs/API.md`
    - Document every endpoint: method, path, auth requirement, request body/query params, response shape, error codes — use the API endpoint tables from design as base
    - _Requirements: 24.3_
  - [~] 23.4 Write `docs/SOP.md`
    - Seed database procedure, add new admin user, run CSV export, deploy to Vercel
    - _Requirements: 24.4_
  - [~] 23.5 Write `docs/CONTRIBUTING.md`
    - Branch naming (`feat/`, `fix/`, `chore/`), Conventional Commits format, PR process, code review checklist
    - _Requirements: 24.5_

- [ ] 24. Testing — PBT for pricing and validators; integration tests for auth and catalog
  - [~] 24.1 Create `backend/tests/integration/auth.test.js`
    - Supertest test suite: register customer → login → refresh → re-use revoked token (expect 401 + all tokens revoked) → logout
    - Register dealer → verify pending status → admin approve → login success
    - Role gate assertions: customer hitting admin route gets 403; editor hitting admin-only route gets 403
    - _Requirements: 23.1, 3.7, 4.6, 4.7_
  - [~] 24.2 Create `backend/tests/integration/catalog.test.js`
    - CRUD endpoints, pricing visibility by role (approved dealer sees tierPrice; others do not), search log upsert on search, bulk create returns `{ created, failed, errors[] }`
    - Dealer lifecycle: pending dealer cannot access prices; approved dealer can
    - _Requirements: 23.1, 5.4, 5.5, 5.6, 8.2_
  - [~] 24.3 Create `frontend/tests/unit/hooks.test.js`
    - `useFetch`: loading state, success, error, refetch using vitest + @testing-library/react
    - `usePdfDownload`: cache hit (mocked localStorage < 24h) serves cached; cache miss triggers API fetch
    - _Requirements: 23.3_
  - [~] 24.4 Create `frontend/tests/unit/utils.test.js`
    - `validators.js`: phone format edge cases, password requirements
    - `formatters.js`: price rounding, date formatting, number formatting
    - `api.js`: 401 single-retry logic (mock fetch, verify refresh called once), error parsing
    - _Requirements: 23.3_
  - [ ]* 24.5 Write property-based test for tier pricing cache consistency (Property 7)
    - **Property 7: Tier Pricing Cache Consistency**
    - **Validates: Requirements 6.4**
    - File: `backend/tests/properties/tierPricingService.test.js`
    - Verify two calls within 60s return identical values without second DB query

- [ ] 25. Deployment configuration — finalize vercel.json and env files
  - [~] 25.1 Finalize `vercel.json` for production — verify builds and rewrites are correct
    - Test that `/api/health` → serverless function; `/catalog` → SPA index.html
    - _Requirements: 25.1_
  - [~] 25.2 Verify `backend/package.json` scripts use `--env-file` flag (no dotenv import anywhere in codebase)
    - Scan `require('dotenv')` — must not exist; all env reads are `process.env.*`
    - _Requirements: 25.2_
  - [~] 25.3 Verify `frontend` reads `VITE_API_URL` and `VITE_WHATSAPP_NUMBER` via `import.meta.env`
    - Confirm `constants.js` or direct usage in relevant files
    - _Requirements: 25.3_
  - [~] 25.4 Final checkpoint — run full test suite and resolve any failures
    - `cd backend && npm test` (integration + PBT)
    - `cd frontend && npm test` (unit + PBT)
    - Ensure all tests pass; ask the user if there are any final questions before declaring the implementation complete

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Each task references specific requirements for full traceability
- The design document uses 8 correctness properties — PBT tasks cover Properties 1–8
- All PBT tests are tagged with their property number and the requirements they validate
- The backend uses CommonJS (`require`/`module.exports`) throughout; frontend uses ESM
- No `dotenv`, `zod`, `axios`, `framer-motion`, `react-hook-form`, `@tanstack/react-query` anywhere
- Checkpoint in task 14 is a natural break before starting frontend work

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10", "4.11", "4.12", "4.13", "4.14"] },
    { "id": 4, "tasks": ["5.1", "5.2", "6.1", "6.2"] },
    { "id": 5, "tasks": ["5.3", "6.3", "7.1", "7.2", "8.1", "9.1", "10.1", "11.1", "12.1", "13.1"] },
    { "id": 6, "tasks": ["7.3", "8.2", "8.3", "9.2", "10.2", "11.2", "12.2", "13.2"] },
    { "id": 7, "tasks": ["15.1", "15.2", "15.3", "15.4", "15.5", "15.6", "15.7", "15.8", "15.9", "15.10", "15.11", "15.12", "15.13"] },
    { "id": 8, "tasks": ["16.1", "16.2", "17.1", "17.3", "17.4", "17.6", "18.2", "19.1", "20.1", "20.2"] },
    { "id": 9, "tasks": ["16.3", "16.4", "17.2", "17.5", "18.1", "21.1", "21.2", "21.3", "21.4", "21.5", "21.6", "21.7", "21.8", "21.9", "21.10", "21.11", "21.12", "21.13", "21.14", "21.15"] },
    { "id": 10, "tasks": ["22.1", "23.1", "23.2", "23.3", "23.4", "23.5"] },
    { "id": 11, "tasks": ["24.1", "24.2", "24.3", "24.4"] },
    { "id": 12, "tasks": ["24.5", "25.1", "25.2", "25.3", "25.4"] }
  ]
}
```
