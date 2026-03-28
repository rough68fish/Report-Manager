# Report & Dashboard Catalog

A web application for staff to discover, browse, and explore an organization's collection of reports, dashboards, SQL extracts, and embedded web reports. Provides full-text and AI-assisted semantic search powered by Elastic Cloud, with integration into Drupal 10 for publishing public-facing report profile pages.

## Overview

The catalog maintains its own PostgreSQL database as the source of truth, syncs to Elastic Cloud for search indexing, and pushes report profile pages to Drupal 10 via JSON:API. Authentication throughout the stack uses Okta — OIDC for staff SSO login, and Client Credentials for machine-to-machine API access.

See [`docs/Report_Catalog_Design.md`](docs/Report_Catalog_Design.md) for the full architecture and design.

## Repository Structure

```
├── docs/
│   └── Report_Catalog_Design.md   # Full architecture and design document
│
└── drupal-demo/                   # Docker-based Drupal 10 integration demo
    ├── docker-compose.yml
    ├── Dockerfile
    ├── setup.sh                   # Provisions Drupal (content types, sample data, modules)
    ├── okta-configure.sh          # Configures Okta SSO and Bearer token auth
    ├── .env.example               # Copy to .env and fill in your credentials
    ├── OKTA_SETUP.md              # Step-by-step Okta developer account setup guide
    ├── custom-modules/
    │   └── okta_bearer_auth/      # Custom Drupal module: validates Okta Bearer tokens
    └── config/                    # Drupal config export (gitignored — developer-specific)
```

## Planned Application Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js 22 + Express + TypeScript + Prisma ORM |
| Database | PostgreSQL 16 |
| Search | Elastic Cloud (full-text + semantic / kNN) |
| Job Queue | BullMQ + Redis |
| CMS | Drupal 10 (JSON:API) |
| Identity | Okta (OIDC SSO + Client Credentials) |

## Getting Started — Drupal Demo

The `drupal-demo/` directory contains a fully working Docker environment for the Drupal integration. This is useful for development and testing the report publishing workflow before the Node.js application is built.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git Bash (Windows) or any Unix-style terminal
- A free [Okta developer account](https://developer.okta.com/signup/) (for SSO and API auth)

### Quick Start

```bash
cd drupal-demo

# Copy the example env file and fill in your credentials
cp .env.example .env

# Start the containers (first run builds the image — takes 2–3 minutes)
docker compose up --build -d

# Provision Drupal (content type, sample data, modules)
bash setup.sh
```

Then open http://localhost:8080 in your browser.

### Okta Setup

Each developer configures their own free Okta developer account. Follow the step-by-step guide in [`drupal-demo/OKTA_SETUP.md`](drupal-demo/OKTA_SETUP.md), which covers:

- Creating the Drupal SSO application (OIDC Web App)
- Creating the API Services application (Client Credentials)
- Setting up the `catalog.api` custom scope and authorization policy
- Configuring Drupal's OpenID Connect module
- Enabling Okta Bearer token validation via the custom `okta_bearer_auth` module

The guide includes **config checkpoints** — after each major milestone, export your Drupal configuration so future container rebuilds restore everything automatically without re-clicking through the admin UI.

### What's Confirmed Working

- Drupal 10 running in Docker (Composer-managed, with Drush)
- Staff SSO login via Okta OIDC
- Machine-to-machine Bearer token auth (Okta Client Credentials → Drupal JSON:API)
- Report Profile content type with all catalog metadata fields
- Config export/import for zero-manual-config container rebuilds

## Development Roadmap

1. **Phase 1** — Node.js API + PostgreSQL schema + React SPA shell
2. **Phase 2** — Elastic Cloud integration (full-text search + facets)
3. **Phase 3** — Semantic / natural-language search (embeddings + kNN)
4. **Phase 4** — Drupal publish workflow (Node.js → JSON:API) ← *demo environment ready*
5. **Phase 5** — Reconciliation jobs, admin dashboard, production deployment

## Contributing

Pull requests are welcome. For significant changes, please open an issue first to discuss what you'd like to change.

## License

MIT — see [LICENSE](LICENSE). You are free to use, modify, and distribute this project. Please retain the copyright notice in any copies or derivatives.
