# Design Document — BTG v1.0.0 Completion

## Overview

Three features complete BTG v1.0.0:

1. **Analytics Dashboard** — replaces the existing hit-count overview with KPI cards, Recharts charts, a top-products table, and an activity feed driven by a single enriched backend endpoint.
2. **Dealer Tier Pricing System** — extends the User model with a `tier` field, adds a `TierPricingRule` collection, introduces a `TierPricingService`, and surfaces tier-adjusted prices in the catalog and dealer UI.
3. **Registration → Verification Flow** — adds a public `/register` page for dealer self-registration, enforces `registrationStatus` gating at login, and provides a new admin `/admin/registrations` module replacing the legacy `isVerified`-only queue.

All three features integrate cleanly with the existing architecture: Express 5 + Mongoose + Zod on the backend; React 19 + TanStack Query + CSS Modules + Framer Motion on the frontend.

---

## Architecture

### Backend Architecture

```
backend/src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.js          ← MODIFY: add dealerRegister, login status gating
│   │   ├── auth.routes.js              ← MODIFY: add POST /dealer/register
│   │   ├── auth.service.js             (unchanged)
│   │   └── refreshToken.model.js       (unchanged)
│   ├── catalog/
│   │   ├── catalog.controller.js       ← MODIFY: inject tierPrice into getProduct + getProducts
│   │   └── models/                     (unchanged)
│   ├── ops/
│   │   ├── analytics.admin.controller.js  ← MODIFY: full rewrite of getSummary
│   │   └── models/
│   │       └── index.js                (unchanged — AuditLog, ActivityLog already present)
│   └── users/
│       ├── user.model.js               ← MODIFY: add tier, registrationStatus, rejectionReason
│       ├── user.admin.controller.js    ← MODIFY: add getRegistrations, approveDealer, rejectDealer, setDealerTier
│       └── tierPricing.model.js        ← NEW
├── routes/
│   └── admin.js                        ← MODIFY: add registrations + tier + approve/reject routes
├── scripts/
│   └── seedTierPricing.js              ← NEW
└── utils/
    └── TierPricingService.js           ← NEW
```

### Frontend Architecture

```
src/
├── App.jsx                             ← MODIFY: add /register public route
├── pages/
│   ├── Register.jsx                    ← NEW
│   ├── Register.module.css             ← NEW
│   ├── Admin.jsx                       ← MODIFY: add Registrations link + route + PendingBadge
│   ├── Profile.jsx                     ← MODIFY: add DealerTierBadge
│   ├── Catalog.jsx                     ← MODIFY: show tierPrice.adjustedPrice for dealers
│   ├── Product.jsx                     ← MODIFY: show tierPrice block for dealers
│   └── admin/
│       ├── DashboardHome.jsx           ← MODIFY: full rewrite with charts + KPIs + feed
│       ├── DashboardHome.module.css    ← NEW
│       ├── DealerQueue.jsx             ← MODIFY: use new endpoints + show registrationStatus
│       └── AdminRegistrations.jsx      ← NEW
│       └── AdminRegistrations.module.css ← NEW
└── components/
    └── ui/
        ├── DealerTierBadge.jsx         ← NEW
        ├── DealerTierBadge.module.css  ← NEW
        ├── ConfirmDialog.jsx           ← NEW (shared reusable)
        └── ConfirmDialog.module.css    ← NEW
```

---

## Feature 1: Analytics Dashboard

### Backend — `analytics.admin.controller.js` Rewrite

The existing `getSummary` handler returns only API hit counts from `ActivityLog`. It is fully replaced to aggregate KPI data, chart datasets, top-products, and recent audit activity.

**Endpoint:** `GET /api/v1/admin/analytics/summary`  
**Middleware:** `protect`, `restrictTo('admin', 'editor')` (already applied globally via `admin.js` router)

#### Aggregation Strategy

All queries run in a single `Promise.all` call to minimise latency. The seven parallel operations are:

| Query | Model | Operation |
|---|---|---|
| `totalProducts` | Product | `countDocuments({ isDeleted: false })` |
| `totalDealers` | User | `countDocuments({ role: 'dealer', isDeleted: false })` |
| `activeDealers` | User | `countDocuments({ role: 'dealer', registrationStatus: 'approved' })` |
| `totalOrders` | — | hardcoded `0` (placeholder, wrapped in `Promise.resolve`) |
| `productsByBrand` | Product | aggregation pipeline: match non-deleted → group by `brand` → lookup Brand name → project `{ brand: name, count }` → sort desc |
| `dealerRegistrations` | User | aggregation: match dealers created in last 30 days → group by `$dateToString(createdAt)` → fill gaps with zero for missing days |
| `topViewedProducts` | Product | `find({ isDeleted: false }).sort({ 'meta.views': -1 }).limit(5).select('_id name slug meta.views')` |
| `recentActivity` | AuditLog | `find().sort({ createdAt: -1 }).limit(10).populate('adminId', '_id profile.name')` |

#### `dealerRegistrations` Gap-Filling Algorithm

The raw aggregation returns only days that have at least one registration. The controller builds a full 30-day array in memory:

```
1. Build a Map<dateString, count> from the aggregation results
2. Iterate from day = now-29 to now (inclusive, 30 entries)
3. For each day, emit { date: ISO_DATE_STRING, count: map.get(date) ?? 0 }
```

#### Response Shape

```json
{
  "success": true,
  "message": "Analytics summary fetched.",
  "data": {
    "kpi": {
      "totalProducts": 142,
      "totalDealers": 38,
      "activeDealers": 31,
      "totalOrders": 0
    },
    "productsByBrand": [
      { "brand": "Birla", "count": 45 },
      { "brand": "MRF", "count": 30 }
    ],
    "dealerRegistrations": [
      { "date": "2025-07-01", "count": 3 },
      { "date": "2025-07-02", "count": 0 }
    ],
    "topViewedProducts": [
      { "_id": "...", "name": "Birla 175/65R14", "slug": "birla-175-65r14", "meta": { "views": 312 } }
    ],
    "recentActivity": [
      { "action": "APPROVE_DEALER", "adminId": { "_id": "...", "profile": { "name": "Admin" } }, "createdAt": "..." }
    ]
  }
}
```

---

### Frontend — `DashboardHome.jsx` Rewrite

The component is fully replaced. It imports only the Recharts components it uses.

#### Query

```js
useQuery({
  queryKey: ['analytics-summary'],
  queryFn: () => api.get('/admin/analytics/summary').then(r => r.data.data),
  staleTime: 60_000,
})
```

#### Component Breakdown

| Sub-section | Component | Data source |
|---|---|---|
| KPI row | `<KpiCard>` × 4 (inline, not separate file) | `data.kpi` |
| Brand bar chart | Recharts `<BarChart layout="vertical">` | `data.productsByBrand` |
| Registration line chart | Recharts `<LineChart>` | `data.dealerRegistrations` |
| Top products table | `<table>` | `data.topViewedProducts` |
| Activity feed | `<ul>` | `data.recentActivity` |

**Skeleton layout:** CSS-animated grey blocks that mirror the loaded layout — one row of 4 KPI placeholders, two chart-sized boxes, a table placeholder with 5 rows, a feed placeholder with 10 lines.

**Recharts imports:**

```js
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts';
```

**Framer Motion wrapper:**

```jsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className={styles.dashboard}
>
```

**Relative timestamp helper:** A small inline function `timeAgo(dateStr)` that returns strings like "2 hours ago" using `Date.now()` arithmetic — no external library.

---

## Data Models

### Feature 2: Dealer Tier Pricing — Model Changes

#### `user.model.js` — New Fields

```js
tier: {
  type: String,
  enum: ['standard', 'silver', 'gold', 'platinum'],
  default: 'standard',
},
registrationStatus: {
  type: String,
  enum: ['pending', 'approved', 'rejected'],
  default: 'approved',      // existing admin-created users stay approved
},
rejectionReason: {
  type: String,
  default: null,
},
```

All existing fields (`phone`, `password`, `role`, `isVerified`, `isDeleted`, `discountMultiplier`, `creditLimit`, `paymentTerms`, `verificationDetails`, `profile`, `analytics`) are preserved without change.

#### `tierPricing.model.js` — New File

```js
const TierPricingRuleSchema = new Schema({
  tier:            { type: String, required: true, enum: [...], unique: true },
  discountPercent: { type: Number, required: true, min: 0, max: 100 },
  label:           { type: String, required: true },
  description:     { type: String },
});
```

#### `scripts/seedTierPricing.js` — New File

Runs once at server startup via `index.js`. Checks `TierPricingRule.countDocuments()` — if 0, inserts the four default rules:

```
standard  → 0%   → "Standard"  → "No discount"
silver    → 5%   → "Silver"    → "5% off public price"
gold      → 10%  → "Gold"      → "10% off public price"
platinum  → 15%  → "Platinum"  → "15% off public price"
```

---

### `TierPricingService.js` — New Util

Location: `backend/src/utils/TierPricingService.js`

```
getDealerPrice(publicPrice, tier) → Promise<number>

1. Fetch TierPricingRule where { tier } from DB (or from in-memory cache — 60s TTL)
2. If not found: return publicPrice (0% discount fallback)
3. adjustedPrice = publicPrice * (1 - discountPercent / 100)
4. return Math.round(adjustedPrice * 100) / 100
```

The service uses a module-level cache (`Map<tier, { discountPercent, expiresAt }>`) to avoid a DB round-trip on every product fetch. Cache TTL is 60 seconds, matching the existing `getActiveCampaigns` pattern in `catalog.controller.js`.

---

### Backend API Changes

#### `admin.js` — New Routes

```
PATCH /admin/dealers/:id/tier      → userAdmin.setDealerTier
GET   /admin/dealers/registrations → userAdmin.getRegistrations
PATCH /admin/dealers/:id/approve   → userAdmin.approveDealer
PATCH /admin/dealers/:id/reject    → userAdmin.rejectDealer
```

All are covered by the existing `router.use(protect)` + `router.use(restrictTo('admin', 'editor'))` guards already applied to the entire admin router.

#### `user.admin.controller.js` — New Functions

**`setDealerTier(req, res)`**

```
Zod schema: { tier: z.enum(['standard', 'silver', 'gold', 'platinum']) }
1. Validate body
2. Find dealer by id where isDeleted: false — 404 if missing
3. Update dealer.tier
4. Write AuditLog { action: 'UPDATE_DEALER_TIER', details: { old, new } }
5. sendSuccess(res, 200, 'Dealer tier updated.', { tier: dealer.tier })
```

#### `catalog.controller.js` — Modified `getProduct`

After the existing `processedVariants` block:

```
if (req.user?.role === 'dealer') {
  const publicPrice = product.variants?.[0]?.pricing?.wholesale ?? 0
  tierPrice = {
    tier: req.user.tier,
    discountPercent: <from TierPricingService cache>,
    adjustedPrice: await TierPricingService.getDealerPrice(publicPrice, req.user.tier)
  }
} else {
  tierPrice = undefined   // omitted from response
}
```

The `tierPrice` field is added to the `sendSuccess` payload only when the requesting user is a dealer.

For `getProducts` (list endpoint), the same pattern applies per-product, but since `getDealerPrice` hits an in-memory cache, it does not add per-item DB calls. The adjusted price is appended as `tierPrice` on each product object.

---

### Admin UI — `AdminRegistrations.jsx` (New) and Tier Dropdown

**`AdminRegistrations.jsx` query:**

```js
useQuery({
  queryKey: ['dealer-registrations', { status, page }],
  queryFn: () => api.get('/admin/dealers/registrations', { params: { status, page, limit: 20 } })
                    .then(r => r.data.data),
})
```

**Approve mutation:**

```js
useMutation({
  mutationFn: (id) => api.patch(`/admin/dealers/${id}/approve`),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dealer-registrations'] }),
})
```

**Reject mutation (with ConfirmDialog):**

```js
useMutation({
  mutationFn: ({ id, rejectionReason }) =>
    api.patch(`/admin/dealers/${id}/reject`, { rejectionReason }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dealer-registrations'] }),
})
```

The `ConfirmDialog` is opened by setting local state `{ open: true, dealerId, mode: 'reject' }`. It renders a `<textarea>` for the optional rejection reason. Submission is only triggered when the user clicks the confirm button inside the dialog.

**Tier dropdown** within each dealer card in `AdminRegistrations.jsx`:

```jsx
<select
  defaultValue={dealer.tier}
  onChange={(e) => tierMutation.mutate({ id: dealer._id, tier: e.target.value })}
>
  <option value="standard">Standard</option>
  <option value="silver">Silver</option>
  <option value="gold">Gold</option>
  <option value="platinum">Platinum</option>
</select>
```

---

### Dealer Dashboard UI Changes

#### `DealerTierBadge.jsx` (New Component)

```jsx
// Props: { tier: 'standard' | 'silver' | 'gold' | 'platinum' }
// Renders a <span> with data-tier attribute for CSS colour mapping
const TIER_LABELS = {
  standard: 'Standard Dealer',
  silver:   'Silver Dealer',
  gold:     'Gold Dealer',
  platinum: 'Platinum Dealer',
};
```

CSS Module maps `data-tier` attribute to distinct colours:
- `standard` → grey
- `silver` → slate/cool-grey
- `gold` → amber
- `platinum` → indigo/purple

#### `Profile.jsx` Change

In the `isB2B` block, replace the "Discount Tier" row:

```jsx
{/* OLD: shows discountMultiplier percentage */}
{/* NEW: shows DealerTierBadge */}
{user?.tier && <DealerTierBadge tier={user.tier} />}
```

#### `Catalog.jsx` Change

In the product card price display:

```jsx
// When user is dealer and product.tierPrice exists:
const displayPrice = (isDealer && product.tierPrice?.adjustedPrice != null)
  ? product.tierPrice.adjustedPrice
  : variant.price;
```

#### `Product.jsx` Change

Below the existing price display:

```jsx
{isDealer && data.tierPrice && (
  <div className={styles.tierPriceBlock}>
    <DealerTierBadge tier={data.tierPrice.tier} />
    <p>Your price: ৳{data.tierPrice.adjustedPrice.toLocaleString()}</p>
    <p className={styles.discountNote}>{data.tierPrice.discountPercent}% dealer discount applied</p>
  </div>
)}
```

---

## Feature 3: Registration → Verification Flow

### Backend — Auth Module

#### `POST /api/v1/auth/dealer/register`

Added to `auth.routes.js` as a public route (no `protect` middleware).

**Zod schema:**

```js
const dealerRegisterSchema = z.object({
  businessName: z.string().min(2),
  ownerName:    z.string().min(2),
  email:        z.string().email(),
  phone:        z.string().min(11).max(14),
  address:      z.string().min(5),
  password:     z.string().min(6),
});
```

**Handler flow (`auth.controller.js` — new `dealerRegister` export):**

```
1. Parse + validate with Zod → 400 on failure
2. Check User.findOne({ phone, isDeleted: false }) → 409 if exists
3. Hash password with bcrypt(12)
4. Create User:
   {
     phone,
     password: hashed,
     role: 'dealer',
     registrationStatus: 'pending',
     isVerified: false,
     'profile.name': ownerName,
     'profile.shopName': businessName,
     'profile.address': address,
     'verificationDetails.appliedAt': new Date(),
   }
5. sendSuccess(res, 201, 'Registration received. Your account is under review.', { userId: user._id })
   — NO tokens, NO cookies
```

#### `POST /api/v1/auth/login` — Modified

After password verification, before `issueTokens`:

```js
if (user.role === 'dealer') {
  if (user.registrationStatus === 'pending') {
    return sendError(res, 403, 'Your account is under review. Please wait for admin approval.');
  }
  if (user.registrationStatus === 'rejected') {
    return sendError(res, 403, 'Your registration was not approved. Please contact Badol Tyre Ghar for assistance.');
  }
}
// Non-dealer roles skip this block entirely
```

---

### Backend — Admin Registrations API

#### `GET /api/v1/admin/dealers/registrations`

Handler: `userAdmin.getRegistrations`

```
Zod query schema: { status: z.enum(['pending', 'approved', 'rejected']).default('pending'), page: z.coerce.number().default(1), limit: z.coerce.number().default(20) }

Query:
  User.find({ role: 'dealer', isDeleted: false, registrationStatus: status })
      .select('_id profile phone registrationStatus rejectionReason tier verificationDetails.appliedAt createdAt')
      .skip((page-1)*limit).limit(limit)

Response:
  sendSuccess(res, 200, '...', { dealers, total, page, limit })
```

#### `PATCH /api/v1/admin/dealers/:id/approve`

Handler: `userAdmin.approveDealer`

```
1. Find dealer where { _id, isDeleted: false } → 404 if missing
2. dealer.registrationStatus = 'approved'
3. dealer.isVerified = true
4. dealer.save()
5. AuditLog.create({ adminId: req.user._id, action: 'APPROVE_DEALER', targetId: dealer._id })
6. sendSuccess(res, 200, 'Dealer approved.')
```

#### `PATCH /api/v1/admin/dealers/:id/reject`

Handler: `userAdmin.rejectDealer`

```
Zod body schema: { rejectionReason: z.string().optional().default('') }

1. Validate body
2. Find dealer → 404 if missing
3. dealer.registrationStatus = 'rejected'
4. dealer.isVerified = false
5. dealer.rejectionReason = rejectionReason
6. dealer.save()
7. AuditLog.create({ ..., action: 'REJECT_DEALER', details: { rejectionReason } })
8. sendSuccess(res, 200, 'Dealer rejected.')
```

#### `GET /api/v1/admin/dealers/pending` — Modified (DealerQueue Migration)

The existing `getPendingDealers` handler changes its query filter from `{ isVerified: false }` to `{ registrationStatus: 'pending' }`. The query key `['pending-dealers']` and all DealerQueue logic remain unchanged except the filter change.

---

### Frontend — `Register.jsx` (New Page)

**Route:** Public, mounted in `App.jsx` as `<Route path="register" element={<Register />} />`.

**Form fields (react-hook-form + Zod resolver):**

```js
const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name required'),
  ownerName:    z.string().min(2, 'Owner name required'),
  email:        z.string().email('Valid email required'),
  phone:        z.string().min(11).max(14, 'Valid phone required'),
  address:      z.string().min(5, 'Address required'),
  password:     z.string().min(6, 'Password must be at least 6 characters'),
});
```

**States:**

| State | Trigger | UI |
|---|---|---|
| Idle | Initial render | Form with all fields |
| Submitting | Form valid, awaiting API | Submit button disabled + `<Loader2 className="animate-spin">` |
| Success | API returns 201 | Form replaced with success message + link to `/login` |
| Error | API returns 4xx/5xx | Error message beneath form, form stays visible |

**Submission handler:**

```js
const onSubmit = async (data) => {
  try {
    await api.post('/auth/dealer/register', data);
    setSuccess(true);
  } catch (err) {
    setApiError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
  }
};
```

**Framer Motion wrapper** (consistent with Login page pattern):

```jsx
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
```

---

### Frontend — `Admin.jsx` Changes

**New import:**

```js
import AdminRegistrations from './admin/AdminRegistrations';
import { ClipboardList } from 'lucide-react';
```

**`ADMIN_LINKS` addition** (after the existing `dealers` entry):

```js
{
  to: '/admin/registrations',
  icon: ClipboardList,
  label: 'Registrations',
  badge: pendingCount,   // number from usePendingCount hook
}
```

**`PendingBadge` sub-query:** A small `usePendingCount` hook (inline in `Admin.jsx`) that fetches:

```js
useQuery({
  queryKey: ['registrations-pending-count'],
  queryFn: () => api.get('/admin/dealers/registrations', { params: { status: 'pending', limit: 1 } })
                    .then(r => r.data.data.total),
  staleTime: 30_000,
  refetchInterval: 60_000,
})
```

The badge renders only when `pendingCount > 0`:

```jsx
{badge > 0 && <span className="admin-nav-badge">{badge}</span>}
```

**New `<Route>`:**

```jsx
<Route path="registrations" element={<AdminRegistrations />} />
```

The existing `<Route path="dealers" element={<DealerQueue />} />` is kept — DealerQueue remains the legacy dealer management view and is updated separately.

---

### Frontend — `DealerQueue.jsx` Changes

1. The `verify` mutation changes from `api.patch('/admin/dealers/${id}/verify', { approve })` to calling either `api.patch('/admin/dealers/${id}/approve')` (approve) or `api.patch('/admin/dealers/${id}/reject', { rejectionReason: '' })` (reject).
2. Each dealer card gains a `<span className="status-tag" data-status={d.registrationStatus}>{d.registrationStatus}</span>` next to the existing role tag.
3. Query key `['pending-dealers']` and endpoint `GET /admin/dealers/pending` are unchanged.

---

## Shared Components

### `ConfirmDialog.jsx`

A modal overlay component used for rejection confirmation:

```
Props:
  open: boolean
  title: string
  message: string
  withReason?: boolean       // if true, renders a textarea
  onConfirm: (reason?: string) => void
  onCancel: () => void
  confirmLabel?: string      // default: "Confirm"
  confirmVariant?: 'danger' | 'primary'
```

Rendered at the bottom of the component tree via a React Portal to avoid z-index stacking issues. Blocked by Framer Motion `AnimatePresence` for smooth open/close animation.

---

## Components and Interfaces

All component and interface definitions are distributed across the three feature sections above. For a consolidated reference:

### Backend Interfaces

| Handler | Method + Path | Auth | Request | Response |
|---|---|---|---|---|
| `analyticsAdmin.getSummary` | `GET /api/v1/admin/analytics/summary` | admin, editor | — | `{ kpi, productsByBrand, dealerRegistrations, topViewedProducts, recentActivity }` |
| `userAdmin.getRegistrations` | `GET /api/v1/admin/dealers/registrations` | admin, editor | `?status&page&limit` | `{ dealers[], total, page, limit }` |
| `userAdmin.approveDealer` | `PATCH /api/v1/admin/dealers/:id/approve` | admin, editor | — | `{ message }` |
| `userAdmin.rejectDealer` | `PATCH /api/v1/admin/dealers/:id/reject` | admin, editor | `{ rejectionReason? }` | `{ message }` |
| `userAdmin.setDealerTier` | `PATCH /api/v1/admin/dealers/:id/tier` | admin, editor | `{ tier }` | `{ tier }` |
| `userAdmin.getPendingDealers` | `GET /api/v1/admin/dealers/pending` | admin, editor | — | `dealers[]` |
| `authController.dealerRegister` | `POST /api/v1/auth/dealer/register` | public | `{ businessName, ownerName, email, phone, address, password }` | `{ userId }` |

### Frontend Component Tree

```
App.jsx
├── /register          → Register.jsx + Register.module.css
└── /admin/*           → Admin.jsx
    ├── /              → DashboardHome.jsx + DashboardHome.module.css
    │                     └── [inline] KpiCard, SkeletonDashboard
    ├── /dealers       → DealerQueue.jsx (modified)
    └── /registrations → AdminRegistrations.jsx + AdminRegistrations.module.css
                           └── ConfirmDialog.jsx + ConfirmDialog.module.css

src/components/ui/
├── DealerTierBadge.jsx + DealerTierBadge.module.css
└── ConfirmDialog.jsx + ConfirmDialog.module.css

Modified pages:
├── Profile.jsx        → adds DealerTierBadge
├── Catalog.jsx        → shows tierPrice.adjustedPrice for dealers
└── Product.jsx        → shows tierPrice block for dealers
```

### Key Function Signatures

```js
// backend/src/utils/TierPricingService.js
getDealerPrice(publicPrice: number, tier: string): Promise<number>

// backend/src/modules/auth/auth.controller.js
dealerRegister(req, res): Promise<void>

// backend/src/modules/users/user.admin.controller.js
getRegistrations(req, res): Promise<void>
approveDealer(req, res): Promise<void>
rejectDealer(req, res): Promise<void>
setDealerTier(req, res): Promise<void>

// backend/src/modules/ops/analytics.admin.controller.js
getSummary(req, res): Promise<void>   // fully rewritten

// backend/src/scripts/seedTierPricing.js
seedTierPricing(): Promise<void>      // called once at server startup
```

---

## Error Handling

| Layer | Pattern |
|---|---|
| Backend controllers | `try/catch` wrapping entire handler body; `catch` block calls `sendError(res, 500, err.message)` |
| Zod validation | `schema.safeParse(req.body)` → early return `sendError(res, 400, 'Validation failed', parsed.error.flatten().fieldErrors)` |
| Frontend queries | `isError` check renders error state with retry button invoking `refetch()` |
| Frontend mutations | `onError` callback sets local `apiError` state; displayed as a `<p className={styles.errorMsg}>` beneath the form or action area |
| Auth blocking | `registrationStatus` check in login handler returns 403 before `issueTokens` is ever called |

---

## Pagination Convention

All new list endpoints follow the existing project pattern:

```
Request params:  ?page=1&limit=20
Response shape:  { dealers: [...], total: N, page: N, limit: N }
```

Frontend `AdminRegistrations.jsx` tracks `page` in local state and passes it as a query param. Pagination controls render only when `total > limit`.

---

## Security Considerations

- `password` field is excluded at the schema level via `select: false` on the User model. All new controller queries that use `.lean()` without an explicit `.select()` must explicitly `.select('-password')`.
- The dealer register endpoint is public — no `protect` middleware. It is subject to the existing `express-rate-limit` (100 req / 15 min) applied globally to `/api/`.
- `registrationStatus` is set server-side only. The public registration endpoint always sets `'pending'`; admin-facing approvals set `'approved'` or `'rejected'` — clients cannot self-elevate.
- JWT tokens are never issued for pending/rejected dealers — the check occurs after password verification but before `issueTokens`.

---

## Testing Strategy

### Dual Testing Approach

**Unit / example-based tests** cover specific behaviors: schema defaults, API error codes (409, 400, 403, 404), login status gating, empty states, and UI interactions (form submission, mutation calls, cache invalidation).

**Property-based tests** (via fast-check or equivalent) cover universally quantified behaviors: KPI counting correctness, aggregation ordering, `getDealerPrice` formula, registration state invariants, and security properties (password exclusion, auth enforcement).

### Per-Feature Test Focus

| Feature | Key property tests | Key example tests |
|---|---|---|
| Analytics Dashboard | KPI counts, 30-day completeness, brand sort | Skeleton render, error state, empty states |
| Tier Pricing | getDealerPrice formula, tierPrice injection, badge rendering | Tier dropdown, cache fallback, schema defaults |
| Registration Flow | User creation fields, login gating for non-dealers, form validation | 409 duplicate, 403 pending/rejected, success state |

### Test Configuration

- Minimum 100 iterations per property test
- Backend tests use in-memory MongoDB (e.g., `mongodb-memory-server`) — no live DB required
- Frontend tests use React Testing Library + MSW for API mocking
- Property tests use `fast-check` for input generation

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: KPI Counting Correctness

*For any* set of User documents with varying combinations of `role`, `registrationStatus`, and `isDeleted` values, the `activeDealers` KPI must equal the exact count of documents where `role === 'dealer'` AND `registrationStatus === 'approved'`, and `totalDealers` must equal the count where `role === 'dealer'` AND `isDeleted === false`.

**Validates: Requirements 1.3, 1.4**

---

### Property 2: productsByBrand Aggregation Correctness

*For any* set of Product documents with varying `brand` references and `isDeleted` states, the `productsByBrand` array must contain only non-deleted products, must group counts correctly by brand name, and must be sorted in descending order by count.

**Validates: Requirements 1.5**

---

### Property 3: dealerRegistrations 30-Day Completeness

*For any* set of dealer User documents created on varying dates (some within the last 30 days, some outside), the `dealerRegistrations` array must contain exactly 30 entries — one per calendar day — and each entry's `count` must precisely match the number of dealers created on that day (with 0 for days with no registrations).

**Validates: Requirements 1.6**

---

### Property 4: topViewedProducts Ordering

*For any* set of non-deleted Product documents with varying `meta.views` values, the `topViewedProducts` array must contain at most 5 entries, all entries must have `isDeleted === false`, and they must be in descending order of `meta.views`.

**Validates: Requirements 1.7**

---

### Property 5: KPI Cards Reflect API Data

*For any* valid `kpi` object returned by the analytics endpoint, the DashboardHome component must render exactly four cards displaying the exact values of `kpi.totalProducts`, `kpi.totalDealers`, `kpi.activeDealers`, and `kpi.totalOrders`.

**Validates: Requirements 2.4**

---

### Property 6: Activity Feed Renders All Required Fields

*For any* `recentActivity` array of audit log entries, every rendered feed item must display the `action` string, the admin name from `adminId.profile.name`, and a relative timestamp derived from `createdAt`.

**Validates: Requirements 2.9**

---

### Property 7: getDealerPrice Formula Correctness

*For any* non-negative `publicPrice` and any tier in `['standard', 'silver', 'gold', 'platinum']`, `getDealerPrice(publicPrice, tier)` must return `Math.round(publicPrice * (1 - discountPercent / 100) * 100) / 100` where `discountPercent` is the value stored in `TierPricingRule` for that tier.

**Validates: Requirements 4.1**

---

### Property 8: Tier Price Injection in Product Response

*For any* authenticated dealer with any tier value, a `GET /api/v1/catalog/:slug` response must include a `tierPrice` object containing the correct `tier`, `discountPercent`, and `adjustedPrice` computed from `getDealerPrice`. For any non-dealer or unauthenticated request to the same endpoint, `tierPrice` must be absent from the response.

**Validates: Requirements 4.3, 4.4**

---

### Property 9: Tier Update Validation and Audit Trail

*For any* valid tier enum value (`'standard' | 'silver' | 'gold' | 'platinum'`), `PATCH /api/v1/admin/dealers/:id/tier` must succeed, persist the new tier on the User document, and create an `AuditLog` entry with `action === 'UPDATE_DEALER_TIER'`. For any string not in the enum, the endpoint must return HTTP 400 with Zod field errors.

**Validates: Requirements 5.3, 5.4**

---

### Property 10: Dealer Tier Badge Renders Correctly for All Tiers

*For any* tier value in `['standard', 'silver', 'gold', 'platinum']`, the `DealerTierBadge` component must render the correct tier label string and apply a visually distinct CSS class (one of four distinct classes, not shared between tiers).

**Validates: Requirements 6.3**

---

### Property 11: isVerified Mirrors registrationStatus

*For any* dealer User document, `isVerified` must equal `registrationStatus === 'approved'`. Specifically: approve action sets both `registrationStatus: 'approved'` and `isVerified: true`; reject action sets both `registrationStatus: 'rejected'` and `isVerified: false`.

**Validates: Requirements 7.3, 11.8, 11.10**

---

### Property 12: Dealer Registration Creates Correct User State

*For any* valid registration input (varying businessName, ownerName, email, phone, address, password), `POST /api/v1/auth/dealer/register` must create a User with `role: 'dealer'`, `registrationStatus: 'pending'`, `isVerified: false`, and must respond with HTTP 201 containing no `accessToken`, no `Set-Cookie` header, and no `password` field.

**Validates: Requirements 8.4, 8.5, 8.6, 8.7**

---

### Property 13: Login Status Gating for Non-Dealer Roles

*For any* User with `role` in `['admin', 'editor', 'customer', 'sales_partner']` and any `registrationStatus` value (even `'pending'` or `'rejected'`), the login endpoint must not apply `registrationStatus` checks and must proceed to token issuance if credentials are valid.

**Validates: Requirements 9.3**

---

### Property 14: Registration Form Inline Validation

*For any* combination of missing or invalid field values in the `Register.jsx` form, submitting the form must not call the API and must instead display inline error messages for each invalid field.

**Validates: Requirements 10.3**

---

### Property 15: Registrations List Never Exposes Password

*For any* call to `GET /api/v1/admin/dealers/registrations` with any `status` filter, the response must not contain a `password` field on any dealer object in the result array.

**Validates: Requirements 11.4, 13.7**

---

### Property 16: Registrations List Filter Correctness

*For any* `status` query parameter value, all dealers returned by `GET /api/v1/admin/dealers/registrations` must have `registrationStatus === status`. No dealer with a different status must appear in the results.

**Validates: Requirements 11.4**

---

### Property 17: Approve and Reject Write Correct State and Audit Log

*For any* pending dealer and any `rejectionReason` string (including empty string), the approve action must produce `registrationStatus: 'approved'` + `isVerified: true` + `AuditLog{ action: 'APPROVE_DEALER' }`, and the reject action must produce `registrationStatus: 'rejected'` + `isVerified: false` + `rejectionReason: <given value>` + `AuditLog{ action: 'REJECT_DEALER' }`.

**Validates: Requirements 11.8, 11.10**

---

### Property 18: Pagination Metadata Always Present

*For any* call to any new paginated list endpoint (`GET /admin/dealers/registrations`), the response must include `total`, `page`, and `limit` fields regardless of whether the result set is empty, partial, or full.

**Validates: Requirements 13.6**

---

### Property 19: Protected Routes Reject Unauthenticated and Unauthorized Requests

*For any* new protected endpoint (`/admin/dealers/registrations`, `/admin/dealers/:id/approve`, `/admin/dealers/:id/reject`, `/admin/dealers/:id/tier`), a request without a JWT must return HTTP 401, and a request with a valid JWT for a role other than `admin` or `editor` must return HTTP 403.

**Validates: Requirements 13.3**
