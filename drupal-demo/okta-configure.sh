#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Okta Bearer Auth Configuration Script
#
# Run this AFTER setup.sh and AFTER completing OKTA_SETUP.md Parts 1-5.
# It enables the custom auth module, creates the API service account,
# and writes the Okta credentials into Drupal config.
#
# Usage:  bash okta-configure.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

CONTAINER="report_catalog_drupal"
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"
DRUSH="docker exec $CONTAINER /var/www/html/vendor/bin/drush --root=/var/www/html/web"

# Load .env — strip Windows CRLF line endings
if [ -f .env ]; then
  export $(sed 's/\r//' .env | grep -v '^#' | grep -v '^$' | xargs)
else
  echo "❌  .env file not found."
  exit 1
fi

# Validate required Okta variables are set
if [ -z "$OKTA_DOMAIN" ] || [ -z "$OKTA_API_CLIENT_ID" ] || [ -z "$OKTA_API_CLIENT_SECRET" ]; then
  echo "❌  Missing Okta variables in .env"
  echo "    Make sure OKTA_DOMAIN, OKTA_API_CLIENT_ID, and OKTA_API_CLIENT_SECRET are set."
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Okta Bearer Auth — Drupal Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Enable the module ──────────────────────────────────────────────────────
echo ""
echo "⏳  Enabling okta_bearer_auth module..."
$DRUSH pm:enable okta_bearer_auth --yes 2>&1
echo "✅  Module enabled."

# ── 2. Write Okta credentials to Drupal config ────────────────────────────────
echo ""
echo "⏳  Writing Okta configuration..."
$DRUSH php:eval "
  \$config = \Drupal::configFactory()->getEditable('okta_bearer_auth.settings');
  \$config
    ->set('okta_domain', '${OKTA_DOMAIN}')
    ->set('api_client_id', '${OKTA_API_CLIENT_ID}')
    ->set('api_client_secret', '${OKTA_API_CLIENT_SECRET}')
    ->set('auth_server', '${OKTA_AUTH_SERVER:-default}')
    ->set('service_account_name', 'api_service')
    ->save();
  echo 'Okta config saved\n';
"
echo "✅  Okta credentials configured."

# ── 3. Create the API service account ────────────────────────────────────────
echo ""
echo "⏳  Creating API service account..."
$DRUSH php:eval "
  \$storage = \Drupal::entityTypeManager()->getStorage('user');
  \$existing = \$storage->loadByProperties(['name' => 'api_service']);

  if (\$existing) {
    echo 'Service account already exists — skipping\n';
  } else {
    \$user = \$storage->create([
      'name'   => 'api_service',
      'mail'   => 'api_service@localhost.local',
      'status' => 1,
      'pass'   => bin2hex(random_bytes(32)), // random unusable password
      'roles'  => ['authenticated'],
    ]);
    \$user->save();
    echo 'Created service account: api_service (uid=' . \$user->id() . ')\n';
  }
"
echo "✅  API service account ready."

# ── 4. Clear caches ───────────────────────────────────────────────────────────
echo ""
echo "⏳  Clearing caches..."
$DRUSH cache:rebuild 2>&1
echo "✅  Caches cleared."

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Okta Bearer Auth configured!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Test it with:"
echo ""
echo "  TOKEN=\$(curl -s -X POST ${OKTA_DOMAIN}/oauth2/${OKTA_AUTH_SERVER:-default}/v1/token \\"
echo "    -H 'Content-Type: application/x-www-form-urlencoded' \\"
echo "    -d 'grant_type=client_credentials&client_id=${OKTA_API_CLIENT_ID}&client_secret=${OKTA_API_CLIENT_SECRET}&scope=catalog.api' \\"
echo "    | python3 -c \"import json,sys; print(json.load(sys.stdin)['access_token'])\")"
echo ""
echo "  curl http://localhost:8080/jsonapi/node/report_profile \\"
echo "    -H \"Authorization: Bearer \$TOKEN\""
echo ""
