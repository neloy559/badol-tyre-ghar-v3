# SOP — BTG (Badol Tyre Ghar) v3

**Type:** Standard Operating Procedure
**Project Status:** v1.0.0 — Production Ready
**Last Updated:** June 2026

---

## 1. PROJECT IDENTITY

| Field | Value |
|-------|-------|
| Full Name | Badol Tyre Ghar (বাদল টায়ার ঘর) |
| Type | B2B Full-Stack Web Platform |
| Client | Real family-owned tyre business, Bangladesh |
| Live URL | https://badol-tyre-ghar.vercel.app |
| GitHub | https://github.com/neloy559/badol-tyre-ghar-v3 |
| Portfolio Role | #1 showcase project — proof of real-world production work |

---

## 2. THE PROBLEM THIS SOLVES

A physical tyre shop has hundreds of SKUs — multiple brands, sizes, and variants. Managing this manually is impossible. Field sales reps visit dealers across the country. Dealers need:
- To browse products without calling the shop every time
- To see their special B2B price (not public)
- Access to downloadable catalogs for their own customers

The owner needs:
- A single place to manage all products
- Control over who sees what price
- A way to track dealers and orders
- Business analytics without spreadsheets

BTG solves all of this in one platform.

---

## 3. ARCHITECTURE

```
┌─────────────────────────────────────────────┐
│              CLIENT LAYER                   │
│   React 19 + Vite                           │
│   TanStack Query │ Framer Motion │ Zod      │
│   Recharts │ react-hook-form                │
│   Deployed: Vercel (CDN)                    │
└──────────────────┬──────────────────────────┘
                   │ HTTPS REST API
┌──────────────────▼──────────────────────────┐
│              API LAYER                      │
│   Node.js + Express 5 (Serverless)          │
│   Vercel Functions                          │
│   JWT Middleware │ Role Guards               │
└──────────────────┬──────────────────────────┘
                   │ Mongoose ODM
┌──────────────────▼──────────────────────────┐
│              DATA LAYER                     │
│   MongoDB Atlas (Cloud)                     │
│   Collections: Products, Brands, Users,     │
│   TierPricingRules, AuditLogs,              │
│   ActivityLogs, RefreshTokens, Campaigns    │
└─────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              MEDIA LAYER                    │
│   Cloudinary CDN                            │
│   Auto-optimize │ Lazy load │ Transformations│
└─────────────────────────────────────────────┘
```

---

## 4. TECH STACK WITH RATIONALE

| Technology | Role | Why |
|-----------|------|-----|
| React 19 + Vite | Frontend | Fast DX, React 19 concurrent features |
| TanStack Query v5 | Server state | Caching, background refetch, loading/error states |
| Zod | Schema validation | Type-safe validation for forms and API inputs |
| Framer Motion | Animations | Smooth UX without custom CSS complexity |
| Recharts | Data visualization | Lightweight, composable charts for analytics dashboard |
| react-hook-form | Form handling | Performant, Zod resolver integration |
| Node.js + Express 5 | Backend API | Express 5 has better async error handling |
| Vercel Functions | Serverless hosting | Free tier, zero DevOps, auto-scaling |
| MongoDB Atlas | Database | Flexible schema for catalog data |
| Mongoose | ODM | Schema enforcement + query helpers |
| JWT (rotation) | Authentication | Stateless, refresh token rotation prevents session fixation |
| Cloudinary | Media CDN | Free tier sufficient, CDN delivery, auto-optimization |

---

## 5. AUTHENTICATION DESIGN

### Flow
```
Login Request
  → Server validates credentials
  → Dealer registrationStatus check (pending/rejected → 403)
  → Issues: Access Token (15min, in Authorization header)
  → Issues: Refresh Token (30d, HTTP-only cookie)
  → Client stores access token in memory only

On Expiry
  → Client hits /auth/refresh with cookie
  → Server validates refresh token
  → Issues NEW access token + NEW refresh token (rotation)
  → Old refresh token is invalidated

Security Layer
  → HTTP-only cookie: JS cannot read refresh token
  → Token rotation: Stolen token is useless after first use
  → Role field in token payload: admin | editor | dealer | customer
  → registrationStatus check: pending/rejected dealers blocked at login
```

### Why Rotation?
Token rotation prevents session fixation attacks. If an attacker steals a refresh token and tries to use it after the legitimate user already rotated it — the server rejects it and can invalidate the entire session family.

---

## 6. USER ROLES & ACCESS MATRIX

| Feature | Public | Dealer (approved) | Dealer (pending) | Admin/Editor |
|---------|--------|-------------------|-----------------|--------------|
| Browse catalog | ✅ | ✅ | ✅ | ✅ |
| See public prices | ✅ | ✅ | ✅ | ✅ |
| See tier-adjusted dealer prices | ❌ | ✅ | ❌ | ✅ |
| Download PDF catalog | ❌ | ✅ | ❌ | ✅ |
| Admin CRM | ❌ | ❌ | ❌ | ✅ |
| Register as dealer | ✅ | — | — | — |

---

## 7. API CONVENTIONS

### Response Shape (always consistent)
```json
// Success
{
  "success": true,
  "data": { "..." },
  "message": "Human readable message",
  "pagination": { "page": 1, "limit": 20, "total": 150 }
}

// Error
{
  "success": false,
  "error": "Human readable error",
  "code": "MACHINE_READABLE_CODE"
}
```

### HTTP Status Codes
| Code | Meaning | When to use |
|------|---------|-------------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation failed (Zod errors) |
| 401 | Unauthorized | No token or expired token |
| 403 | Forbidden | Valid token but wrong role, or dealer pending/rejected |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate (phone already registered) |
| 500 | Server Error | Unexpected — never expose stack trace |

---

## 8. DATA MODELS

### User
```js
{
  phone, password (select:false, bcrypt 12),
  role: 'admin' | 'editor' | 'sales_partner' | 'dealer' | 'customer',
  isVerified, isDeleted,
  discountMultiplier, creditLimit, paymentTerms,
  tier: 'standard' | 'silver' | 'gold' | 'platinum',       // NEW v1.0.0
  registrationStatus: 'pending' | 'approved' | 'rejected', // NEW v1.0.0
  rejectionReason,                                          // NEW v1.0.0
  verificationDetails: { tradeLicense, shopImage, appliedAt },
  profile: { name, shopName, address, district },
  analytics: { deviceType, lastIp, location, lastActive }
}
```

### TierPricingRule (NEW v1.0.0)
```js
{
  tier: 'standard' | 'silver' | 'gold' | 'platinum',  // unique
  discountPercent: 0 | 5 | 10 | 15,
  label: 'Standard' | 'Silver' | 'Gold' | 'Platinum',
  description: String
}
```

Default seed values:
- standard → 0% → "No discount"
- silver → 5% → "5% off public price"
- gold → 10% → "10% off public price"
- platinum → 15% → "15% off public price"

### Product
```js
{
  sku, slug, name,
  brand (ref: Brand), category (ref: Category),
  media: [String],
  commonSpecs: { size, pattern, rim, origin },
  variants: [{ sku, ply, pricing: { retail, wholesale } }],
  meta: { views, inquiries },
  isVisible, showPrice, isDeleted
}
```

---

## 9. DEALER TIER PRICING SYSTEM

### Business Logic
```
Standard → 0%  discount on wholesale price
Silver   → 5%  off wholesale price
Gold     → 10% off wholesale price
Platinum → 15% off wholesale price
```

### TierPricingService
```js
getDealerPrice(publicPrice, tier) → Promise<number>
// 1. Check in-memory cache (60s TTL)
// 2. If miss: TierPricingRule.findOne({ tier })
// 3. adjustedPrice = publicPrice * (1 - discountPercent / 100)
// 4. return Math.round(adjustedPrice * 100) / 100
// 5. Unknown tier → 0% fallback
```

### Where tier price appears
- `GET /api/v1/catalog/:slug` → `tierPrice` field in response (dealer only)
- `GET /api/v1/catalog` → `tierPrice` per product (dealer only)
- `ProductCard.jsx` → shows adjustedPrice for dealers
- `Product.jsx` → shows tier price block with DealerTierBadge
- `Profile.jsx` → shows DealerTierBadge in B2B credit block

---

## 10. REGISTRATION → VERIFICATION FLOW

### User Journey
```
1. Dealer visits /register
2. Fills 6-field form (businessName, ownerName, email, phone, address, password)
3. Account created: role: "dealer", registrationStatus: "pending", isVerified: false
4. Dealer sees: "Your account is under review."

5. Admin sees PendingBadge on /admin/registrations sidebar link
6. Admin reviews → Approve or Reject (with optional reason)
7. On approve: registrationStatus: "approved", isVerified: true
8. On reject: registrationStatus: "rejected", rejectionReason set

9. Dealer login while pending → 403: "Your account is under review."
10. Dealer login after rejection → 403: "Your registration was not approved."
```

### API Endpoints
```
POST   /api/v1/auth/dealer/register          → public, creates pending dealer
GET    /api/v1/admin/dealers/registrations   → paginated list by status
PATCH  /api/v1/admin/dealers/:id/approve     → sets approved + isVerified: true
PATCH  /api/v1/admin/dealers/:id/reject      → sets rejected + rejectionReason
PATCH  /api/v1/admin/dealers/:id/tier        → sets tier enum
```

---

## 11. ANALYTICS DASHBOARD

### Backend: GET /api/v1/admin/analytics/summary

All 7 queries run in parallel via `Promise.all`:

| Query | Model | Operation |
|-------|-------|-----------|
| totalProducts | Product | countDocuments({ isDeleted: false }) |
| totalDealers | User | countDocuments({ role: 'dealer', isDeleted: false }) |
| activeDealers | User | countDocuments({ role: 'dealer', registrationStatus: 'approved' }) |
| totalOrders | — | hardcoded 0 (placeholder) |
| productsByBrand | Product | aggregate: group by brand → lookup name → sort desc |
| dealerRegistrations | User | aggregate: group by date (last 30 days) + gap-fill to 30 entries |
| topViewedProducts | Product | find sorted by meta.views desc, limit 5 |
| recentActivity | AuditLog | find sorted by createdAt desc, limit 10, populate adminId |

### Frontend: DashboardHome.jsx
- TanStack Query `queryKey: ['analytics-summary']`, staleTime: 60s
- Skeleton layout (shimmer) while loading
- Error state with retry button
- 4 KPI cards + Recharts BarChart (brands) + Recharts LineChart (registrations)
- Top products table + Admin activity feed

---

## 12. ADMIN MODULES (15 total)

| Module | Route | Description |
|--------|-------|-------------|
| Overview | /admin | Analytics dashboard — KPIs, charts, feed |
| Catalog Manager | /admin/catalog | Single product CRUD + bulk CSV |
| Products Manager | /admin/products | Visibility/price toggles per category |
| Tags Manager | /admin/tags | Search synonyms per product |
| Search Intelligence | /admin/search-intel | Capture + assign search terms |
| PDF Catalogs | /admin/pdf | Generate + upload to Cloudinary |
| Brand Manager | /admin/brands | Brand CRUD |
| Asset Auditor | /admin/auditor | Image host audit (ImgBB vs Cloudinary) |
| Branding Manager | /admin/branding | Logo, banners, WhatsApp config |
| Dealer Queue | /admin/dealers | Legacy dealer verification queue |
| **Registrations** | /admin/registrations | **NEW** Approve/reject + tier assignment |
| Inquiries CRM | /admin/inquiries | Track inquiries → converted |
| Campaign Manager | /admin/campaigns | Discount campaigns by brand/category |
| Bulk Markup | /admin/markup | Bulk price adjustment |
| Data Export | /admin/export | CSV catalog export |

---

## 13. QUALITY STANDARDS — NEVER SKIP

1. Zod validation on every API input before DB operation
2. Try/catch on every async route handler
3. Role + status check on every protected route
4. Loading + error + empty states on every list/form
5. ConfirmDialog before any destructive action (reject, delete)
6. Paginate all list endpoints (default limit=20)
7. Never return `password` field in any API response
8. Import only required Recharts components (tree-shaking)

---

## 14. PROJECT STRUCTURE SUMMARY

```
backend/src/
├── modules/
│   ├── auth/           auth.controller, auth.routes, refreshToken.model
│   ├── catalog/        catalog.controller, catalog.admin.controller, models/
│   ├── ops/            analytics.admin.controller, models/ (AuditLog, ActivityLog)
│   └── users/          user.model, user.admin.controller, tierPricing.model
├── routes/             admin.js, admin.catalog.js
├── scripts/            seedTierPricing.js
└── utils/              TierPricingService, PricingService, sendResponse

src/
├── components/
│   ├── molecules/      ProductCard (tierPrice-aware), LoginForm, RegisterForm
│   └── ui/             ConfirmDialog, DealerTierBadge
├── pages/
│   ├── admin/          DashboardHome, AdminRegistrations, DealerQueue, + 12 more
│   ├── Register.jsx    (NEW) public dealer registration
│   ├── Profile.jsx     (updated) DealerTierBadge
│   ├── Catalog.jsx     uses ProductCard with tierPrice
│   └── Product.jsx     (updated) tier price block
├── services/           api.js (axios + refresh mutex)
└── context/            AuthContext, CartContext
```

---

## 15. WHAT THIS PROVES TO AN EMPLOYER

| Skill | Evidence |
|-------|---------|
| Full-stack architecture | React ↔ Express API ↔ MongoDB |
| Authentication security | JWT rotation, HTTP-only cookies, role guards, registration status gating |
| Real client work | Actual business, actual users, actual constraints |
| Admin system complexity | 15-module CRM |
| Business workflow design | Registration → approval → tiered access → tier-adjusted pricing |
| PDF generation | Dealer catalog automation |
| Data analytics | MongoDB aggregation pipelines, Recharts visualization |
| API design | RESTful, consistent response shape, proper status codes |
| Production deployment | Live on Vercel, real traffic |

---

## 16. WHAT COMES AFTER BTG

1. **BTG v1.0.0** ← Done ✅
2. Portfolio website (fsneloy.vercel.app) — all content + design already planned
3. AI Micro-SaaS project — OpenAI API integration
4. SaaS Dashboard Boilerplate — Next.js + Prisma + PostgreSQL
5. Job applications + Fiverr/Upwork setup

BTG is the launchpad. Every line written here is an investment in the first paid opportunity.

---

## 17. CONTEXT: WHO IS BUILDING THIS

FS Neloy is a self-taught developer from Bangladesh. This is his #1 portfolio project. He uses Kiro (AI IDE) to build — AI accelerates him, but he makes all decisions.

**His skill level:**
- Strong: React, Node/Express, MongoDB CRUD, JWT, Cloudinary, Vercel
- Moderate: TypeScript (not advanced patterns), TanStack Query, Zod, Recharts
- Learning: Architecture decisions, testing, CI/CD
- Not yet: Docker, PostgreSQL, AI API integration

**Working with him:**
- Give atomic, one-at-a-time tasks
- Always explain WHY before writing code
- When something breaks — explain what broke and why
- Always read existing code before writing new code
- This project will be shown to employers and clients — treat every line seriously
