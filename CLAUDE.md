# Report & Dashboard Catalog — Project Context

## What This Is

An internal tool for NIST that lets staff browse, search, and manage a catalog of reports and dashboards. It replaces a manual inventory process. The long-term goal is a two-way sync with a Drupal CMS so that approved catalog entries become published Drupal nodes.

## Architecture

```
docker-compose.yml
├── api/          Node.js + Express + TypeORM  (port 3001)
├── app/          React SPA + Vite             (port 5173)
├── postgres      PostgreSQL 16                (port 5432)  ← primary dev DB
└── oracle        Oracle Database Free         (port 1521)  ← future production target
```

**All services run in Docker.** Do not assume `localhost` connectivity — use service names (`postgres`, `oracle`) inside containers.

## Key Technologies

| Layer | Stack |
|-------|-------|
| API | Node 22, Express, TypeORM 0.3, TypeScript (tsx watch in dev) |
| SPA | React 18, React Router 6, TanStack Query 5, Tailwind CSS 3, Vite 6 |
| Auth | Okta (PKCE flow). The SPA uses `@okta/okta-react`. The API verifies JWTs with `@okta/jwt-verifier`. |
| DB | PostgreSQL 16 (dev), Oracle Free (target). TypeORM entities are cross-DB compatible. |
| E2E Tests | Playwright (`app/e2e/`). Global setup logs in via Okta UI and saves storage state to `e2e/.auth/user.json`. Env vars read from `.env.playwright`. |

## Data Model (TypeORM entities in `api/src/entities/`)

- **Report** — the core record. Fields: `id` (UUID), `title`, `slug` (unique), `type` (enum), `status` (enum), `description`, `url`, `ownerName`, `ownerEmail`, `department`, `refreshCadence`, `dataStartDate`, `dataEndDate`, `drupalNodeId`, `createdAt`, `updatedAt`.
- **ReportTag** — many-to-one to Report, stores free-text tags.
- **DataField** — standalone dimension/metric catalogue (name, description, sourceSystem).
- **ReportDataField** — join table: Report ↔ DataField.
- **Category** — taxonomy terms.
- **ReportCategory** — join table: Report ↔ Category.

**Cross-DB column type rule:** Never use `clob` or `number` as TypeORM column types — they are Oracle-only and break PostgreSQL. Use `text` (maps to CLOB in Oracle, TEXT in PG) and `int` (maps to NUMBER(10) in Oracle, INTEGER in PG).

## API Routes (`api/src/routes/`)

All routes require `Authorization: Bearer <okta_access_token>`.

- `GET/POST /api/reports` — list (with `search`, `type`, `page` query params) / create
- `GET/PATCH/DELETE /api/reports/:id` — get / update / archive (soft delete sets status to `archived`)
- `GET/POST /api/data-fields` — list / create data fields
- `GET/POST /api/categories` — list / create categories

## SPA Pages (`app/src/pages/`)

- **Browse** — catalog grid with search + type filter, pagination, report count.
- **ReportDetail** — shows all report fields, badge for type/status, tags, data fields, categories. Edit link, Archive button.
- **ReportForm** — shared Add / Edit form. In edit mode, `useQuery` fetches the report and `useEffect` populates form state. **Important:** both selects (type, status) start with non-empty default values from the `empty` constant — do NOT use them as a data-loaded signal in tests. Wait for the title `input[type="text"]` to be non-empty instead.

## TypeORM Migration Workflow

```bash
# Generate a new migration after changing entities
docker exec catalog_api npm run migration:generate:pg

# Apply all pending migrations
docker exec catalog_api npm run migration:run:pg

# If ts-node is missing from the container, run this first:
docker exec catalog_api npm install
```

`docker compose restart` does NOT reload env_file — use `docker compose up -d <service>` to pick up `.env` changes.

## Okta Configuration (two policy layers required per app)

1. **Application Authentication Policy** — `Security → Authentication Policies`
2. **Authorization Server Access Policy** — `Security → API → Authorization Servers → default → Access Policies`

Both layers must have a rule for each app's client ID or users will see "user is not authorized" (`no_matching_policy` in Okta syslog).

The Playwright test user must be on a **password-only** Authentication Policy (no MFA) because global-setup drives the Okta login UI programmatically.

## E2E Tests (Playwright)

```bash
cd app
npx playwright test          # run all tests
npx playwright test --ui     # interactive UI mode
```

Config: `app/playwright.config.ts`. Reads env from `app/.env.playwright` (gitignored — see `.env.playwright.example`).

Global setup (`e2e/global-setup.ts`) navigates to the app, fills Okta's login form, and saves the browser storage state to `e2e/.auth/user.json`. All tests then reuse that storage state — no per-test login needed.

Test file: `e2e/report-catalog.spec.ts`.

## Environment Files

| File | Purpose |
|------|---------|
| `.env` | Docker Compose — DB credentials, Okta config, ports |
| `.env.example` | Template for `.env` |
| `app/.env.playwright` | Playwright — `TEST_USERNAME`, `TEST_PASSWORD`, API URL |

## Pending / Planned Work

- **Oracle migration** — run `migration:run:oracle` against the Oracle Free container and verify schema
- **Elastic Cloud search** — replace or augment the current DB `ILIKE` search with Elasticsearch
- **Drupal sync** — when a report is published, push it to Drupal as a `report_profile` node via the Drupal REST API (the `drupal-demo/` container is the integration target)

## Drupal Demo (`drupal-demo/`)

A standalone Drupal 10 instance used to prototype the catalog sync. It has a custom `okta_bearer_auth` module (Bearer token auth), a `report_profile` content type with fields matching the catalog schema, and JSONAPI enabled. Runs separately from the main docker-compose stack.
