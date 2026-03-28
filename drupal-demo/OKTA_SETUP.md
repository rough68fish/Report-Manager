# Okta Setup Guide — Report Catalog Demo

This guide reflects the exact steps that were tested and confirmed working.

**What you'll set up:**
1. A free Okta developer account
2. An **OIDC Web App** — for human users logging into Drupal via SSO
3. An **API Services App** — for the Node.js catalog API (machine-to-machine)
4. A **custom scope and authorization policy** — required for client credentials flow
5. Drupal configured to use Okta for login
6. Verified API token access

---

## Config Checkpoints — Save Your Progress

Drupal admin configuration (SSO settings, content types, roles, etc.) lives in the
database, not in code. If you rebuild your Docker containers, you'd normally have to
redo all the Drupal UI steps. **Config checkpoints** let you avoid that.

At key points in this guide you'll see a **💾 Checkpoint** instruction. Run it to
export your Drupal config to the `./config/` directory. The `setup.sh` script
automatically detects this folder and restores everything on the next rebuild — so
you only have to click through the Drupal admin UI once.

**The checkpoint command (run in Git Bash from your `drupal-demo/` folder):**
```bash
MSYS_NO_PATHCONV=1 docker exec report_catalog_drupal \
  /var/www/html/vendor/bin/drush --root=/var/www/html/web \
  config:export --destination=/var/www/html/config -y
```

> **Note:** Each developer has their own Okta account and credentials, so the
> `./config/` folder is listed in `.gitignore` and is not committed to the repo.
> Keep your `./config/` folder as a local backup only.

---

## Part 1 — Create Your Okta Developer Account

1. Go to **https://developer.okta.com/signup/**
2. Fill in the form and create your account
3. Check your email and verify your account
4. Log into your Okta admin console — the URL will look like:
   `https://integrator-xxxxxxx.okta.com`

   **Save this URL — it is your `OKTA_DOMAIN`**

---

## Part 2 — Create the Drupal SSO Application (Web App)

This app handles human users logging into Drupal via Okta.

1. In your Okta admin console, go to **Applications → Applications**
2. Click **Create App Integration**
3. Select:
   - Sign-in method: **OIDC - OpenID Connect**
   - Application type: **Web Application**
4. Click **Next**
5. Fill in the settings:
   - **App integration name:** `Report Catalog Drupal (Dev)`
   - **Grant types:** check `Authorization Code` (should be pre-checked)
   - **Sign-in redirect URIs:** `http://localhost:8080/openid-connect/okta`
   - **Sign-out redirect URIs:** `http://localhost:8080/user/logout`
   - **Controlled access:** choose `Allow everyone in your organization to access`
6. Click **Save**
7. On the app detail page, note down:
   - **Client ID** → this is your `OKTA_CLIENT_ID`
   - **Client Secret** (click to reveal) → this is your `OKTA_CLIENT_SECRET`

---

## Part 3 — Create the API Service Application (Node.js Catalog)

This app lets the Node.js catalog API authenticate with Okta and call Drupal's JSON:API.

1. Go to **Applications → Applications → Create App Integration**
2. Select:
   - Sign-in method: **API Services**
3. Click **Next**
4. Fill in:
   - **App integration name:** `Report Catalog API (Dev)`
5. Click **Save**
6. On the app detail page, note down:
   - **Client ID** → this is your `OKTA_API_CLIENT_ID`
   - **Client Secret** (click to reveal) → this is your `OKTA_API_CLIENT_SECRET`
7. Still on the app, click the **General** tab and scroll down to **Proof of possession**
   — **uncheck DPoP** and save. DPoP is enabled by default on API Services apps but
   requires additional cryptographic headers that aren't needed for a dev setup.

---

## Part 4 — Create a Custom Scope for API Access

The Client Credentials flow cannot use the `openid` scope (that's for user login flows
only). You need a custom scope for machine-to-machine API access.

1. Go to **Security → API → Authorization Servers**
2. Click on **default**
3. Click the **Scopes** tab → **Add Scope**
4. Fill in:
   - **Name:** `catalog.api`
   - **Display phrase:** `Report Catalog API Access`
   - **Description:** `Access to Report Catalog API`
   - Leave all other options as defaults
5. Click **Create**

---

## Part 5 — Add an Authorization Policy for Client Credentials

By default the authorization server has no policies, so client credentials requests are
denied. You need to add a policy and a rule explicitly permitting this flow.

1. Still in **Security → API → Authorization Servers → default**
2. Click the **Access Policies** tab
3. Click **Add Policy**:
   - **Name:** `Client Credentials Policy`
   - **Description:** `Allows API service apps to use client credentials`
   - **Assign to:** select your **Report Catalog API (Dev)** app specifically
4. Click **Create Policy** — you'll land inside the new policy
5. Click **Add Rule**:
   - **Rule Name:** `Allow Client Credentials`
   - **Grant type:** check **Client Credentials** only (uncheck any others)
   - **Scopes:** select **The following scopes** → add `catalog.api`
   - Leave all other settings as defaults
6. Click **Create Rule**

---

## Part 6 — Configure Drupal to Use Okta SSO

### 6a. Open the OpenID Connect settings in Drupal

1. Log into Drupal at http://localhost:8080/user/login using your local admin account
2. Go to **Admin → Configuration → Web Services → OpenID Connect**
   (or directly: http://localhost:8080/admin/config/services/openid-connect)

### 6b. Add the Okta client

1. Click **Add client**
2. Choose plugin type: **Okta** (not Generic — the Okta plugin pre-fills all endpoints)
3. Fill in:
   - **Label:** `Okta`
   - **Client ID:** *(paste from Part 2)*
   - **Client Secret:** *(paste from Part 2)*
   - **Okta domain:** your Okta domain, e.g. `https://integrator-xxxxxxx.okta.com`
4. Under **Scopes**, ensure these are listed: `openid email profile`
5. Click **Save**

> **Why Okta plugin, not Generic?** The Okta-specific plugin pre-configures all
> authorization, token, and userinfo endpoint URLs based on your domain. Using it
> also sets the redirect URI to `/openid-connect/okta`, which must match what you
> entered in Part 2.

### 6c. Enable the Okta login button

1. Still on the OpenID Connect config page, enable **Override login** so the Drupal
   login form shows a **Log in with Okta** button
2. Save configuration

### 6d. Configure user account settings

1. Go to the **Settings** tab of OpenID Connect config
2. Under **User account settings**, enable:
   - **Automatically connect existing users** (matches on email address)
   - **Create user accounts** (provisions a Drupal account on first Okta login)
3. Save

> **Note on claims mapping:** The `email` and `name`/`username` claims are mapped
> automatically by the module and do not appear in the UI. The "User claims mapping"
> section only shows additional profile fields like Timezone and Picture — you can
> leave those unmapped.

---

## Part 7 — Test the SSO Login

1. Open a private/incognito window and go to http://localhost:8080
2. You'll be redirected to the login page (anonymous access is blocked)
3. Click **Log in with Okta**
4. You'll be redirected to Okta — log in with your Okta developer credentials
5. Okta redirects back to Drupal and you're logged in with a provisioned account

### 💾 Checkpoint 1 — SSO Login Working

You've confirmed SSO login works. Save your Drupal configuration now so you won't
have to repeat Parts 6–7 if you rebuild your containers.

```bash
MSYS_NO_PATHCONV=1 docker exec report_catalog_drupal \
  /var/www/html/vendor/bin/drush --root=/var/www/html/web \
  config:export --destination=/var/www/html/config -y
```

---

## Part 8 — Test API Access with an Okta Token

The Node.js catalog API uses **Client Credentials** flow: it gets a short-lived token
from Okta and passes it as a Bearer header on every JSON:API request.

### 8a. Get an access token

Run this in Git Bash (substitute your real values):

```bash
curl -X POST https://{YOUR_OKTA_DOMAIN}/oauth2/default/v1/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id={OKTA_API_CLIENT_ID}&client_secret={OKTA_API_CLIENT_SECRET}&scope=catalog.api"
```

A successful response looks like:
```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "eyJraWQiOiJ...",
  "scope": "catalog.api"
}
```

### 8b. Call the Drupal JSON:API with the token

```bash
curl http://localhost:8080/jsonapi/node/report_profile \
  -H "Authorization: Bearer {ACCESS_TOKEN_FROM_ABOVE}"
```

> **Note:** Drupal will return a 401 until it is configured to validate Okta-issued
> Bearer tokens. See Part 9 below. For quick local testing, Basic Auth with your
> admin account works in the meantime:
> `curl http://localhost:8080/jsonapi/node/report_profile -u admin:your_password`

---

## Part 9 — Enable Bearer Token Validation in Drupal (JSON:API)

This is handled by a custom Drupal module (`okta_bearer_auth`) included in the
project. When a request arrives with a Bearer token, the module calls Okta's
introspection endpoint to verify it, then authenticates the request as a dedicated
API service account in Drupal.

### 9a. Add your Okta API credentials to .env

Open your `.env` file and fill in the API Services app values from Part 3:

```env
OKTA_DOMAIN=https://integrator-xxxxxxx.okta.com
OKTA_API_CLIENT_ID=0oaxxxxxxxxxxxxxxx
OKTA_API_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OKTA_AUTH_SERVER=default
```

### 9b. Restart containers to mount the custom module

The `docker-compose.yml` mounts the `custom-modules/` directory into the container.
If the containers are already running, restart them to pick up the mount:

```bash
docker compose restart drupal
```

### 9c. Run the configuration script

```bash
bash okta-configure.sh
```

This script:
- Enables the `okta_bearer_auth` module
- Writes your Okta credentials into Drupal config
- Creates a Drupal `api_service` account (with a random unusable password)
  that all valid Okta API tokens authenticate as

### 9d. Test end-to-end

The script prints the exact test commands when it finishes, but here they are:

```bash
# Step 1 — get a token from Okta
TOKEN=$(curl -s -X POST https://{OKTA_DOMAIN}/oauth2/default/v1/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id={OKTA_API_CLIENT_ID}&client_secret={OKTA_API_CLIENT_SECRET}&scope=catalog.api" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

# Step 2 — call the JSON:API with the token
curl http://localhost:8080/jsonapi/node/report_profile \
  -H "Authorization: Bearer $TOKEN"
```

You should now get a full list of report profiles rather than an empty result.

### 💾 Checkpoint 2 — Full API Auth Working

You've confirmed end-to-end Bearer token validation works. Save your Drupal
configuration now so `okta_bearer_auth` module settings are captured along with
everything from Checkpoint 1.

```bash
MSYS_NO_PATHCONV=1 docker exec report_catalog_drupal \
  /var/www/html/vendor/bin/drush --root=/var/www/html/web \
  config:export --destination=/var/www/html/config -y
```

> **After a rebuild:** Run `docker compose down -v && docker compose up --build -d`
> then `bash setup.sh`. The script will detect your `./config/` folder and restore
> all settings automatically, including the `okta_bearer_auth` module and its
> credentials. SSO and Bearer token auth will both work without any manual
> Drupal configuration.

---

## Environment Variables Summary

Add these to your `.env` file and to the Node.js catalog `.env` when you build it:

```env
# Okta domain (no trailing slash)
OKTA_DOMAIN=https://integrator-xxxxxxx.okta.com

# Drupal SSO Web Application (handles human user login)
OKTA_CLIENT_ID=0oaxxxxxxxxxxxxxxx
OKTA_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Node.js catalog API Service Application (machine-to-machine)
OKTA_API_CLIENT_ID=0oaxxxxxxxxxxxxxxx
OKTA_API_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Okta authorization server (use 'default' unless you created a custom one)
OKTA_AUTH_SERVER=default
```

---

## Troubleshooting

**"redirect_uri_mismatch" error from Okta**
The redirect URI in your Okta app must exactly match what Drupal sends.
Your Okta Web App needs: `http://localhost:8080/openid-connect/okta`
If you configured the Drupal plugin as "generic" instead of "okta", use `/openid-connect/generic`.

**"invalid_dpop_proof" error when getting a token**
DPoP is enabled on the API Services app by default. Go to the app → General tab →
Proof of possession → uncheck DPoP → Save. Then retry.

**"invalid_scope" error — cannot request openid with client credentials**
The `openid` scope is for user login flows only. Use your custom scope (`catalog.api`)
and the `/oauth2/default/v1/token` endpoint, not `/oauth2/v1/token`.

**"access_denied / Policy evaluation failed" error**
The authorization server has no policy permitting client credentials. Follow Part 5
to add a policy assigned to your API app and a rule allowing the client credentials
grant type with the `catalog.api` scope.

**User logs in via Okta but gets "Access Denied" in Drupal**
The Drupal user account wasn't provisioned. Ensure **Create user accounts** is
enabled in OpenID Connect settings and that the email claim is mapped.

**Bearer token returns 401 from JSON:API**
Drupal isn't yet validating Okta tokens. Use Basic Auth for dev testing while you
set up token introspection (see Part 9).

**Okta login button doesn't appear on /user/login**
Clear Drupal's cache:
```bash
docker exec report_catalog_drupal /var/www/html/vendor/bin/drush --root=/var/www/html/web cache:rebuild
```
