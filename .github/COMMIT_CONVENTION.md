# Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

## Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

## Types

| Type       | When to use |
|------------|-------------|
| `feat`     | New feature |
| `fix`      | Bug fix |
| `refactor` | Code restructure, no behavior change |
| `chore`    | Deps, config, tooling — no production code change |
| `docs`     | Documentation only |
| `perf`     | Performance improvement |
| `style`    | Formatting, whitespace — no logic change |
| `test`     | Adding or fixing tests |
| `ci`       | CI/CD pipeline changes |
| `revert`   | Revert a previous commit |

## Scopes (BTG specific)

`auth` `catalog` `admin` `cart` `pdf` `branding` `dealer` `campaign` `search` `api` `ui` `deps` `config`

## Examples

```bash
feat(auth): add refresh token rotation with mutex guard
fix(catalog): correct price filter to use variants.pricing.retail
chore(deps): update react to 19.2.5
refactor(admin): extract ProductTable into standalone component
docs(api): add endpoint documentation for catalog routes
perf(catalog): add campaign cache with 60s TTL
fix(pdf): replace Bengali text — Helvetica has no Unicode support
feat(admin): add Search Intelligence module with assign tag modal
```

## Branch Naming

```
feature/<scope>-<short-description>   e.g. feature/auth-register-flow
fix/<scope>-<short-description>        e.g. fix/catalog-price-filter
chore/<scope>-<short-description>      e.g. chore/deps-react-upgrade
refactor/<scope>-<short-description>   e.g. refactor/admin-product-table
```

## Rules

1. Description is lowercase, imperative mood — "add" not "added" or "adds"
2. No period at the end of the description
3. Body explains WHAT and WHY, not HOW
4. One logical change per commit (atomic commits)
5. Never commit directly to `main` — use `develop` → PR
6. Never commit `.env` files, secrets, or credentials
