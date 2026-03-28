# Report & Dashboard Catalog — Application Design Document

March 2026 | v1.2

---

## 1. Executive Summary

This document describes the architecture and design for a Report & Dashboard Catalog — a Node.js / React application that allows staff to discover, browse, and explore the organization's collection of reports, dashboards, SQL extracts, and embedded web reports. The system provides full-text and AI-assisted semantic search powered by Elastic Cloud, and integrates with both Drupal 10 (to publish public-facing report pages) and an existing Elastic Cloud instance (to index catalog entries alongside other organizational content).

> **Scope:** All four report types are in scope: BI dashboards, PDF/static reports, web/embedded reports, and SQL data extracts. The catalog stores rich metadata about each asset — including what data fields and metrics it contains — so staff can find reports that answer specific questions.

### Key Goals

- Give staff a single place to discover what reports and data assets exist across the organization
- Enable discovery by topic, department, data field, or by asking a natural-language question
- Allow editors to publish SEO-friendly report profile pages to the Drupal 10 website in one click
- Keep Elastic Cloud indexed with catalog content so it appears in site-wide search results
- Maintain a living metadata record: who owns it, when it was last updated, what data it uses

---

## 2. System Overview

The catalog is a standalone web application that sits alongside — but is not built inside — Drupal. It maintains its own PostgreSQL database as the authoritative source of truth, syncs outbound to Elastic Cloud for search indexing, and calls the Drupal 10 JSON:API to create or update report pages when requested.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Staff Browser / Client                        │
│           React SPA (Vite + TypeScript + Tailwind)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST / JSON API
┌──────────────────────────▼──────────────────────────────────────┐
│              Node.js API Server (Express + TypeScript)          │
│   • Catalog CRUD          • Auth (Okta OIDC / JWT)              │
│   • Search orchestration  • Sync job queue (BullMQ)             │
└──────┬───────────────────┬──────────────────┬────────────────────┘
       │                   │                  │
  ┌────▼────┐        ┌─────▼──────┐    ┌──────▼──────┐
  │Postgres │        │  Elastic   │    │  Drupal 10  │
  │(source  │        │  Cloud     │    │  JSON:API   │
  │of truth)│        │(search +   │    │ (publish    │
  └─────────┘        │ semantic   │    │  pages)     │
                     │ vectors)   │    └──────┬──────┘
                     └────────────┘           │
                                       ┌──────▼──────┐
                                       │    Okta     │
                                       │(SSO + API   │
                                       │  auth)      │
                                       └─────────────┘
```

### Component Roles

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| React SPA | React 18, TypeScript, Tailwind CSS, React Query | Staff-facing browse, search, admin, and publish UI |
| API Server | Node.js 22, Express, TypeScript, TypeORM    | Business logic, auth, orchestrates all integrations |
| Database | Oracle (production) / PostgreSQL (dev) | Source of truth for all report metadata and taxonomy |
| Search Engine | Elastic Cloud (existing) | Powers full-text and semantic (vector) search |
| Job Queue | BullMQ + Redis | Handles async Elastic sync and Drupal publish jobs |
| Drupal 10 | JSON:API (Drupal core module) | Receives pushed report profiles; renders public pages |
| Identity Provider | Okta | SSO for human users (OIDC); machine-to-machine API auth (Client Credentials) |

---

## 3. Core Data Model

PostgreSQL holds the authoritative catalog. The schema centres on three primary entities: Report, DataField, and Category. These are connected by junction tables to express many-to-many relationships.

### Entity: Report

The central entity. One row per report, dashboard, SQL extract, or embedded web report.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Stable identifier |
| title | VARCHAR(255) | Human-readable name |
| slug | VARCHAR(255) | URL-safe identifier (auto-generated) |
| description | TEXT | Plain-text summary for staff and search |
| type | ENUM | `bi_dashboard` \| `pdf_report` \| `web_report` \| `sql_extract` |
| url | TEXT | Link to the report, dashboard, or file location |
| owner_name | VARCHAR(255) | Person or team responsible |
| owner_email | VARCHAR(255) | Contact for questions about this report |
| department | VARCHAR(255) | Owning business unit or department |
| refresh_cadence | VARCHAR(100) | How often data is updated (daily, weekly, etc.) |
| data_start_date | DATE | Earliest date of data covered |
| data_end_date | DATE (nullable) | Latest date covered (null = ongoing) |
| status | ENUM | `draft` \| `published` \| `archived` |
| drupal_node_id | INTEGER (nullable) | Set when a Drupal page exists for this report |
| elastic_doc_id | VARCHAR (nullable) | Elastic document ID for this entry |
| created_at | TIMESTAMPTZ | When the catalog entry was created |
| updated_at | TIMESTAMPTZ | Last modification (auto-updated) |
| embedding | VECTOR(1536) | Semantic embedding for NLP search (pgvector, optional) |

### Entity: DataField

Represents a specific metric, dimension, or column that appears in one or more reports. Staff can browse all reports that contain a given field (e.g., "fiscal year", "patient ID", "revenue").

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Stable identifier |
| name | VARCHAR(255) | Field name as it appears in reports (e.g., "Fiscal Year") |
| slug | VARCHAR(255) | URL-safe name for filtering |
| description | TEXT | What this field represents |
| data_type | VARCHAR(50) | `string` \| `number` \| `date` \| `boolean` \| `geo` |
| source_system | VARCHAR(255) | Source database or system (e.g., "Workday", "Epic") |

### Entity: Category

A hierarchical taxonomy. Top-level categories might be "Department", "Topic", or "Data Domain". Categories can have parent categories for nested navigation (e.g., Finance > Budget > Capital).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | Stable identifier |
| name | VARCHAR(255) | Display name |
| slug | VARCHAR(255) | URL-safe filter key |
| parent_id | UUID FK → Category | Enables tree hierarchy (nullable = root) |
| type | ENUM | `department` \| `topic` \| `data_domain` \| `audience` |

### Junction Tables

- `report_data_fields` — Report ↔ DataField (many-to-many)
- `report_categories` — Report ↔ Category (many-to-many)
- `report_tags` — Report ↔ free-text tags (lightweight alternative to categories)

> **Design note:** Tags are stored as a simple array column on Report (e.g., PostgreSQL `text[]`) for quick filtering, while Categories are a proper relational hierarchy used for faceted navigation. Use both: tags for ad-hoc labeling, categories for structured browse trees.

---

## 4. Application Layers

### 4.1 Backend — Node.js API Server

Built with Express and TypeScript. TypeORM manages database access with decorator-based entities, type-safe queries, and schema migrations. TypeORM supports both Oracle (production) and PostgreSQL (development) from the same entity code — the target database is selected via the `DB_TYPE` environment variable. The API follows REST conventions with JSON request/response bodies.

#### Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/reports | List reports with filtering, sorting, pagination |
| GET | /api/reports/:id | Full detail for a single report |
| POST | /api/reports | Create a new catalog entry |
| PATCH | /api/reports/:id | Update metadata fields |
| DELETE | /api/reports/:id | Soft-delete (sets status=archived) |
| POST | /api/reports/:id/publish | Trigger Drupal publish job |
| POST | /api/reports/:id/unpublish | Remove Drupal page for this report |
| GET | /api/search | Full-text + semantic search (proxies Elastic) |
| GET | /api/data-fields | List all data fields (for autocomplete/browse) |
| GET | /api/categories | Category tree for navigation |
| GET | /api/reports/:id/similar | Returns semantically similar reports |

#### Authentication

Authentication uses Okta as the identity provider for both human users and machine-to-machine API access:

- **Human users (SSO):** Staff log in via Okta using OpenID Connect (OIDC). The Node.js app validates the resulting JWT. Role-based access is enforced at the API layer: Viewer (browse/search), Editor (create/edit), Admin (delete/manage users).
- **Machine-to-machine (Node.js → Drupal):** The Node.js API uses Okta's Client Credentials flow to obtain a short-lived Bearer token, which it presents to Drupal's JSON:API on every request. Drupal validates the token by calling Okta's token introspection endpoint (see Section 6.3).

### 4.2 Frontend — React SPA

Built with Vite + React 18 + TypeScript + Tailwind CSS. React Query manages server state and cache invalidation. The app has two main surfaces: a staff-facing Browse/Search UI, and an Editor/Admin UI for managing catalog entries.

#### Browse & Search UI

- Search bar with instant results as-you-type (debounced to Elastic)
- Left-hand facet panel: filter by report type, department, category, data field
- Report cards showing title, type badge, owner, last updated, and matched data fields
- "Ask a question" mode: text box where staff describe what they need to know; NLP matching returns relevant reports
- Report detail page: full metadata, preview link, data fields list, similar reports

#### Editor / Admin UI

- Form-based report entry: fill in metadata, select data fields, assign categories and tags
- "Publish to Drupal" button — shows preview of what will be created, requires confirmation
- "Sync to Elastic" button for manual re-index if needed
- Bulk import via CSV for onboarding many reports at once
- Category and data field management screens

---

## 5. Search & Discovery Architecture

Elastic Cloud serves as the search layer. When a report is created or updated in PostgreSQL, a BullMQ background job indexes the report document into Elastic. The React frontend queries the Node.js API, which translates search requests into Elastic DSL queries and returns results.

### 5.1 Elastic Index Structure

Each report is indexed as a document in an index named `report-catalog`. Key fields:

```json
{
  "id": "uuid",
  "title": "Monthly Finance Dashboard",
  "description": "Tracks budget vs actuals by department...",
  "type": "bi_dashboard",
  "department": "Finance",
  "owner": "Jane Smith",
  "tags": ["budget", "actuals", "monthly"],
  "categories": ["Finance", "Budget"],
  "data_fields": ["Fiscal Year", "Department", "GL Account", "Variance"],
  "status": "published",
  "updated_at": "2026-03-15T00:00:00Z",
  "embedding": [0.023, -0.187, ...]
}
```

### 5.2 Full-Text Search

Standard Elastic `multi_match` query across title, description, data_fields, and tags. Results are boosted by field relevance — a match in the title scores higher than a match in the description. Faceted filtering uses Elastic aggregations on type, department, and category.

### 5.3 Semantic / Natural-Language Search

When a staff member types a question like "What report shows me how many patients were seen by each provider this quarter?", the API embeds that question using an embedding model and performs a k-nearest-neighbor (kNN) search against the stored report embeddings in Elastic.

#### Embedding Strategy

- Use OpenAI `text-embedding-3-small` (1536 dimensions) or a self-hosted model via Elastic's ELSER
- Embeddings are generated for a combined text: title + description + data field names
- Stored in Elastic as `dense_vector` and optionally in PostgreSQL via the pgvector extension
- Regenerated automatically when title, description, or data fields change

#### Hybrid Search (Recommended)

Combine full-text and semantic results using Elastic's Reciprocal Rank Fusion (RRF). This gives the best of both worlds: keyword precision and semantic recall. The API always runs both queries and merges the ranked results before returning to the UI.

> **Elastic ELSER option:** Elastic's own ELSER model runs inside Elastic Cloud with no external API calls. If you prefer to avoid sending text to a third-party embedding service, ELSER is a strong built-in alternative that requires no additional infrastructure.

### 5.4 Data Field Linking

Each DataField entity has its own browse page listing all reports that reference it. Staff can navigate the data field index to answer questions like "Which reports use Epic encounter data?" or "Where can I find headcount by cost center?" Data fields are also surfaced in search facets and report detail pages.

---

## 6. Drupal 10 Integration

When an editor clicks "Publish to Drupal" in the catalog UI, the Node.js API enqueues a job that calls the Drupal 10 JSON:API to create or update a content node. The Drupal JSON:API module is enabled by default in Drupal 10 — no custom module needed for the content API itself.

### 6.1 Drupal Content Type: Report Profile

A custom content type called **Report Profile** mirrors the catalog schema. The fields below map directly to catalog metadata:

| Drupal Field | Machine Name | Catalog Source |
|--------------|--------------|----------------|
| Title | title | report.title |
| Description | body | report.description |
| Report Type | field_report_type | report.type (taxonomy term) |
| Report URL | field_report_url | report.url |
| Data Owner | field_data_owner | report.owner_name |
| Department | field_department | report.department (taxonomy term) |
| Last Refreshed | field_last_refreshed | report.updated_at |
| Data Fields | field_data_fields | report.data_fields[] (multi-value text) |
| Categories | field_categories | report.categories[] (taxonomy terms) |
| Catalog Entry ID | field_catalog_id | report.id (for reverse lookup) |

### 6.2 Publish Flow

1. Editor reviews report metadata in the catalog and clicks "Publish to Drupal"
2. Node.js API validates the report is in "published" status and has a title and description
3. API calls Drupal JSON:API: `POST /jsonapi/node/report_profile` (or `PATCH` if `drupal_node_id` already set)
4. On success, Drupal returns the new node's UUID and nid; the catalog stores these in `drupal_node_id`
5. Editor sees a link to the live Drupal page in the catalog UI
6. Subsequent catalog edits show a "Sync to Drupal" button to push updates

### 6.3 Authentication with Drupal (Okta Bearer Token Introspection)

The Node.js API authenticates to Drupal using Okta's **Client Credentials** flow rather than Drupal-native OAuth. This keeps Okta as the single identity provider for the entire stack:

1. The Node.js API calls Okta's token endpoint with its API client credentials to obtain a short-lived Bearer token scoped to `catalog.api`.
2. It passes that token as `Authorization: Bearer <token>` on every JSON:API request to Drupal.
3. A custom Drupal module (`okta_bearer_auth`) intercepts the request, calls Okta's token introspection endpoint to verify the token is active, and if so authenticates the request as a dedicated `api_service` Drupal user.

This approach means Drupal never issues its own tokens and never needs to manage API credentials — Okta is the authority. The `okta_bearer_auth` module is included in the `drupal-demo/custom-modules/` directory of this repository.

**Environment variables required (in Node.js `.env`):**

```env
OKTA_DOMAIN=https://integrator-xxxxxxx.okta.com
OKTA_API_CLIENT_ID=0oaxxxxxxxxxxxxxxx
OKTA_API_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OKTA_AUTH_SERVER=default
DRUPAL_BASE_URL=https://your-drupal-site.example.com
```

**Getting a token and calling Drupal (example):**

```bash
TOKEN=$(curl -s -X POST https://{OKTA_DOMAIN}/oauth2/default/v1/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id={OKTA_API_CLIENT_ID}&client_secret={OKTA_API_CLIENT_SECRET}&scope=catalog.api" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

curl https://your-drupal-site/jsonapi/node/report_profile \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. Elastic Cloud Integration (Publishing & Sync)

Your Elastic Cloud instance already contains indexed content. The catalog adds a second index (`report-catalog`) that joins with existing content in search results. The Node.js API uses the official `@elastic/elasticsearch` JavaScript client.

### 7.1 Sync Strategy

Elastic is a secondary store — PostgreSQL is always the source of truth. Sync happens asynchronously via BullMQ jobs to avoid blocking API responses.

| Trigger | Action |
|---------|--------|
| Report created | Enqueue index job → upsert document in Elastic |
| Report updated | Enqueue update job → partial update of Elastic doc |
| Report archived/deleted | Enqueue delete job → remove or mark deleted in Elastic |
| Bulk import completed | Enqueue bulk index job → multi-doc upsert |
| Manual "Sync" button | Force re-index of one or all reports |
| Nightly cron | Full reconciliation: compare Postgres ↔ Elastic, fix drift |

### 7.2 Index Mapping

Create the index with an explicit mapping before ingesting data:

```json
PUT /report-catalog
{
  "mappings": {
    "properties": {
      "title":       { "type": "text", "boost": 3 },
      "description": { "type": "text" },
      "data_fields": { "type": "text", "boost": 2 },
      "tags":        { "type": "keyword" },
      "type":        { "type": "keyword" },
      "department":  { "type": "keyword" },
      "categories":  { "type": "keyword" },
      "status":      { "type": "keyword" },
      "updated_at":  { "type": "date" },
      "embedding": {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine"
      }
    }
  }
}
```

### 7.3 Joining with Existing Elastic Content

Since your Elastic instance already has content, the catalog index will appear alongside existing indices in search. Two integration approaches are possible:

- **Multi-index search:** Elastic supports searching across `report-catalog, existing-index-*` in a single query. The API can fan out and merge results with a unified relevance score.
- **Cross-index links:** If existing Elastic documents reference report names or IDs, you can add a field to those documents pointing to the catalog entry, enabling rich "related reports" features in search results.

---

## 8. Development Environment

A Docker Compose environment is provided in `drupal-demo/` for local development and demonstration of the Drupal integration. It runs a fully configured Drupal 10 instance with the Report Profile content type, Okta SSO, and Bearer token validation pre-configured.

### 8.1 Services

| Service | Port | Description |
|---------|------|-------------|
| drupal | 8080 | Drupal 10 with Apache and PHP 8.2 |
| mariadb | (internal) | Database for Drupal |
| adminer | 8082 | Database browser UI |

### 8.2 Quick Start

```bash
cd drupal-demo
cp .env.example .env
# Fill in your Okta credentials in .env, then:
docker compose up --build -d
bash setup.sh
```

`setup.sh` provisions the Drupal site, creates the Report Profile content type and sample content, and enables the OpenID Connect and Consumers modules. If a `./config/` directory exists from a prior setup, it restores from that instead — preserving your Okta configuration without any manual UI steps.

### 8.3 Okta Setup

Each developer configures their own Okta developer account (free at developer.okta.com). See `drupal-demo/OKTA_SETUP.md` for the full step-by-step guide, including:

- Creating the Drupal SSO web application (OIDC)
- Creating the API Services application (Client Credentials)
- Setting up the `catalog.api` custom scope and authorization policy
- Configuring Drupal's OpenID Connect module
- Enabling Bearer token validation via the `okta_bearer_auth` module

The guide includes **config checkpoints** — after completing each major milestone, developers export Drupal's configuration to `./config/`. Future rebuilds restore from this automatically. Since each developer has their own Okta credentials, the `./config/` directory is excluded from git.

### 8.4 Confirmed Working (Demo Environment)

The following has been tested and confirmed working in the Docker development environment:

- Drupal 10 running in Docker with a Composer-managed install
- Staff SSO login via Okta OIDC (the "Log in with Okta" button on the Drupal login page)
- Machine-to-machine Bearer token flow: Node.js → Okta Client Credentials → Drupal JSON:API
- Report Profile content type with all catalog metadata fields
- Config export/import for zero-manual-config rebuilds

---

## 9. Development Roadmap

A phased approach allows you to deliver value quickly and add sophistication over time.

### Phase 1 — Foundation (Weeks 1–4)

- Set up Node.js + Express + TypeScript project with TypeORM, targeting Oracle (production) and PostgreSQL (development)
- Define and migrate the core schema: Report, DataField, Category, junction tables
- Build CRUD REST API with Okta JWT authentication
- Build React SPA shell: routing, layout, admin form for creating/editing reports
- Manual data entry: staff can add reports, assign data fields and categories

### Phase 2 — Search & Discovery (Weeks 5–8)

- Connect `@elastic/elasticsearch` client; create `report-catalog` index with mapping
- Implement BullMQ sync jobs: index on create/update, delete on archive
- Build search endpoint (full-text + facets) and wire up the React search UI
- Add data field and category browse pages
- Bulk CSV import for onboarding existing report inventory

### Phase 3 — Semantic Search & NLP (Weeks 9–11)

- Integrate embedding generation (OpenAI API or Elastic ELSER)
- Add kNN search path and hybrid RRF query in the search endpoint
- "Ask a question" UI mode with natural-language input
- "Similar reports" sidebar on report detail page

### Phase 4 — Drupal Integration (Weeks 12–14)

- ✅ Drupal 10 dev environment with Docker Compose (complete)
- ✅ Report Profile content type (complete)
- ✅ Okta SSO for Drupal human login (complete)
- ✅ Okta Bearer token validation in Drupal (`okta_bearer_auth` module) (complete)
- Build Drupal publish/sync service in Node.js using the JSON:API + Okta Client Credentials
- "Publish to Drupal" and "Sync to Drupal" buttons in the editor UI
- Webhook or scheduled job to detect Drupal node deletion and clear `drupal_node_id`

### Phase 5 — Polish & Operations (Weeks 15–16)

- Nightly reconciliation job (Postgres ↔ Elastic drift detection)
- Admin dashboard: catalog stats, sync health, recently added/updated reports
- Notifications: email alerts when a report is unpublished or has a broken URL
- Documentation, staff training, and production deployment

---

## 10. Technology Stack Summary

| Layer | Technology | Purpose | Notes |
|-------|------------|---------|-------|
| Frontend | React 18 + Vite + TypeScript | Staff UI | Tailwind CSS for styling |
| Frontend | React Query (TanStack) | Server state + caching | Replaces Redux for API data |
| Frontend | Elastic Search UI (optional) | Search components | Pre-built facet/result UI |
| Backend | Node.js 22 + Express | REST API server | TypeScript throughout |
| Backend | TypeORM + oracledb / pg | DB access + migrations | Supports Oracle and PostgreSQL from same entity code |
| Backend | BullMQ + Redis | Async job queue | Elastic sync, Drupal publish |
| Database | Oracle (prod) / PostgreSQL (dev) | Source of truth | Switched via `DB_TYPE` env var |
| Search | Elastic Cloud (existing) | Full-text + kNN search | `@elastic/elasticsearch` client |
| Embeddings | OpenAI text-embedding-3-small | Semantic search vectors | Or Elastic ELSER (built-in) |
| CMS | Drupal 10 JSON:API | Publish report pages | Auth via Okta Bearer tokens |
| Identity | Okta | SSO (OIDC) + API auth (Client Credentials) | Single IdP for entire stack |
| Auth (Drupal) | Custom `okta_bearer_auth` module | Validates Okta tokens in Drupal | Calls Okta introspection endpoint |
| Dev Environment | Docker + Docker Compose | Local Drupal demo | See `drupal-demo/` |

---

## 11. Key Design Decisions & Alternatives

### Why PostgreSQL as source of truth, not Elastic?

Elastic is optimized for search — not for transactional consistency, relational integrity, or complex updates. Keeping PostgreSQL as the authoritative store means you have ACID guarantees, easy migrations, and a reliable fallback if Elastic goes out of sync. Elastic is then treated as a derived read model, always rebuildable from Postgres.

### Why a standalone app rather than building inside Drupal?

A separate Node.js app gives the catalog its own lifecycle, data model, and API surface independent of Drupal's content model. Staff can use the catalog even when the Drupal site is under maintenance, and future integrations (beyond Drupal and Elastic) are easier to add. Drupal remains the public presentation layer, not the data store.

### Why Okta for Drupal API auth instead of Drupal's Simple OAuth module?

Using Okta as the token authority for machine-to-machine calls means the entire stack — React SPA, Node.js API, and Drupal — all trust the same identity provider. There are no separate Drupal OAuth clients to manage, no Drupal-issued tokens, and no credential drift between environments. The `okta_bearer_auth` module is lightweight: it simply calls Okta's introspection endpoint and maps a valid token to a dedicated Drupal service account. This pattern also makes it straightforward to add other consumers (e.g., a mobile app or a data pipeline) without touching Drupal configuration.

### Embedding model choice

OpenAI `text-embedding-3-small` offers strong quality at low cost and minimal infrastructure. Elastic ELSER is a compelling alternative if you prefer to keep all data within your Elastic Cloud tenant and avoid third-party API calls. Both produce embeddings stored in Elastic's `dense_vector` field; switching between them requires a re-index but no schema change.

---

> **Next step:** Phase 1 can be started immediately — the catalog is useful as a searchable metadata database even before Elastic or Drupal integrations are live. The Drupal demo environment (`drupal-demo/`) is available for integration testing throughout development.
