# BTG — Badol Tyre Ghar

## Project Info

| Field | Value |
|-------|-------|
| Status | **v1.0.0 — Production Ready** |
| Progress | **100%** |
| Live | https://badol-tyre-ghar.vercel.app |
| GitHub | https://github.com/neloy559/badol-tyre-ghar-v3 |
| Tagline | "Full-stack B2B product catalog for a real tyre business" |

---

## Why I Built This

> "This is a real client project — a family-owned tyre business needed a digital product catalog. I used this as my primary learning ground for full-stack development. Real data, real users, real constraints."

---

## The Goal

A complete B2B platform with smart product filtering, role-based dealer pricing, admin CRM, and automated PDF catalog generation for field sales.

---

## Tech Stack

React 19, Node.js, Express 5, MongoDB, JWT, Cloudinary, TanStack Query, Zod, Framer Motion, Recharts, Vercel

---

## Milestones

- [x] Product catalog with advanced filtering
- [x] Product detail with variant pricing
- [x] Cloudinary image pipeline
- [x] Admin dashboard — 15/15 modules complete
- [x] JWT auth with refresh token rotation
- [x] PDF catalog generator (dealer-only)
- [x] Search Intelligence module
- [x] Analytics dashboard (KPIs, Recharts charts, activity feed)
- [x] Dealer tier pricing system (Standard / Silver / Gold / Platinum)
- [x] Registration to verification flow (public register → pending → admin approve)
- [x] v1.0.0 production release

---

## SOP / Architecture Notes

### Architecture

- **Frontend:** React 19 + Vite, deployed on Vercel
- **Backend:** Node.js + Express 5, serverless via Vercel Functions
- **Database:** MongoDB Atlas (Cloud)
- **Media:** Cloudinary (CDN optimization)
- **Auth:** JWT access token (15min) + HTTP-only refresh token (30d)

### Key Design Decisions

**Why JWT + Refresh Token rotation?**
To prevent session fixation attacks. Each refresh rotates the token, making stolen refresh tokens useless after first use.

**Why Cloudinary?**
Free tier is sufficient for the catalog size. The image pipeline includes automatic optimization, lazy loading, and CDN delivery.

**Why no price display by default?**
Business requirement — prices are B2B only. The `showPrice` flag per product allows granular control without rebuilding the catalog.

**Why Dealer Tier Pricing instead of per-dealer multipliers?**
Tier rules are centrally managed (admin sets tier per dealer, rules stored in `TierPricingRule` collection). Adding a new tier or changing a discount requires one DB document change, not updating every dealer record. The 60s in-memory cache avoids DB round-trips on every product fetch.

**Why Registration → Verification flow?**
Dealers self-register, get `registrationStatus: "pending"`, cannot login until admin approves. This replaces the previous phone-only registration and eliminates the need for manual account creation by admins.

### Branch Strategy

```
main     ← production only, tagged releases
develop  ← integration branch
feature/* ← new features
fix/*    ← bug fixes
```

### Commit Convention

Follows Conventional Commits: `feat(scope): description`
