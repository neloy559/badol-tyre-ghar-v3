# Design Document — BTG v4 Rebuild

## Overview

BTG v4 is a ground-up rebuild of the Badol Tyre Ghar B2B/B2C product catalog and ERP/CRM platform. The system serves three principal user groups—admin/editor staff, approved dealers, and public customers—over a React 19 + Vite SPA frontend and a Node.js + Express serverless API backend, both deployed to Vercel. The rebuild removes all prohibited dependencies, establishes a locked-in monorepo structure, and encodes every architectural decision as an enforceable pattern.

### Key Design Goals

- **Zero prohibited libraries**: strict approved-list enforcement at the package.json level.
- **Server-side pricing only**: no pricing logic on the client; every price is computed and returned by the backend.
- **Single sources of truth**: `discountMap` in `tierPricingService`, `isDealer` in `AuthContext`, `usePdfDownload` shared across pages, all constants in `constants.js`.
- **Consistent response shape**: every API response uses `sendResponse` → `{ success, message, data }`.
- **KISS + DRY**: one hook per concern, one utility per concern, no logic duplication.

---

## Architecture

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Vercel CDN / Edge                           │
│                                                                     │
│  ┌───────────────────────────┐   ┌──────────────────────────────┐  │
│  │   Frontend (React 19/Vite)│   │  Backend (Node/Express λ)    │  │
│  │   /frontend/dist          │   │  /api/index.js               │  │
│  │                           │   │                              │  │
│  │  ┌─────────────────────┐  │   │  ┌────────────────────────┐ │  │
│  │  │  React Router DOM   │  │   │  │  Express Router        │ │  │
│  │  │  AuthContext        │  │   │  │  /api/v1/...           │ │  │
│  │  │  CartContext        │  │   │  └──────────┬─────────────┘ │  │
│  │  │  src/services/api   │  │   │             │               │  │
│  │  └──────────┬──────────┘  │   │  ┌──────────▼─────────────┐ │  │
│  │             │             │   │  │  Middleware Stack       │ │  │
│  │      fetch()│             │   │  │  cors, cookieParser,    │ │  │
│  │             │             │   │  │  rateLimiter, auth,     │ │  │
│  └─────────────│─────────────┘   │  │  activityLogger        │ │  │
│                │                 │  └──────────┬─────────────┘ │  │
│                │ HTTPS REST      │             │               │  │
│                └─────────────────►  ┌──────────▼─────────────┐ │  │
│                                 │  │  Modules                │ │  │
│                                 │  │  auth / catalog /       │ │  │
│                                 │  │  users / media /        │ │  │
│                                 │  │  notifications /        │ │  │
│                                 │  │  campaigns / inquiries  │ │  │
│                                 │  └──────────┬─────────────┘ │  │
│                                 │             │               │  │
│                                 │  ┌──────────▼─────────────┐ │  │
│                                 │  │  Utils                  │ │  │
│                                 │  │  pricingService         │ │  │
│                                 │  │  tierPricingService     │ │  │
│                                 │  │  sendResponse           │ │  │
│                                 │  └──────────┬─────────────┘ │  │
│                                 └─────────────│───────────────┘  │
└─────────────────────────────────│─────────────────────────────────┘
                                  │
                        ┌─────────▼──────────┐
                        │   MongoDB Atlas    │
                        │  14 Collections    │
                        │  + Cloudinary CDN  │
                        └────────────────────┘
```

### Request Lifecycle

```
Client Request
     │
     ▼
Vercel Edge (routes /api/* → serverless fn, rest → frontend/dist)
     │
     ▼
api/index.js  (exports Express app, no business logic)
     │
     ▼
Middleware Chain:
  1. cors()              — allow FRONTEND_URL origin
  2. cookieParser()      — parse refresh token cookie
  3. rateLimiter()       — IP-based Map throttle (auth routes only)
  4. auth / optionalAuth — verify JWT, attach req.user
  5. restrictTo(roles)   — role gate (route-level)
  6. activityLogger()    — write AuditLog on mutating requests
     │
     ▼
Route Handler (controller.js)
  1. Validate input (native if/else)
  2. Call service.js
  3. sendResponse(res, ...)
     │
     ▼
Service Layer (service.js)
  1. Mongoose queries
  2. pricingService / tierPricingService
  3. Cloudinary SDK calls
     │
     ▼
MongoDB Atlas / Cloudinary
```

### Vercel Deployment Topology

```
vercel.json
├── rewrites[0]: /api/:path* → api/index.js  (serverless function)
└── rewrites[1]: /:path*     → /index.html   (SPA fallback)

Root
├── frontend/   (Vite build → frontend/dist)
├── backend/    (source; consumed by api/index.js)
└── api/
    ├── index.js          (serverless entry — exports app)
    └── cron/
        └── regenerate-pdfs.js  (Vercel cron job)
```

---

## Components and Interfaces

### Frontend File Structure

```
frontend/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx                       # React root, context providers
    ├── App.jsx                        # Router, route guards
    ├── styles/
    │   ├── variables.css              # CSS custom properties (colors, spacing, fonts)
    │   └── global.css                 # Reset + base typography only
    ├── utils/
    │   ├── constants.js               # ALL hardcoded values (API paths, limits, defaults)
    │   ├── validators.js              # Phone/password/field validators (pure functions)
    │   ├── formatters.js              # Price, date, number formatters
    │   └── sounds.js                  # playSound() utility
    ├── services/
    │   └── api.js                     # Fetch wrapper: auth header, 401 retry, error parse
    ├── context/
    │   ├── AuthContext.jsx            # user, accessToken, login(), logout(), isDealer
    │   └── CartContext.jsx            # cart items, addToCart(), removeFromCart(), clear()
    ├── hooks/
    │   ├── useFetch.js                # Generic GET hook: { data, loading, error, refetch }
    │   ├── usePdfDownload.js          # PDF cache + generate (shared by Home + Catalog)
    │   ├── useNotifications.js        # Poll unread count every 30s
    │   └── usePasswordStrength.js     # Returns "weak" | "medium" | "strong"
    ├── components/
    │   ├── layout/
    │   │   ├── Navbar/
    │   │   │   ├── Navbar.jsx
    │   │   │   └── Navbar.module.css
    │   │   ├── Footer/
    │   │   │   ├── Footer.jsx
    │   │   │   └── Footer.module.css
    │   │   └── AdminLayout/
    │   │       ├── AdminLayout.jsx
    │   │       └── AdminLayout.module.css
    │   ├── ui/
    │   │   ├── Button/
    │   │   ├── Input/
    │   │   ├── Modal/
    │   │   ├── Badge/
    │   │   ├── Spinner/
    │   │   ├── SkeletonCard/
    │   │   ├── Pagination/
    │   │   └── ToggleSwitch/
    │   ├── auth/
    │   │   ├── ProtectedRoute.jsx     # Redirect if not authenticated
    │   │   └── RoleGate.jsx           # Redirect if wrong role
    │   ├── catalog/
    │   │   ├── ProductCard/
    │   │   ├── ProductGrid/
    │   │   ├── FilterSidebar/
    │   │   └── VariantTable/
    │   ├── notifications/
    │   │   └── NotificationBell/
    │   │       ├── NotificationBell.jsx
    │   │       └── NotificationBell.module.css
    │   └── pdf/
    │       └── CatalogDocument.jsx    # @react-pdf/renderer document
    └── pages/
        ├── public/
        │   ├── Home/
        │   ├── Catalog/
        │   ├── ProductDetail/
        │   └── Contact/
        ├── auth/
        │   ├── Login/
        │   └── Register/
        ├── dealer/
        │   └── Profile/
        └── admin/
            ├── Dashboard/
            ├── Products/
            ├── Categories/
            ├── Brands/
            ├── Campaigns/
            ├── Dealers/
            ├── Registrations/
            ├── Inquiries/
            ├── Media/
            ├── SearchIntel/
            ├── Notifications/
            ├── SiteConfig/
            ├── Analytics/
            ├── BulkMarkup/
            └── PdfManager/
```

### Backend File Structure

```
backend/
├── package.json
├── src/
│   ├── app.js                        # Express app setup (no listen)
│   ├── routes/
│   │   ├── index.js                  # Public + user routes
│   │   └── admin.js                  # Admin routes (restrictTo admin/editor)
│   ├── middleware/
│   │   ├── auth.js                   # protect(), restrictTo(), optionalAuth()
│   │   ├── rateLimiter.js            # Map-based IP rate limiter
│   │   └── activityLogger.js         # AuditLog writer for mutating requests
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── RefreshToken.model.js
│   │   ├── catalog/
│   │   │   ├── catalog.routes.js
│   │   │   ├── catalog.controller.js
│   │   │   ├── catalog.service.js
│   │   │   ├── Product.model.js
│   │   │   ├── Category.model.js
│   │   │   ├── Brand.model.js
│   │   │   ├── SearchLog.model.js
│   │   │   ├── Inquiry.model.js
│   │   │   └── Campaign.model.js
│   │   ├── users/
│   │   │   ├── users.routes.js
│   │   │   ├── users.controller.js
│   │   │   ├── users.service.js
│   │   │   └── User.model.js
│   │   ├── media/
│   │   │   ├── media.routes.js
│   │   │   ├── media.controller.js
│   │   │   ├── media.service.js
│   │   │   └── MediaAsset.model.js
│   │   ├── notifications/
│   │   │   ├── notifications.routes.js
│   │   │   ├── notifications.controller.js
│   │   │   ├── notifications.service.js
│   │   │   └── Notification.model.js
│   │   └── siteConfig/
│   │       ├── siteConfig.routes.js
│   │       ├── siteConfig.controller.js
│   │       └── SiteConfig.model.js
│   └── utils/
│       ├── sendResponse.js           # { success, message, data } shape
│       ├── pricingService.js         # Price computation orchestrator
│       ├── tierPricingService.js     # discountMap + 60s cache
│       ├── auditLogger.js            # createAuditLog() helper
│       └── AuditLog.model.js
api/
├── index.js                          # require('../backend/src/app') — exports app
└── cron/
    └── regenerate-pdfs.js
```

### Route → Module Mapping

| Path Prefix | Module | Auth Guard |
|---|---|---|
| `POST /api/v1/auth/*` | auth | rateLimiter (login/register) |
| `GET /api/v1/catalog*` | catalog | optionalAuth |
| `POST /api/v1/inquiries` | catalog | optionalAuth |
| `GET /api/v1/site-config` | siteConfig | none |
| `GET /api/v1/auth/me` | auth | protect |
| `POST /api/v1/auth/logout` | auth | protect |
| `GET /api/v1/admin/analytics/*` | users | protect + admin|editor |
| `GET/PATCH /api/v1/admin/catalog/*` | catalog | protect + admin|editor |
| `GET/PATCH /api/v1/admin/dealers/*` | users | protect + admin |
| `* /api/v1/admin/campaigns/*` | catalog | protect + admin |
| `* /api/v1/admin/media/*` | media | protect + admin|editor |
| `* /api/v1/admin/notifications/*` | notifications | protect + admin |
| `PATCH /api/v1/admin/site-config` | siteConfig | protect + admin |

---

## Data Models

### 1. User

```js
// backend/src/modules/users/User.model.js
{
  _id: ObjectId,
  phone: { type: String, unique: true, required: true },
  password: { type: String, required: true },          // bcrypt hash
  role: { type: String, enum: ['admin','editor','dealer','customer'], default: 'customer' },
  registrationStatus: { type: String, enum: ['approved','pending','rejected'], default: 'approved' },
  isVerified: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  tier: { type: String, enum: ['standard','silver','gold','platinum'], default: 'standard' },
  discountMultiplier: { type: Number, default: 0 },    // extra % on top of tier
  rejectionReason: { type: String, default: '' },
  profile: {
    name: { type: String, required: true },
    businessName: { type: String, default: '' },
    ownerName: { type: String, default: '' },
    address: { type: String, default: '' },
    avatar: { type: String, default: '' },
  },
  createdAt: Date,
  updatedAt: Date
}
// Index: { phone: 1 }, { role: 1, registrationStatus: 1 }
```

### 2. RefreshToken

```js
// backend/src/modules/auth/RefreshToken.model.js
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },   // SHA-256 of the raw token
  isRevoked: { type: Boolean, default: false },
  deviceInfo: { type: String, default: '' },
  expiresAt: { type: Date, required: true },
  createdAt: Date
}
// Index: { userId: 1 }, { tokenHash: 1 }, TTL index on expiresAt
```

### 3. Product

```js
// backend/src/modules/catalog/Product.model.js
{
  _id: ObjectId,
  name: { type: String, required: true },
  slug: { type: String, unique: true, required: true },
  sku: { type: String, unique: true, required: true },
  category: { type: ObjectId, ref: 'Category', required: true },
  brand: { type: ObjectId, ref: 'Brand', required: true },
  images: [{ type: String }],                          // Cloudinary URLs
  specs: {
    size: String,
    pattern: String,
    rim: String,
    origin: String
  },
  variants: [{
    sku: { type: String, required: true },
    ply: { type: Number },
    retailPrice: { type: Number, required: true },
    wholesalePrice: { type: Number, required: true },
    stock: { type: Number, default: 0 }
  }],
  isVisible: { type: Boolean, default: true },
  showPrice: { type: Boolean, default: false },
  searchTags: [{ type: String }],
  viewCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  createdAt: Date,
  updatedAt: Date
}
// Index: { slug: 1 }, { sku: 1 }, { category: 1 }, { brand: 1 },
//        { isVisible: 1, isDeleted: 1 }, text index on { name, sku, 'specs.size', 'specs.pattern', searchTags }
```

### 4. Category

```js
// backend/src/modules/catalog/Category.model.js
{
  _id: ObjectId,
  name: { type: String, required: true },
  slug: { type: String, unique: true, required: true },
  parentCategory: { type: ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  createdAt: Date,
  updatedAt: Date
}
```

### 5. Brand

```js
// backend/src/modules/catalog/Brand.model.js
{
  _id: ObjectId,
  name: { type: String, required: true },
  slug: { type: String, unique: true, required: true },
  logo: { type: String, default: '' },       // Cloudinary URL
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

### 6. Campaign

```js
// backend/src/modules/catalog/Campaign.model.js
{
  _id: ObjectId,
  name: { type: String, required: true },
  type: { type: String, enum: ['percent', 'flat'], required: true },
  value: { type: Number, required: true },
  appliesTo: {
    products: [{ type: ObjectId, ref: 'Product' }],
    categories: [{ type: ObjectId, ref: 'Category' }],
    brands: [{ type: ObjectId, ref: 'Brand' }]
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdAt: Date,
  updatedAt: Date
}
// Index: { isActive: 1, isDeleted: 1, endDate: 1 }
```

### 7. Inquiry

```js
// backend/src/modules/catalog/Inquiry.model.js
{
  _id: ObjectId,
  user: { type: ObjectId, ref: 'User', default: null },
  items: [{
    productId: { type: ObjectId, ref: 'Product' },
    variantSku: String,
    quantity: Number
  }],
  status: { type: String, enum: ['inquired', 'replied', 'converted'], default: 'inquired' },
  whatsappMessage: { type: String },
  adminNote: { type: String, default: '' },
  createdAt: Date,
  updatedAt: Date
}
// Index: { status: 1 }, { createdAt: -1 }
```

### 8. SearchLog

```js
// backend/src/modules/catalog/SearchLog.model.js
{
  _id: ObjectId,
  term: { type: String, unique: true, required: true },
  count: { type: Number, default: 1 },
  lastSearchedAt: { type: Date, default: Date.now },
  resultCount: { type: Number, default: 0 }
}
// Index: { term: 1 }, { count: -1 }
```

### 9. MediaAsset

```js
// backend/src/modules/media/MediaAsset.model.js
{
  _id: ObjectId,
  filename: { type: String, required: true },
  cloudinaryUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  type: { type: String, enum: ['product', 'logo', 'banner', 'other'], default: 'other' },
  uploadedBy: { type: ObjectId, ref: 'User', required: true },
  size: { type: Number },                 // bytes
  format: { type: String },              // jpeg | png | webp
  createdAt: Date
}
// Index: { type: 1 }, { createdAt: -1 }
```

### 10. Notification

```js
// backend/src/modules/notifications/Notification.model.js
{
  _id: ObjectId,
  recipientId: { type: ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['dealer_application', 'new_inquiry', 'low_stock', 'system'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}
// Index: { recipientId: 1, isRead: 1 }, { createdAt: -1 }
```

### 11. SiteConfig

```js
// backend/src/modules/siteConfig/SiteConfig.model.js
{
  _id: ObjectId,
  branding: {
    logo: { type: String, default: '' },
    siteName: { type: String, default: 'Badol Tyre Ghar' },
    slogan: { type: String, default: '' }
  },
  contact: {
    whatsapp: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  social: { type: Map, of: String, default: {} },
  updatedAt: Date
}
// Single document — seeded on first deploy, always upserted via findOneAndUpdate
```

### 12. AuditLog

```js
// backend/src/utils/AuditLog.model.js
{
  _id: ObjectId,
  adminId: { type: ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },   // e.g. "PRODUCT_UPDATE", "TIER_CHANGE"
  targetId: { type: ObjectId },
  details: { type: Object, default: {} },     // { old: {}, new: {} } snapshots
  createdAt: { type: Date, default: Date.now }
}
// Index: { adminId: 1 }, { createdAt: -1 }
// NO update/delete endpoints exposed — append-only
```

### 13. TierPricingRule (optional override)

```js
// Stored in MongoDB; supersedes discountMap defaults when present
{
  _id: ObjectId,
  tier: { type: String, enum: ['standard', 'silver', 'gold', 'platinum'], unique: true },
  discountPercent: { type: Number, min: 0, max: 100 },
  updatedAt: Date
}
```

### 14. RefreshToken (see §2 above)

All 14 collections: `users`, `refreshtokens`, `products`, `categories`, `brands`, `campaigns`, `inquiries`, `searchlogs`, `mediaassets`, `notifications`, `siteconfigs`, `auditlogs`, `tierpricingrules`, and optionally `pdfrequests` for cron tracking.

---

## Authentication Flow Design

### Registration Flow

```
Visitor
  │
  ├─[customer]─► POST /api/v1/auth/register
  │               { name, phone, password }
  │
  └─[dealer]──► POST /api/v1/auth/dealer/register
                { businessName, ownerName, phone, address, password }

Auth Service:
  1. Validate fields (if/else — no zod)
  2. Check phone uniqueness → 409 if exists
  3. Hash: bcrypt.hash(PASSWORD_PEPPER + password, 12)
  4. Create User document
  5. If dealer: Notification_Service.create({ type: 'dealer_application', ... }) for all admins
  6. issueTokenPair(userId):
     a. accessToken = jwt.sign({ userId, role, registrationStatus }, JWT_SECRET, { expiresIn: '15m' })
     b. rawRefresh = crypto.randomBytes(64).toString('hex')
     c. tokenHash = crypto.createHash('sha256').update(rawRefresh).digest('hex')
     d. Save RefreshToken { userId, tokenHash, expiresAt: +30d, deviceInfo }
     e. Set HTTP-only cookie: refreshToken=rawRefresh; HttpOnly; Secure; SameSite=Strict
  7. Return 201 { accessToken, user: { _id, role, registrationStatus, tier, profile } }
```

### Login Flow

```
POST /api/v1/auth/login  { phone, password }
  │
  1. Find user by phone
  2. If not found → 401 "Invalid credentials."
  3. If isDeleted → 403 "Account has been deactivated."
  4. If dealer + pending → 403 "Your account is under review."
  5. If dealer + rejected → 403 "Your registration was not approved."
  6. bcrypt.compare(PASSWORD_PEPPER + password, user.password)
  7. If no match → 401 "Invalid credentials."
  8. issueTokenPair(userId) — same as registration step 6
  9. Return 200 { accessToken, user }
```

### Token Refresh and Rotation

```
POST /api/v1/auth/refresh  (cookie: refreshToken=<rawToken>)
  │
  1. Read cookie → rawToken
  2. tokenHash = sha256(rawToken)
  3. Find RefreshToken by tokenHash
  4. If not found → 401
  5. If isRevoked → REVOKE ALL tokens for userId → 401 (theft detection)
  6. If expiresAt < now → 401
  7. Mark old RefreshToken isRevoked: true
  8. issueTokenPair(userId) — creates new token pair
  9. Return 200 { accessToken }
```

### Frontend Token Management (api.js)

```js
// src/services/api.js — pseudo-code
let accessToken = null;  // in-memory only

async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res = await fetch(VITE_API_URL + url, { ...options, headers, credentials: 'include' });

  if (res.status === 401) {
    // Single retry: attempt token refresh
    const refreshRes = await fetch(VITE_API_URL + '/api/v1/auth/refresh', {
      method: 'POST', credentials: 'include'
    });
    if (refreshRes.ok) {
      const { data } = await refreshRes.json();
      accessToken = data.accessToken;
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(VITE_API_URL + url, { ...options, headers, credentials: 'include' });
    } else {
      // Refresh failed → force logout
      accessToken = null;
      AuthContext.logout();
      return;
    }
  }
  return res;
}
```

### AuthContext State Shape

```js
// src/context/AuthContext.jsx
const AuthContext = {
  user: null | { _id, role, registrationStatus, tier, profile, phone },
  accessToken: null | String,   // in-memory; never in localStorage
  isDealer: computed once here as user?.role === 'dealer' && user?.registrationStatus === 'approved',
  login(accessToken, user),
  logout(),
  refreshUser()   // calls GET /api/v1/auth/me to re-sync
}
```

---

## Pricing Computation Flow

```
Approved Dealer requests GET /api/v1/catalog
        │
        ▼
catalog.controller.js
  → catalog.service.getProducts(filters, req.user)
        │
        ▼
For each product variant:
  pricingService.computePrice(variant, user, activeCampaigns)
        │
        ├─ 1. basePrice = user.role === 'dealer' ? variant.wholesalePrice : variant.retailPrice
        │
        ├─ 2. Apply user.discountMultiplier (if > 0)
        │       basePrice = basePrice * (1 - discountMultiplier / 100)
        │
        ├─ 3. tierMultiplier = tierPricingService.getMultiplier(user.tier)
        │       tierPricingService.discountMap = { standard:0, silver:5, gold:10, platinum:15 }
        │       (DB override with 60s cache; fallback to discountMap on error)
        │       basePrice = basePrice * (1 - tierMultiplier / 100)
        │
        ├─ 4. Find applicable campaigns for this variant's product/category/brand
        │       filter: isActive:true, isDeleted:false, endDate > now
        │       pick campaign with highest effective discount
        │       if type === 'percent': basePrice = basePrice * (1 - campaign.value / 100)
        │       if type === 'flat': basePrice = basePrice - campaign.value
        │
        └─ 5. tierPrice = Math.round(basePrice * 100) / 100
               (never negative: Math.max(0, ...))

Response variant: { sku, ply, stock, tierPrice }
  — retailPrice and wholesalePrice NEVER sent to client
```

### tierPricingService.js (module-level cache)

```js
// backend/src/utils/tierPricingService.js
const discountMap = { standard: 0, silver: 5, gold: 10, platinum: 15 };  // single definition

let cache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

async function getDiscountPercent(tier) {
  const now = Date.now();
  if (!cache || now - cacheTimestamp > CACHE_TTL) {
    try {
      const rules = await TierPricingRule.find({});
      cache = {};
      rules.forEach(r => { cache[r.tier] = r.discountPercent; });
      cacheTimestamp = now;
    } catch (err) {
      console.warn('[tierPricingService] DB unreachable, using discountMap defaults');
      cache = { ...discountMap };
    }
  }
  if (!(tier in discountMap)) {
    console.warn(`[tierPricingService] Unknown tier: ${tier}, applying 0%`);
    return 0;
  }
  return cache[tier] ?? discountMap[tier];
}

module.exports = { discountMap, getDiscountPercent };
```

---

## Notification Polling Design

```
Admin user authenticated
        │
        ▼
NotificationBell mounts
  useNotifications() hook initializes:
    ├─ state: { count: 0, notifications: [] }
    ├─ fetchUnreadCount() → GET /api/v1/admin/notifications/unread-count
    └─ setInterval(fetchUnreadCount, 30_000)   ← 30-second poll

On each tick:
  newCount = response.data.count
  if newCount > prevCount → playSound()    // sounds.js utility
  setCount(newCount)

On unmount:
  clearInterval(intervalId)               ← cleanup to prevent memory leak

Bell click:
  → fetch GET /api/v1/admin/notifications  (50 most recent)
  → render dropdown with 10 most recent

Notification click:
  → PATCH /api/v1/admin/notifications/:id/read
  → navigate(notification.link) if link exists
  → refetch count
```

### useNotifications Hook

```js
// src/hooks/useNotifications.js
function useNotifications() {
  const [count, setCount] = useState(0);
  const [prevCount, setPrevCount] = useState(0);
  const { accessToken } = useContext(AuthContext);

  useEffect(() => {
    if (!accessToken) return;

    const fetchCount = async () => {
      const res = await api.get('/api/v1/admin/notifications/unread-count');
      if (res.ok) {
        const { data } = await res.json();
        setCount(prev => {
          if (data.count > prev) playSound('notification');
          return data.count;
        });
      }
    };

    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [accessToken]);

  return { count };
}
```

---

## Custom Hook Patterns

### useFetch

```js
// src/hooks/useFetch.js
// Generic data-fetching hook — no react-query
function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      if (!res.ok) throw new Error((await res.json()).message);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { fetchData(); }, [fetchData, ...deps]);

  return { data, loading, error, refetch: fetchData };
}
```

### usePdfDownload

```js
// src/hooks/usePdfDownload.js
// Shared by Home page and Catalog page
function usePdfDownload() {
  const [generating, setGenerating] = useState(false);
  const { user } = useContext(AuthContext);

  const CACHE_KEY = 'btg_pdf_cache';
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  const download = async () => {
    if (!user || user.role !== 'dealer' || user.registrationStatus !== 'approved') return;

    // 1. Check localStorage cache
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      triggerDownload(cached.blob);  // serve from cache
      return;
    }

    // 2. Fetch catalog data from API
    setGenerating(true);
    try {
      const res = await api.get('/api/v1/catalog?limit=500');
      const { data: products } = await res.json();

      // 3. Generate PDF using @react-pdf/renderer
      const blob = await pdf(<CatalogDocument products={products} user={user} />).toBlob();

      // 4. Cache in localStorage
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ blob: reader.result, timestamp: Date.now() }));
      };
      triggerDownload(blob);
    } finally {
      setGenerating(false);
    }
  };

  return { download, generating };
}
```

### usePasswordStrength

```js
// src/hooks/usePasswordStrength.js
function usePasswordStrength(password) {
  const strength = useMemo(() => {
    if (!password || password.length < 6) return 'weak';
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*]/.test(password);
    const isLong = password.length >= 10;

    const score = [hasUpper, hasNumber, hasSpecial, isLong].filter(Boolean).length;
    if (score <= 1) return 'weak';
    if (score <= 2) return 'medium';
    return 'strong';
  }, [password]);

  return strength;   // 'weak' | 'medium' | 'strong'
}
```

---

## State Management Approach

### AuthContext

```
src/context/AuthContext.jsx

Provider state:
  user          — { _id, role, registrationStatus, tier, profile, phone } | null
  accessToken   — String | null  (in-memory ONLY — never localStorage/sessionStorage)
  loading       — Boolean (true while bootstrapping from /auth/me on app load)

Derived (computed once in context):
  isDealer = user?.role === 'dealer' && user?.registrationStatus === 'approved'

Bootstrap on mount:
  POST /api/v1/auth/refresh (sends cookie) → get accessToken → GET /api/v1/auth/me → set user

Exported: { user, accessToken, isDealer, loading, login, logout, refreshUser }
```

### CartContext

```
src/context/CartContext.jsx

Provider state:
  items — [{ productId, productName, variantSku, ply, quantity, tierPrice }]

All state lives in memory (no persistence needed — cart is inquiry-only, not checkout)

Exported: { items, addToCart(item), removeFromCart(variantSku), updateQty(variantSku, qty), clear(), itemCount }
```

### Route Guards

```jsx
// src/components/auth/ProtectedRoute.jsx
function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// src/components/auth/RoleGate.jsx
function RoleGate({ allowedRoles, children }) {
  const { user } = useContext(AuthContext);
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
```

---

## CSS Module Naming Conventions

Every component has exactly one `.module.css` file. Class names use camelCase.

```
ComponentName.module.css
  .container       — outermost wrapper
  .header          — section header
  .body            — main content area
  .footer          — bottom section
  .title           — heading text
  .subtitle        — secondary text
  .label           — form labels
  .input           — form inputs
  .button          — primary action button
  .buttonSecondary — secondary action button
  .badge           — status badge
  .card            — card container
  .cardHeader      — card top section
  .icon            — icon wrapper
  .loading         — loading state
  .error           — error state
  .empty           — empty state
  .active          — active/selected modifier
  .disabled        — disabled state
```

Global files are strictly limited:
- `variables.css` — CSS custom properties: `--color-primary`, `--color-bg`, `--spacing-sm`, etc.
- `global.css` — box-sizing reset, base font, body background; nothing else.

No inline styles. No `style={}` props. No styled-components.

---

## Rate Limiter Implementation

```js
// backend/src/middleware/rateLimiter.js
// Map-based, no external library

const store = new Map();
// store structure: { [ip]: { count: Number, windowStart: Number } }

function createRateLimiter({ maxRequests, windowMs, message }) {
  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now - entry.windowStart > windowMs) {
      // New window
      store.set(ip, { count: 1, windowStart: now });
      return next();
    }

    entry.count += 1;
    if (entry.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message,
        data: null
      });
    }
    next();
  };
}

// Periodic cleanup — prevent unbounded Map growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store.entries()) {
    if (now - entry.windowStart > 60 * 60 * 1000) {  // 1 hour
      store.delete(ip);
    }
  }
}, 10 * 60 * 1000);  // every 10 minutes

// Pre-configured limiters
const loginLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests. Please try again later.'
});

const registerLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests. Please try again later.'
});

module.exports = { loginLimiter, registerLimiter };
```

---

## Error Handling Patterns

### Backend

Every controller follows the same try/catch structure:

```js
// Pattern enforced in ALL controllers
async function doSomething(req, res) {
  try {
    // 1. Validate inputs (native if/else — before any DB call)
    if (!req.body.name) {
      return sendResponse(res, 400, false, 'Name is required.', null);
    }

    // 2. Business logic / DB queries
    const result = await someService.doWork(req.body);

    // 3. Success response
    return sendResponse(res, 200, true, 'Success.', result);
  } catch (err) {
    const isDev = process.env.NODE_ENV !== 'production';
    return sendResponse(res, 500, false,
      isDev ? err.message : 'Internal server error.',
      null
    );
  }
}
```

### sendResponse utility

```js
// backend/src/utils/sendResponse.js
function sendResponse(res, statusCode, success, message, data, pagination) {
  const body = { success, message, data: data ?? null };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

module.exports = sendResponse;
```

### Frontend Error States

Every list/data view renders three states:

```jsx
function SomeListPage() {
  const { data, loading, error, refetch } = useFetch('/api/v1/...');

  if (loading) return <SkeletonCard count={5} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data || data.length === 0) return <EmptyState message="No items found." />;

  return <ItemList items={data} />;
}
```

---

## API Endpoint Specifications

### Auth Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/v1/auth/register` | none (rateLimited) | `{ name, phone, password }` | 201 `{ accessToken, user }` |
| POST | `/api/v1/auth/dealer/register` | none (rateLimited) | `{ businessName, ownerName, phone, address, password }` | 201 `{ accessToken, user }` |
| POST | `/api/v1/auth/login` | none (rateLimited) | `{ phone, password }` | 200 `{ accessToken, user }` |
| POST | `/api/v1/auth/refresh` | cookie | — | 200 `{ accessToken }` |
| POST | `/api/v1/auth/logout` | protect | — | 200 |
| GET | `/api/v1/auth/me` | protect | — | 200 `{ user }` |

### Catalog (Public / Optional Auth)

| Method | Path | Auth | Query/Body | Response |
|--------|------|------|------|----------|
| GET | `/api/v1/catalog` | optionalAuth | `?category&brand&search&page&limit` | 200 `{ products[], pagination }` |
| GET | `/api/v1/catalog/:slug` | optionalAuth | — | 200 `{ product }` |
| GET | `/api/v1/categories` | none | — | 200 `{ categories[] }` |
| GET | `/api/v1/brands` | none | — | 200 `{ brands[] }` |
| POST | `/api/v1/inquiries` | optionalAuth | `{ items[] }` | 201 `{ inquiry }` |
| GET | `/api/v1/site-config` | none | — | 200 `{ siteConfig }` |

### Admin Catalog

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/v1/admin/catalog` | admin\|editor | `?page&limit` | 200 `{ products[], pagination }` |
| POST | `/api/v1/admin/catalog` | admin\|editor | product object | 201 `{ product }` |
| POST | `/api/v1/admin/catalog/bulk` | admin\|editor | `[product, ...]` | 201 `{ created, failed, errors[] }` |
| GET | `/api/v1/admin/catalog/:id` | admin\|editor | — | 200 `{ product }` |
| PATCH | `/api/v1/admin/catalog/:id` | admin\|editor | partial product | 200 `{ product }` |
| DELETE | `/api/v1/admin/catalog/:id` | admin | — | 200 (soft delete) |
| PATCH | `/api/v1/admin/products/:id/visibility` | admin\|editor | `{ isVisible }` | 200 |
| PATCH | `/api/v1/admin/products/:id/show-price` | admin\|editor | `{ showPrice }` | 200 |
| PATCH | `/api/v1/admin/products/bulk-markup` | admin | `{ categoryId, brandId, adjustmentType, adjustmentValue }` | 200 `{ affected }` |
| GET | `/api/v1/admin/export/csv` | admin | — | 200 CSV stream |
| GET | `/api/v1/admin/search-logs` | admin\|editor | `?page&limit` | 200 `{ logs[], pagination }` |

### Admin Dealers / Users

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/v1/admin/dealers` | admin | `?status&tier&page&limit` | 200 `{ dealers[], pagination }` |
| GET | `/api/v1/admin/dealers/:id` | admin | — | 200 `{ dealer }` |
| PATCH | `/api/v1/admin/dealers/:id/approve` | admin | — | 200 `{ dealer }` |
| PATCH | `/api/v1/admin/dealers/:id/reject` | admin | `{ rejectionReason }` | 200 |
| PATCH | `/api/v1/admin/dealers/:id/tier` | admin | `{ tier }` | 200 |
| PATCH | `/api/v1/admin/dealers/:id/status` | admin | `{ isDeleted }` | 200 |
| GET | `/api/v1/admin/registrations/count` | admin | — | 200 `{ pending }` |

### Admin Campaigns

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/v1/admin/campaigns` | admin | — | 200 `{ campaigns[] }` |
| POST | `/api/v1/admin/campaigns` | admin | campaign object | 201 |
| PATCH | `/api/v1/admin/campaigns/:id` | admin | partial campaign | 200 |
| DELETE | `/api/v1/admin/campaigns/:id` | admin | — | 200 (soft delete) |

### Admin Media

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/v1/admin/media/upload` | admin\|editor | `multipart/form-data` | 201 `{ mediaAsset }` |
| GET | `/api/v1/admin/media` | admin\|editor | `?type&page&limit` | 200 `{ assets[], pagination }` |
| DELETE | `/api/v1/admin/media/:id` | admin | — | 200 |

### Admin Notifications

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/v1/admin/notifications/unread-count` | admin | — | 200 `{ count }` |
| GET | `/api/v1/admin/notifications` | admin | — | 200 `{ notifications[] }` |
| PATCH | `/api/v1/admin/notifications/:id/read` | admin | — | 200 |
| PATCH | `/api/v1/admin/notifications/read-all` | admin | — | 200 |

### Admin Analytics & Config

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/v1/admin/analytics/summary` | admin\|editor | 200 `{ totalProducts, totalDealers, ... }` |
| GET | `/api/v1/admin/inquiries` | admin | 200 `{ inquiries[], pagination }` |
| PATCH | `/api/v1/admin/inquiries/:id/status` | admin | 200 |
| PATCH | `/api/v1/admin/inquiries/:id/note` | admin | 200 |
| GET | `/api/v1/admin/site-config` | admin | 200 `{ siteConfig }` |
| PATCH | `/api/v1/admin/site-config` | admin | 200 |
| POST | `/api/v1/admin/pdf/upload` | admin | 201 `{ pdfUrl }` |

---

## Vercel Deployment Configuration

### vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/index.js" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### api/index.js (Serverless Entry)

```js
// api/index.js — NO business logic here
const app = require('../backend/src/app');
module.exports = app;
```

### Environment Variables Strategy

```
Backend reads via Node 20 --env-file flag (no dotenv):
  MONGODB_URI
  JWT_SECRET
  JWT_ACCESS_EXPIRES_IN=15m
  JWT_REFRESH_EXPIRES_IN=30d
  CLOUDINARY_CLOUD_NAME
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
  PASSWORD_PEPPER
  FRONTEND_URL
  NODE_ENV

Frontend reads via import.meta.env (Vite build-time):
  VITE_API_URL
  VITE_WHATSAPP_NUMBER

Vercel Dashboard: all vars set per environment (production / preview / development)
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property Reflection Summary:** After analyzing all 25 requirements, 8 correctness properties were identified. Properties covering campaign discounting and monotone pricing were merged into a single combined invariant (Property 2), as one logically subsumes the other. Properties covering structural/config/UI requirements are classified as SMOKE or EXAMPLE tests and excluded from PBT.

---

### Property 1: Non-negative Price Invariant

*For any* valid non-negative base price (retailPrice or wholesalePrice) and any valid tier value (`standard`, `silver`, `gold`, `platinum`), the price computed by `pricingService.computePrice` SHALL be greater than or equal to zero — even when multiple discounts compound.

**Validates: Requirements 6.1, 6.2, 23.4**

---

### Property 2: Combined Monotone Discount Invariant

*For any* valid non-negative base price, any valid tier, and any set of active campaign discounts, the final computed price SHALL satisfy both:
(a) the final price ≤ the tier-discounted price (campaigns can only reduce price further), and
(b) when multiple campaigns apply, the final price equals the result of applying only the single campaign that produces the lowest price — never lower than that minimum.

**Validates: Requirements 6.2, 10.2, 10.3, 23.5**

---

### Property 3: Tier Discount Monotonicity

*For any* base price, the discount applied SHALL be monotonically non-decreasing across the tier ladder: `standard` (0%) ≤ `silver` (5%) ≤ `gold` (10%) ≤ `platinum` (15%) — a higher tier always produces a price less than or equal to a lower tier for the same input.

**Validates: Requirements 6.3**

---

### Property 4: Price Rounding Idempotence

*For any* computed price value, `Math.round(price * 100) / 100` SHALL produce a value with at most 2 decimal places, and applying that rounding operation twice SHALL produce the same result as applying it once (idempotent rounding).

**Validates: Requirements 6.6**

---

### Property 5: Phone Validator Soundness and Completeness

*For any* string composed of exactly 11 digits starting with `01`, `validators.isValidBDPhone` SHALL return `true` (soundness); *for any* string that is non-numeric, not exactly 11 characters, or does not start with `01`, it SHALL return `false` (completeness — no false positives).

**Validates: Requirements 2.5, 23.6**

---

### Property 6: Password Strength Monotonicity

*For any* password string, `usePasswordStrength` SHALL return a value in `{ 'weak', 'medium', 'strong' }`; appending characters that satisfy additional complexity criteria (uppercase, digit, special char, length ≥ 10) to a password SHALL never decrease the returned strength level.

**Validates: Requirements 2.9**

---

### Property 7: Tier Pricing Cache Consistency

*For any* valid tier string, `tierPricingService.getDiscountPercent(tier)` called twice within a 60-second window SHALL return identical values — the second call must not issue a new database query (cache hit). *For any* call made more than 60 seconds after the last cache population, a fresh database read SHALL occur.

**Validates: Requirements 6.4**

---

### Property 8: Password Hash Non-reversibility Invariant

*For any* password string, the hash stored in the database SHALL satisfy: (a) `storedHash !== PASSWORD_PEPPER + password` (never stored as plaintext), and (b) `bcrypt.compare(PASSWORD_PEPPER + password, storedHash) === true` (round-trip verification succeeds). *For any* wrong password, `bcrypt.compare` SHALL return `false`.

**Validates: Requirements 2.6, 3.1**

---

## Error Handling

### Backend Error Taxonomy

| Code | Condition | Message Pattern |
|------|-----------|-----------------|
| 400 | Validation failure | `"<Field> is required."` / `"Invalid <field>."` |
| 401 | Missing/invalid JWT | `"Authentication required."` |
| 401 | Invalid credentials | `"Invalid credentials."` |
| 403 | Wrong role | `"Access denied."` |
| 403 | Dealer pending | `"Your account is under review."` |
| 403 | Dealer rejected | `"Your registration was not approved."` |
| 403 | Account deleted | `"Account has been deactivated."` |
| 404 | Resource not found | `"<Resource> not found."` |
| 409 | Duplicate phone | `"Phone number already registered."` |
| 413 | File too large | `"File size exceeds the 5MB limit."` |
| 429 | Rate limit hit | `"Too many requests. Please try again later."` |
| 500 | Unhandled error | `"Internal server error."` (prod) / `err.message` (dev) |

### Frontend Error Handling Strategy

- All API errors surface as string messages in local component state.
- Network errors (no response) display: `"Network error. Please check your connection."`
- `api.js` parses `response.json().message` for API errors; falls back to HTTP status text.
- No raw stack traces ever reach the UI.
- 401 triggers the single refresh retry before logout.
- Components maintain `{ loading, error, data }` triple for every async operation.

---

## Testing Strategy

### Backend — Jest + Supertest + fast-check

**Integration tests** (`backend/tests/`):
- Auth flow: register customer, register dealer, login, refresh, logout, re-use revoked token
- Role gates: assert 403 when wrong role hits protected route
- Catalog: CRUD, pricing visibility by role, search log upsert, bulk create
- Dealer lifecycle: apply → pending, approve, reject, tier change
- Media: upload, list, delete, Cloudinary error handling

**Property-based tests** (`backend/tests/properties/`):

```js
// backend/tests/properties/pricing.test.js
const fc = require('fast-check');
const { computePrice } = require('../../src/utils/pricingService');
const { discountMap } = require('../../src/utils/tierPricingService');

test('non-negative price invariant', () => {
  fc.assert(fc.property(
    fc.float({ min: 0, max: 100_000, noNaN: true }),
    fc.constantFrom('standard', 'silver', 'gold', 'platinum'),
    (basePrice, tier) => {
      const result = computePrice({ wholesalePrice: basePrice }, { role: 'dealer', tier }, []);
      return result >= 0;
    }
  ), { numRuns: 500 });
});

test('monotone discount invariant — campaign never increases price', () => {
  fc.assert(fc.property(
    fc.float({ min: 0, max: 100_000, noNaN: true }),
    fc.constantFrom('standard', 'silver', 'gold', 'platinum'),
    fc.float({ min: 0, max: 50, noNaN: true }),  // campaign percent
    (basePrice, tier, campaignPercent) => {
      const withoutCampaign = computePrice({ wholesalePrice: basePrice }, { role: 'dealer', tier }, []);
      const campaign = { type: 'percent', value: campaignPercent, appliesTo: { products: ['*'] } };
      const withCampaign = computePrice({ wholesalePrice: basePrice }, { role: 'dealer', tier }, [campaign]);
      return withCampaign <= withoutCampaign;
    }
  ), { numRuns: 500 });
});
```

```js
// backend/tests/properties/validators.test.js
const fc = require('fast-check');
const { isValidBDPhone } = require('../../src/utils/validators');

test('valid BD phone always passes', () => {
  fc.assert(fc.property(
    fc.stringOf(fc.constantFrom(...'0123456789'), { minLength: 9, maxLength: 9 }).map(s => '01' + s),
    (phone) => isValidBDPhone(phone) === true
  ), { numRuns: 300 });
});

test('non-numeric or wrong length always fails', () => {
  fc.assert(fc.property(
    fc.oneof(
      fc.string({ minLength: 0, maxLength: 9 }),   // too short
      fc.string({ minLength: 12 }),                 // too long
      fc.string({ minLength: 11, maxLength: 11 }).filter(s => !/^\d{11}$/.test(s))  // non-numeric
    ),
    (phone) => isValidBDPhone(phone) === false
  ), { numRuns: 300 });
});
```

### Frontend — Vitest + @testing-library/react

**Unit tests** (`frontend/tests/`):
- `usePasswordStrength`: weak/medium/strong transitions
- `useFetch`: loading state, success state, error state, refetch
- `usePdfDownload`: cache hit (< 24h), cache miss triggers fetch
- `validators.js`: phone format, password requirements
- `formatters.js`: price rounding, date formatting
- `api.js`: 401 retry logic, error parsing

**Property-based tests** (frontend/tests/properties/ using fast-check with vitest):

```js
// Tag format for all PBT tests:
// Feature: btg-v4-rebuild, Property <N>: <property_text>
```

### Test Configuration

- Backend: `jest --testEnvironment node --coverage`
- Frontend: `vitest --run --coverage`
- Minimum 100 iterations per `fc.assert` call (or explicit `numRuns: 100+`)
- Each PBT test tagged with design property reference in comment
