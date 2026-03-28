# Report Catalog Demo — Drupal 10

A Docker-based Drupal 10 site pre-configured for the Report Catalog integration demo.

## What's included

- **Drupal 10** with Apache (port 8080)
- **MariaDB 10.11** — database backend
- **Adminer** — lightweight DB browser (port 8082)
- **Report Profile** content type with all catalog fields
- **JSON:API** enabled in read/write mode
- **Sample reports** pre-loaded (Finance, HR, Operations)

---

## Quick Start

### 1. Prerequisites

- Docker Desktop installed and running
- A terminal (PowerShell, Terminal, or Git Bash on Windows)

### 2. Get the files ready

```bash
cd drupal-demo

# Copy the example env file
cp .env.example .env
```

You can edit `.env` to change passwords if you like, or leave the defaults for a local demo.

### 3. Start the containers

```bash
docker compose up -d
```

The first run will build the custom Drupal image (includes Drush). This takes 2–3 minutes.
Subsequent starts are fast.

Check that containers are running:
```bash
docker compose ps
```

You should see `report_catalog_drupal`, `report_catalog_db`, and `report_catalog_adminer` all running.

### 4. Run the setup script (run once)

```bash
bash setup.sh
```

This script (~90 seconds) will:
- Install Drupal with the admin account from your `.env`
- Enable JSON:API and required modules
- Create the **Report Profile** content type with all fields
- Create taxonomy vocabularies (Report Type, Department)
- Load 3 sample report entries
- Configure JSON:API permissions

### 5. Verify it's working

Open these URLs in your browser:

| URL | What you'll see |
|-----|-----------------|
| http://localhost:8080 | Drupal home page |
| http://localhost:8080/user/login | Admin login |
| http://localhost:8080/jsonapi/node/report_profile | JSON:API — all report nodes |
| http://localhost:8082 | Adminer database browser |

---

## JSON:API Quick Reference

The JSON:API endpoint is what the Node.js catalog uses to push/pull report data.

### List all report profiles
```
GET http://localhost:8080/jsonapi/node/report_profile
```

### Get a single report
```
GET http://localhost:8080/jsonapi/node/report_profile/{uuid}
```

### Create a report profile (requires auth)
```
POST http://localhost:8080/jsonapi/node/report_profile
Authorization: Basic YWRtaW46YWRtaW5fcGFzc3dvcmQxMjM=
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "node--report_profile",
    "attributes": {
      "title": "My New Report",
      "body": { "value": "Description of the report", "format": "plain_text" },
      "field_owner_name": "Analytics Team",
      "field_refresh_cadence": "Weekly",
      "field_data_fields": [
        { "value": "Date" },
        { "value": "Department" }
      ]
    }
  }
}
```

The Basic Auth header above encodes `admin:admin_password123`. Change if you updated `.env`.

---

## Useful Commands

```bash
# View logs
docker compose logs -f drupal

# Open a shell inside the Drupal container
docker exec -it report_catalog_drupal bash

# Run a Drush command
docker exec report_catalog_drupal /var/www/html/vendor/bin/drush <command>

# Clear Drupal caches
docker exec report_catalog_drupal /var/www/html/vendor/bin/drush cache:rebuild

# Stop everything (keeps your data)
docker compose down

# Stop and wipe all data (full reset)
docker compose down -v
```

---

## Connecting the Node.js Catalog API

When you build the Node.js catalog application, it will connect to Drupal using these settings:

```env
DRUPAL_BASE_URL=http://localhost:8080
DRUPAL_API_USER=admin
DRUPAL_API_PASSWORD=admin_password123
DRUPAL_CONTENT_TYPE=report_profile
```

For production, replace Basic Auth with OAuth 2.0 using the **Simple OAuth** module.

---

## Resetting the demo

To start fresh:
```bash
docker compose down -v   # removes volumes (wipes DB)
docker compose up -d
bash setup.sh
```
