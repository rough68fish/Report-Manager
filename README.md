# Report & Dashboard Catalog

A web application for staff to discover, browse, and explore an organization's collection of reports, dashboards, SQL extracts, and embedded web reports. Provides full-text and AI-assisted semantic search powered by Elastic Cloud, with integration into Drupal 10 for publishing public-facing report profile pages.

## Overview

The catalog maintains its own database as the source of truth (Oracle in production, PostgreSQL for local development), syncs to Elastic Cloud for search indexing, and pushes report profile pages to Drupal 10 via JSON:API. Authentication throughout the stack uses Okta — OIDC for staff SSO login, and Client Credentials for machine-to-machine API access.

See [`docs/Report_Catalog_Design.md`](docs/Report_Catalog_Design.md) for the full architecture and design.

## Repository Structure

```
├── api/                           # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── index.ts               # App entry point
│   │   ├── database/datasource.ts # TypeORM config (Oracle + PostgreSQL)
│   │   ├── entities/              # TypeORM entity classes
│   │   ├── middleware/            # Okta JWT auth, error handler
│   │   └── routes/                # CRUD routes: reports, data-fields, categories
│   ├── Dockerfile
│   └── package.json
│
├── app/                           # React 18 + Vite + TypeScript SPA
│   ├── src/
│   │   ├── pages/                 # Browse, ReportDetail, ReportForm
│   │   ├── components/            # Layout, Nav, ReportCard
│   │   ├── lib/                   # Okta config, Axios API client
│   │   └── types/                 # Shared TypeScript types
│   ├── Dockerfile
│   └── package.json
│
├── oracle-init/
│   └── 01_create_user.sql         # Creates catalog_user schema on first Oracle start
│
├── docs/
│   └── Report_Catalog_Design.md   # Full architecture and design document
│
├── drupal-demo/                   # Docker-based Drupal 10 integration demo
│   ├── OKTA_SETUP.md              # Step-by-step Okta setup guide
│   ├── custom-modules/
│   │   └── okta_bearer_auth/      # Validates Okta Bearer tokens in Drupal
│   └── config/                    # Drupal config export (gitignored — per-developer)
│
└── docker-compose.yml             # PostgreSQL, Oracle Free, API, React app
```

## Application Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js 22 + Express + TypeScript + TypeORM |
| Database | Oracle (production) / PostgreSQL (development) |
| Search | Elastic Cloud (full-text + semantic / kNN) |
| Job Queue | BullMQ + Redis |
| CMS | Drupal 10 (JSON:API) |
| Identity | Okta (OIDC SSO + Client Credentials) |

## Getting Started — Phase 1 (API + React App)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git Bash (Windows) or any Unix-style terminal
- A free [Okta developer account](https://developer.okta.com/signup/)
- A free [Oracle Container Registry account](https://container-registry.oracle.com) (to pull the Oracle Free image)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in your Okta credentials and set DB_TYPE=postgres (easiest for dev)
# or DB_TYPE=oracle to test against Oracle Free
```

### 2. Log into Oracle Container Registry (first time only)

```bash
docker login container-registry.oracle.com
# Use your Oracle account credentials
```

### 3. Start the stack

```bash
# PostgreSQL + API + React app
docker compose up --build -d

# To also start Oracle Free (takes 3–5 min to fully initialize):
docker compose --profile oracle up -d oracle
```

### 4. Run database migrations

```bash
# With PostgreSQL (DB_TYPE=postgres):
docker exec catalog_api npm run migration:run:pg

# With Oracle (DB_TYPE=oracle):
docker exec catalog_api npm run migration:run:oracle
```

> **Oracle first-time setup:** After Oracle is healthy, run the init script to create the catalog user:
> ```bash
> docker exec catalog_oracle sqlplus sys/catalog_password@//localhost:1521/FREE as sysdba @/docker-entrypoint-initdb.d/01_create_user.sql
> ```

### 5. Open the app

| URL | What you'll see |
|-----|-----------------|
| http://localhost:5173 | React app (sign in with Okta) |
| http://localhost:3001/health | API health check |
| http://localhost:3001/api/reports | JSON reports endpoint |

### Okta Setup (React SPA)

The React app needs a **Single-Page Application** in Okta (separate from the Drupal Web App):

1. Okta Admin → Applications → Create App Integration → OIDC → Single-Page Application
2. Sign-in redirect URI: `http://localhost:5173/login/callback`
3. Sign-out redirect URI: `http://localhost:5173`
4. Copy the Client ID into `.env` as `VITE_OKTA_CLIENT_ID`

---

## Getting Started — Drupal Demo

The `drupal-demo/` directory is a separate Docker environment for the Drupal integration. See [`drupal-demo/OKTA_SETUP.md`](drupal-demo/OKTA_SETUP.md) for the full guide.

```bash
cd drupal-demo
cp .env.example .env   # fill in your Okta credentials
docker compose up --build -d
bash setup.sh
```

## Development Roadmap

1. **Phase 1** — Node.js API + Oracle/PostgreSQL + React SPA ✅
2. **Phase 2** — Elastic Cloud integration (full-text search + facets)
3. **Phase 3** — Semantic / natural-language search (embeddings + kNN)
4. **Phase 4** — Drupal publish workflow (Node.js → JSON:API) ← *demo environment ready*
5. **Phase 5** — Reconciliation jobs, admin dashboard, production deployment

## Contributing

Pull requests are welcome. For significant changes, please open an issue first to discuss what you'd like to change.

## License

MIT — see [LICENSE](LICENSE). You are free to use, modify, and distribute this project. Please retain the copyright notice in any copies or derivatives.
