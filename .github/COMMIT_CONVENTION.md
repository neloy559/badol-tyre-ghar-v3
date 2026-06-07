# Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

## Format

```
type(scope): description

[optional body]

[optional footer(s)]
```

- **type** — what kind of change (required)
- **scope** — which part of the codebase (optional but encouraged)
- **description** — short imperative summary, lowercase, no period at the end

---

## Types

| Type        | When to use                                              |
|-------------|----------------------------------------------------------|
| `feat`      | A new feature visible to users                          |
| `fix`       | A bug fix                                               |
| `refactor`  | Code restructure with no behaviour change               |
| `docs`      | Documentation only changes                             |
| `test`      | Adding or updating tests                                |
| `chore`     | Deps, config, tooling — no production code change       |
| `style`     | Formatting, whitespace — zero logic change              |
| `perf`      | Performance improvement                                 |

---

## Scope Examples (BTG v4 specific)

| Scope           | Area covered                                         |
|-----------------|------------------------------------------------------|
| `auth`          | Authentication, JWT, tokens, sessions                |
| `catalog`       | Products, categories, brands                         |
| `users`         | User management, dealer registration, tier system    |
| `media`         | Cloudinary uploads, Media Manager                    |
| `notifications` | In-app notification system                          |
| `frontend`      | General frontend / React components                  |
| `admin`         | Admin panel, editor workflows                        |
| `deps`          | Dependency updates                                   |
| `api`           | Express routes, middleware, response shape           |
| `pdf`           | PDF generation, catalog downloads                    |
| `config`        | Environment variables, Vercel, Vite config           |
| `ci`            | GitHub Actions, CI/CD pipeline                       |

---

## Examples of Good Commits

```bash
# New feature
feat(auth): add refresh token rotation with 30-day expiry

# Bug fix
fix(catalog): correct price filter to use variants.pricing.retail

# Refactor (no behaviour change)
refactor(admin): extract ProductTable into standalone component

# Dependency update
chore(deps): pin react to 19.1.0 and react-dom to 19.1.0

# Docs
docs(api): add endpoint documentation for catalog routes

# Performance
perf(catalog): add campaign discount cache with 60s TTL

# Test
test(auth): add property-based tests for token expiry invariants
```

---

## Breaking Changes

If a commit introduces a breaking change, append `!` after the type/scope and add a `BREAKING CHANGE:` footer:

```
feat(auth)!: remove legacy session-based login endpoint

BREAKING CHANGE: The POST /api/v1/auth/session endpoint has been removed.
All clients must use the JWT-based POST /api/v1/auth/login endpoint instead.
```

---

## Branch Naming

```
feature/<scope>-<short-description>    e.g.  feature/auth-refresh-token
fix/<scope>-<short-description>         e.g.  fix/catalog-price-filter
chore/<scope>-<short-description>       e.g.  chore/deps-react-upgrade
refactor/<scope>-<short-description>    e.g.  refactor/admin-product-table
```

---

## Rules

1. Description is **lowercase, imperative mood** — "add" not "added" or "adds"
2. No period at the end of the description line
3. Body explains **WHAT** and **WHY**, not HOW
4. One logical change per commit (atomic commits)
5. Never commit directly to `main` — open a PR from a feature branch
6. Never commit `.env` files, secrets, or credentials
7. Scope must be one of the approved scopes listed above
