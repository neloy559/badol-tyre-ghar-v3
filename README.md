# Badol Tyre Ghar (BTG) — v3

> A full-stack B2B product catalog and e-commerce platform for a real tyre wholesale business in Bangladesh.

[![Live](https://img.shields.io/badge/Live-badol--tyre--ghar.vercel.app-blue?style=flat-square)](https://badol-tyre-ghar.vercel.app)
[![Version](https://img.shields.io/badge/version-0.5.0-green?style=flat-square)](https://github.com/neloy559/badol-tyre-ghar-v3/releases)
[![Status](https://img.shields.io/badge/status-active%20development-orange?style=flat-square)]()

---

## What Is This?

BTG v3 is a real client project. A family-owned tyre wholesale business needed to digitize their product catalog, manage dealer relationships, and generate PDF catalogs for field sales reps.

This is not a tutorial project. It has real users, real data, real business requirements.

---

## Tech Stack

### Frontend

| Tech | Why |
|------|-----|
| React 19 + Vite | Latest stable React, fast HMR in dev |
| React Router v7 | Nested routing with lazy loading |
| TanStack Query v5 | Server state, caching, infinite scroll |
| Framer Motion | Page transitions, micro-animations |
| React Hook Form + Zod | Form validation with schema safety |
| Lucide React | Consistent icon system |
| react-pdf/renderer | Client-side PDF generation for catalogs |

### Backend

| Tech | Why |
|------|-----|
| Node.js + Express 5 | Mature, stable, modular architecture |
| MongoDB + Mongoose | Flexible schema for product variants |
| JWT + HTTP-only cookies | Dual-token auth (access 15min + refresh 30d) |
| Cloudinary | CDN-optimized image hosting |
| Multer | Multipart image upload handling |
| express-rate-limit | API abuse prevention |
| Morgan | HTTP request logging in dev |

### Infrastructure

| Tech | Why |
|------|-----|
| Vercel | Frontend + serverless API in one deploy |
| MongoDB Atlas | Cloud-hosted, free tier for current scale |
| Vercel Cron | Nightly PDF regeneration at 3AM BST |

---

## Architecture

```
Browser (React SPA)
    │
    │ /api/v1/* (proxied via vercel.json rewrites)
    ▼
Vercel Serverless Function  ──  api/index.js
    │
    ▼
Express App  ──  backend/src/app.js
    ├── /auth      → Auth Module     (JWT, refresh tokens)
    ├── /products  → Catalog Module  (public)
    ├── /catalog   → Catalog Module  (with auth context)
    ├── /cart      → Inquiry Module
    ├── /admin     → Admin Routes    (protected: admin/editor only)
    └── /branding  → Ops Module      (site config, banners)
    │
    ▼
MongoDB Atlas
```

### Auth Flow — Dual Token + Refresh Mutex

```
1. Login   → access token (15min, in-memory) + refresh token (30d, HTTP-only cookie)
2. Request → Authorization: Bearer <access_token>
3. 401     → Refresh mutex triggers /auth/refresh
4. Refresh → New access token + rotated refresh token
5. Logout  → Refresh token invalidated in DB
```

The refresh mutex prevents multiple concurrent 401s from each triggering a
separate refresh call (race condition fix). Queued requests wait for the
single refresh to complete, then replay with the new token.

---

## Project Structure

```
version-3/
├── src/                          React frontend
│   ├── components/
│   │   ├── atoms/                BTGButton, BTGInput, BTGBadge
│   │   ├── molecules/            LoginForm, RegisterForm, ProductCard
│   │   ├── organisms/            FilterSidebar, FloatingCart, BannerSlider
│   │   └── pdf/                  CatalogDocument (react-pdf)
│   ├── context/                  AuthContext, CartContext
│   ├── hooks/                    useAnalytics, usePdfCache, useSwipeNavigation
│   ├── pages/
│   │   ├── admin/                14 admin modules
│   │   └── Home, Catalog, Product, Cart, Login, Profile, Shops
│   ├── services/                 api.js (axios + interceptors)
│   └── utils/                    constants, cloudinary helpers
│
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── auth/             JWT service, refresh token model
│       │   ├── catalog/          Products, brands, search, PDF, upload
│       │   ├── inquiry/          Cart + CRM system
│       │   ├── marketing/        Campaigns, banners
│       │   ├── ops/              Branding, activity log, analytics
│       │   └── users/            User model, dealer management
│       ├── middleware/           auth, optionalAuth, activityLogger, redirectHandler
│       ├── routes/               admin.js, admin.catalog.js
│       └── utils/                PricingService, sendResponse, searchHelper
│
├── api/
│   ├── index.js                  Vercel serverless entry point
│   └── cron/regenerate-pdfs.js   Nightly cron job
│
└── assets_master/                Source product images (gitignored)
```

---

## Admin Dashboard — 14 Modules

| Module | Status | Description |
|--------|--------|-------------|
| Overview | 🔄 In Progress | API analytics — daily/weekly/monthly hits + top paths |
| Catalog Manager | ✅ Complete | Single product CRUD + bulk CSV upload + image upload |
| Products Manager | ✅ Complete | Visibility/price toggles, bulk operations per category |
| Tags Manager | ✅ Complete | Custom search synonyms per product |
| Search Intelligence | ✅ Complete | Capture user search terms, assign to products/categories |
| PDF Manager | ✅ Complete | Generate + upload category catalogs to Cloudinary |
| Brand Manager | ✅ Complete | Brand CRUD with category assignment |
| Asset Auditor | ✅ Complete | Audit legacy ImgBB vs Cloudinary images |
| Branding Manager | ✅ Complete | Site logo, banners CRUD, WhatsApp config, About photos |
| Dealer Queue | ✅ Complete | Verify/reject dealers, set discount multipliers |
| Inquiry CRM | ✅ Complete | Track inquiries → replied → converted/closed |
| Campaign Manager | ✅ Complete | Create discount campaigns by brand/category/product |
| Bulk Markup | ✅ Complete | Bulk price adjustment (% or fixed amount) |
| Data Export | ✅ Complete | Export full catalog as CSV with auth token |

---

## Key Design Decisions

### Why no price display by default?
Prices are B2B sensitive. The `showPrice` flag per product allows granular
control. Dealers see pricing after admin verification. Public users get
inquiry-only flow via WhatsApp.

### Why cart = WhatsApp inquiry, not checkout?
The business model is wholesale negotiation, not fixed-price e-commerce.
Cart generates a formatted WhatsApp message. After send, the inquiry is
tracked in the CRM with status flow: inquired → replied → converted_to_sale.

### Why client-side PDF generation?
`react-pdf/renderer` runs in the browser. This avoids serverless cold start
timeouts for large catalogs (500+ products). PDFs are uploaded to Cloudinary
after generation for persistent sharing links.

### Why campaign cache with 60s TTL?
Campaign pricing overrides are applied to every product in every list request.
Querying campaigns per request adds a full DB round-trip on every page load.
In-memory cache with 60s TTL balances data freshness vs performance.

### Why Vercel for both frontend and backend?
The API is stateless and low-traffic. Vercel's serverless functions handle
the Express app via `api/index.js`. One deployment config, zero server ops.

---

## Pricing System

Products have variants. Each variant has `pricing.retail` and `pricing.wholesale`.

`PricingService` applies in this order:
1. **Role-based pricing** — customer gets retail, dealer gets wholesale
2. **Dealer discount multiplier** — set per dealer by admin (e.g. 0.95 = 5% off)
3. **Active campaign override** — percentage or fixed discount, date-gated

Applied server-side on every product response. Client never calculates price.

---

## Search System

Search uses MongoDB `$text` index on name, SKU, and searchTags fields.

`searchHelper.js` normalizes Bengali digits to English before querying,
so searching "২.৭৫-১৭" finds the same product as "2.75-17".

Every search term is logged silently (fire-and-forget) to `SearchLog`.
Admin uses Search Intelligence to assign high-frequency zero-result terms
as `searchTags` on relevant products — improving discoverability over time.

---

## Current State (v0.5.0)

### Working
- Product catalog with infinite scroll + advanced filtering (category, brand, size, price, text search)
- Product detail pages with category-specific spec groups
- Admin dashboard — 13/14 modules complete
- JWT auth with refresh token rotation + mutex
- PDF catalog generation + Cloudinary upload + nightly cron
- WhatsApp inquiry flow
- Campaign pricing system with in-memory cache
- Search Intelligence — capture, analyze, assign
- Dealer verification queue

### Pending (toward v1.0.0)

| Feature | Priority | Notes |
|---------|----------|-------|
| Analytics dashboard | High | Backend endpoint added in v0.6.0 |
| User registration flow | High | Register → pending → admin verifies |
| Dealer pricing UI | Medium | Dealers see their negotiated prices |
| Profile page | Medium | Order history, account settings |
| Shops page | Low | Branch locations map |

---

## Branch Strategy

```
main        ← production only. tagged on release.
develop     ← integration. all features merge here first.
feature/*   ← new features (branch from develop)
fix/*       ← bug fixes (branch from develop)
```

Direct push to `main` is not allowed. All changes go through `develop` → PR.

## Versioning (Semantic Versioning)

| Tag | What changed |
|-----|-------------|
| v0.1.0 | Initial project setup |
| v0.2.0 | PDF catalog system complete |
| v0.3.0 | Sprint 1-5 bug fixes complete |
| v0.4.0 | Search Intelligence + category-specific specs |
| v0.5.0 | Admin 13/14 complete, catalog ready, security hardening |
| v1.0.0 | Target: all features, production launch |

## Commit Convention

Follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add refresh token rotation with mutex guard
fix(catalog): correct price filter to use variants.pricing.retail
chore(deps): update react to 19.2.5
refactor(admin): extract ProductTable into standalone component
```

Full guide: `.github/COMMIT_CONVENTION.md`

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (free tier)

### Frontend

```bash
cp .env.example .env
# Set VITE_API_URL and VITE_WHATSAPP_NUMBER
npm install
npm run dev
# Runs at http://localhost:5173
```

### Backend

```bash
cd backend
cp .env.example .env
# Set MONGODB_URI, JWT_SECRET, CLOUDINARY_* keys
npm install
npm run dev
# Runs at http://localhost:5000
```

### Required Environment Variables

**Frontend**
```
VITE_API_URL=http://localhost:5000/api/v1
VITE_WHATSAPP_NUMBER=8801XXXXXXXXX
```

**Backend**
```
MONGODB_URI=
JWT_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RATE_LIMIT_MAX=100
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## About

Built by [FS Neloy](https://www.linkedin.com/in/fsneloy/) —
self-taught full-stack developer from Bangladesh.

This is my primary real-world project. Real client, real data, real constraints.
Every architectural decision here is something I researched, debugged, and shipped.
