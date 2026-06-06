# Tasks

## Task 1: Data Model Updates — User, TierPricingRule, Seed Script
- [x] 1.1 Add `tier`, `registrationStatus`, and `rejectionReason` fields to `backend/src/modules/users/user.model.js` (preserve all existing fields)
- [x] 1.2 Create `backend/src/modules/users/tierPricing.model.js` with the TierPricingRule schema
- [x] 1.3 Create `backend/src/scripts/seedTierPricing.js` that seeds 4 default rules on startup if collection is empty
- [x] 1.4 Wire `seedTierPricing()` into the server startup in `backend/src/index.js`

**Dependencies:** none

---

## Task 2: TierPricingService Utility
- [x] 2.1 Create `backend/src/utils/TierPricingService.js` with `getDealerPrice(publicPrice, tier)` — in-memory cache (60s TTL), 0% fallback for unknown tiers, rounds to 2 decimal places

**Dependencies:** Task 1

---

## Task 3: Auth Module — Dealer Register Endpoint + Login Status Gating
- [x] 3.1 Add `dealerRegisterSchema` (Zod) and `dealerRegister` controller function to `backend/src/modules/auth/auth.controller.js`
- [x] 3.2 Add `POST /dealer/register` public route to `backend/src/modules/auth/auth.routes.js`
- [x] 3.3 Modify the login handler in `auth.controller.js` to block pending/rejected dealers with 403 responses before issuing tokens

**Dependencies:** Task 1

---

## Task 4: User Admin Controller — Registrations, Approve, Reject, SetTier + Route Wiring
- [x] 4.1 Add `getRegistrations`, `approveDealer`, `rejectDealer`, and `setDealerTier` functions to `backend/src/modules/users/user.admin.controller.js`
- [x] 4.2 Migrate `getPendingDealers` in the same controller to filter by `registrationStatus: 'pending'` instead of `isVerified: false`
- [x] 4.3 Register the four new routes in `backend/src/routes/admin.js`: `GET /dealers/registrations`, `PATCH /dealers/:id/approve`, `PATCH /dealers/:id/reject`, `PATCH /dealers/:id/tier`

**Dependencies:** Task 1, Task 2

---

## Task 5: Analytics Backend — Rewrite `getSummary` Endpoint
- [x] 5.1 Fully rewrite `getSummary` in `backend/src/modules/ops/analytics.admin.controller.js` using `Promise.all` for all 8 queries (KPIs, productsByBrand with brand populate, dealerRegistrations 30-day with gap-fill, topViewedProducts, recentActivity with adminId populate)

**Dependencies:** Task 1

---

## Task 6: Catalog Controller — Inject `tierPrice` for Dealers
- [x] 6.1 Modify `getProduct` in `backend/src/modules/catalog/catalog.controller.js` to append `tierPrice` (tier, discountPercent, adjustedPrice) when `req.user?.role === 'dealer'`
- [x] 6.2 Modify `getProducts` (list) in the same controller to append `tierPrice` per product for dealer requests using the in-memory cache

**Dependencies:** Task 2

---

## Task 7: Shared UI Components — ConfirmDialog + DealerTierBadge
- [x] 7.1 Create `src/components/ui/ConfirmDialog.jsx` and `ConfirmDialog.module.css` — portal-based modal, optional reason textarea, Framer Motion AnimatePresence
- [x] 7.2 Create `src/components/ui/DealerTierBadge.jsx` and `DealerTierBadge.module.css` — tier label display with per-tier colour mapping via `data-tier`

**Dependencies:** none

---

## Task 8: Frontend — Register Page
- [x] 8.1 Create `src/pages/Register.jsx` with react-hook-form + Zod resolver (all 6 fields), idle/submitting/success/error states, Framer Motion entrance animation, link to `/login`
- [x] 8.2 Create `src/pages/Register.module.css`
- [x] 8.3 Add public `<Route path="register" element={<Register />} />` to `src/App.jsx`

**Dependencies:** none

---

## Task 9: Frontend — DashboardHome Rewrite
- [x] 9.1 Fully rewrite `src/pages/admin/DashboardHome.jsx`: TanStack Query for `/admin/analytics/summary`, Skeleton layout, 4 KPI cards, Recharts BarChart (productsByBrand), Recharts LineChart (dealerRegistrations), top-products table, activity feed, Framer Motion wrapper, `timeAgo` helper
- [x] 9.2 Create `src/pages/admin/DashboardHome.module.css`

**Dependencies:** Task 5 (backend must expose summary endpoint)

---

## Task 10: Frontend — AdminRegistrations Module
- [x] 10.1 Create `src/pages/admin/AdminRegistrations.jsx`: TanStack Query for registrations list, Skeleton/error/empty states, approve mutation, reject mutation with ConfirmDialog (reason textarea), tier dropdown with setTier mutation, pagination controls
- [x] 10.2 Create `src/pages/admin/AdminRegistrations.module.css`
- [x] 10.3 Update `src/pages/Admin.jsx`: add Registrations sidebar link with PendingBadge (`usePendingCount` inline hook), add `<Route path="registrations" element={<AdminRegistrations />} />`

**Dependencies:** Task 4, Task 7

---

## Task 11: Frontend — DealerQueue Migration
- [x] 11.1 Update `src/pages/admin/DealerQueue.jsx`: change verify mutation to call `/admin/dealers/:id/approve` or `/admin/dealers/:id/reject`, display `registrationStatus` tag on each card

**Dependencies:** Task 4

---

## Task 12: Frontend — Dealer-Facing UI Updates (Profile, Catalog, Product)
- [x] 12.1 Update `src/pages/Profile.jsx`: replace discountMultiplier row with `<DealerTierBadge tier={user?.tier} />` in the `isB2B` block
- [x] 12.2 Update `src/pages/Catalog.jsx`: display `product.tierPrice.adjustedPrice` for authenticated dealers in place of standard public price
- [x] 12.3 Update `src/pages/Product.jsx`: render tier price block (`DealerTierBadge`, adjusted price, discount note) for authenticated dealers using `data.tierPrice`

**Dependencies:** Task 6, Task 7
