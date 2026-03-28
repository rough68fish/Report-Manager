#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Report Catalog Demo — Drupal Setup Script
#
# Run this ONCE after "docker compose up -d" to install and configure Drupal.
# Usage:  bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

CONTAINER="report_catalog_drupal"

# Windows/Git Bash: disable MSYS path translation for docker exec arguments
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

DRUSH="docker exec $CONTAINER /var/www/html/vendor/bin/drush --root=/var/www/html/web"

# Load .env — strip Windows CRLF line endings before parsing
if [ -f .env ]; then
  export $(sed 's/\r//' .env | grep -v '^#' | grep -v '^$' | xargs)
else
  echo "❌  .env file not found. Copy .env.example to .env first."
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Report Catalog Demo — Drupal 10 Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Wait for Drupal container to be healthy ────────────────────────────────
echo ""
echo "⏳  Waiting for Drupal container to be ready..."
until [ "$(docker exec $CONTAINER php -r 'echo "ok";' 2>/dev/null)" = "ok" ]; do
  sleep 3
  echo "   still waiting..."
done
echo "✅  Container is ready."

# ── 2. Install Drupal via Drush ───────────────────────────────────────────────
echo ""
echo "⏳  Installing Drupal (this takes ~60 seconds)..."
$DRUSH site:install standard \
  --db-url="mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mariadb/${MYSQL_DATABASE}" \
  --site-name="${DRUPAL_SITE_NAME:-Report Catalog Demo}" \
  --account-name="${DRUPAL_ADMIN_USER:-admin}" \
  --account-pass="${DRUPAL_ADMIN_PASSWORD:-admin_password123}" \
  --account-mail="${DRUPAL_ADMIN_EMAIL:-admin@example.com}" \
  --yes 2>&1
echo "✅  Drupal installed."

# ── 2b. Import saved config if it exists (restores Okta + all settings) ───────
if [ -f "./config/system.site.yml" ]; then
  echo ""
  echo "⏳  Saved config found — importing (restores Okta SSO and all settings)..."
  # Sync the site UUID from the exported config so import doesn't reject it
  EXPORTED_UUID=$(grep "^uuid:" ./config/system.site.yml | awk '{print $2}')
  $DRUSH php:eval "\Drupal::configFactory()->getEditable('system.site')->set('uuid', '${EXPORTED_UUID}')->save();"
  $DRUSH config:import --source=/var/www/html/config --yes 2>&1
  $DRUSH cache:rebuild 2>&1
  echo "✅  Config imported — Okta SSO and all settings restored."
  echo ""
  echo "  ✅  Setup complete (config restored from export)."
  echo "  Run okta-configure.sh if the API service account is missing."
  exit 0
fi

# ── 3. Enable core modules ────────────────────────────────────────────────────
echo ""
echo "⏳  Enabling JSON:API, REST, and helper modules..."
$DRUSH pm:enable \
  jsonapi \
  rest \
  basic_auth \
  serialization \
  taxonomy \
  field \
  field_ui \
  text \
  link \
  datetime \
  options \
  --yes 2>&1
echo "✅  Core modules enabled."

# ── 4. Create taxonomy vocabularies ──────────────────────────────────────────
echo ""
echo "⏳  Creating taxonomy vocabularies..."

# Report Type vocabulary
$DRUSH php:eval "
  \$vocab = \Drupal\taxonomy\Entity\Vocabulary::create([
    'vid' => 'report_type',
    'name' => 'Report Type',
    'description' => 'Type of report or dashboard',
  ]);
  \$vocab->save();
  echo 'Created report_type vocabulary\n';
"

# Department vocabulary
$DRUSH php:eval "
  \$vocab = \Drupal\taxonomy\Entity\Vocabulary::create([
    'vid' => 'department',
    'name' => 'Department',
    'description' => 'Owning department or business unit',
  ]);
  \$vocab->save();
  echo 'Created department vocabulary\n';
"

# Seed Report Type terms
for TERM in "BI Dashboard" "PDF Report" "Web / Embedded Report" "SQL / Data Extract"; do
  $DRUSH php:eval "
    \$term = \Drupal\taxonomy\Entity\Term::create([
      'vid' => 'report_type',
      'name' => '$TERM',
    ]);
    \$term->save();
    echo 'Created term: $TERM\n';
  "
done

# Seed Department terms
for DEPT in "Finance" "Human Resources" "Operations" "Clinical" "IT" "Executive"; do
  $DRUSH php:eval "
    \$term = \Drupal\taxonomy\Entity\Term::create([
      'vid' => 'department',
      'name' => '$DEPT',
    ]);
    \$term->save();
    echo 'Created department: $DEPT\n';
  "
done

echo "✅  Taxonomy vocabularies and terms created."

# ── 5. Create the Report Profile content type ─────────────────────────────────
echo ""
echo "⏳  Creating Report Profile content type..."

$DRUSH php:eval "
  \$node_type = \Drupal\node\Entity\NodeType::create([
    'type' => 'report_profile',
    'name' => 'Report Profile',
    'description' => 'A catalog entry for a report, dashboard, or data extract.',
    'new_revision' => FALSE,
  ]);
  \$node_type->save();
  echo 'Created content type: report_profile\n';
"

# ── 6. Add fields to Report Profile ──────────────────────────────────────────
echo ""
echo "⏳  Adding fields to Report Profile content type..."

$DRUSH php:eval "
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\field\Entity\FieldConfig;
use Drupal\Core\Field\FieldStorageDefinitionInterface;

\$fields = [
  [
    'field_name' => 'field_report_url',
    'type' => 'link',
    'label' => 'Report URL',
    'cardinality' => 1,
  ],
  [
    'field_name' => 'field_owner_name',
    'type' => 'string',
    'label' => 'Data Owner',
    'cardinality' => 1,
  ],
  [
    'field_name' => 'field_owner_email',
    'type' => 'email',
    'label' => 'Owner Email',
    'cardinality' => 1,
  ],
  [
    'field_name' => 'field_refresh_cadence',
    'type' => 'string',
    'label' => 'Refresh Cadence',
    'cardinality' => 1,
  ],
  [
    'field_name' => 'field_data_fields',
    'type' => 'string',
    'label' => 'Data Fields / Metrics',
    'cardinality' => FieldStorageDefinitionInterface::CARDINALITY_UNLIMITED,
  ],
  [
    'field_name' => 'field_catalog_id',
    'type' => 'string',
    'label' => 'Catalog Entry ID',
    'cardinality' => 1,
  ],
];

foreach (\$fields as \$f) {
  if (!FieldStorageConfig::loadByName('node', \$f['field_name'])) {
    FieldStorageConfig::create([
      'field_name' => \$f['field_name'],
      'entity_type' => 'node',
      'type' => \$f['type'],
      'cardinality' => \$f['cardinality'],
    ])->save();
  }
  if (!FieldConfig::loadByName('node', 'report_profile', \$f['field_name'])) {
    FieldConfig::create([
      'field_name' => \$f['field_name'],
      'entity_type' => 'node',
      'bundle' => 'report_profile',
      'label' => \$f['label'],
      'required' => FALSE,
    ])->save();
    echo 'Added field: ' . \$f['label'] . PHP_EOL;
  }
}
"

# Add Report Type taxonomy reference field
$DRUSH php:eval "
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\field\Entity\FieldConfig;

if (!FieldStorageConfig::loadByName('node', 'field_report_type')) {
  FieldStorageConfig::create([
    'field_name' => 'field_report_type',
    'entity_type' => 'node',
    'type' => 'entity_reference',
    'settings' => ['target_type' => 'taxonomy_term'],
    'cardinality' => 1,
  ])->save();
}
if (!FieldConfig::loadByName('node', 'report_profile', 'field_report_type')) {
  FieldConfig::create([
    'field_name' => 'field_report_type',
    'entity_type' => 'node',
    'bundle' => 'report_profile',
    'label' => 'Report Type',
    'settings' => ['handler' => 'default:taxonomy_term', 'handler_settings' => ['target_bundles' => ['report_type' => 'report_type']]],
  ])->save();
  echo 'Added field: Report Type' . PHP_EOL;
}
"

# Add Department taxonomy reference field
$DRUSH php:eval "
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\field\Entity\FieldConfig;

if (!FieldStorageConfig::loadByName('node', 'field_department')) {
  FieldStorageConfig::create([
    'field_name' => 'field_department',
    'entity_type' => 'node',
    'type' => 'entity_reference',
    'settings' => ['target_type' => 'taxonomy_term'],
    'cardinality' => 1,
  ])->save();
}
if (!FieldConfig::loadByName('node', 'report_profile', 'field_department')) {
  FieldConfig::create([
    'field_name' => 'field_department',
    'entity_type' => 'node',
    'bundle' => 'report_profile',
    'label' => 'Department',
    'settings' => ['handler' => 'default:taxonomy_term', 'handler_settings' => ['target_bundles' => ['department' => 'department']]],
  ])->save();
  echo 'Added field: Department' . PHP_EOL;
}
"

echo "✅  All fields added to Report Profile."

# ── 7. Create sample Report Profile nodes ─────────────────────────────────────
echo ""
echo "⏳  Creating sample report entries..."

$DRUSH php:eval "
use Drupal\node\Entity\Node;

\$samples = [
  [
    'title' => 'Monthly Finance Dashboard',
    'body' => 'Tracks budget vs. actuals by department and GL account. Updated monthly after the close.',
    'report_type' => 'BI Dashboard',
    'department' => 'Finance',
    'owner' => 'Finance Analytics Team',
    'cadence' => 'Monthly',
    'url' => 'https://example.com/dashboards/finance-monthly',
    'fields' => ['Fiscal Year', 'Department', 'GL Account', 'Budget', 'Actuals', 'Variance'],
  ],
  [
    'title' => 'HR Headcount & Turnover Report',
    'body' => 'Monthly snapshot of headcount by department, role, and location. Includes voluntary and involuntary turnover rates.',
    'report_type' => 'PDF Report',
    'department' => 'Human Resources',
    'owner' => 'People Analytics',
    'cadence' => 'Monthly',
    'url' => 'https://example.com/reports/hr-headcount',
    'fields' => ['Employee ID', 'Department', 'Job Title', 'Location', 'Hire Date', 'Termination Date'],
  ],
  [
    'title' => 'Operational KPI Scorecard',
    'body' => 'Weekly scorecard of key operational metrics across all departments. Used in leadership meetings.',
    'report_type' => 'BI Dashboard',
    'department' => 'Operations',
    'owner' => 'Operations Analytics',
    'cadence' => 'Weekly',
    'url' => 'https://example.com/dashboards/ops-kpi',
    'fields' => ['Week', 'Department', 'KPI Name', 'Target', 'Actual', 'Status'],
  ],
];

foreach (\$samples as \$s) {
  // Look up taxonomy term IDs
  \$type_terms = \Drupal::entityTypeManager()->getStorage('taxonomy_term')
    ->loadByProperties(['vid' => 'report_type', 'name' => \$s['report_type']]);
  \$dept_terms = \Drupal::entityTypeManager()->getStorage('taxonomy_term')
    ->loadByProperties(['vid' => 'department', 'name' => \$s['department']]);

  \$type_term = reset(\$type_terms);
  \$dept_term = reset(\$dept_terms);

  \$data_fields = array_map(fn(\$f) => ['value' => \$f], \$s['fields']);

  \$node = Node::create([
    'type' => 'report_profile',
    'title' => \$s['title'],
    'body' => ['value' => \$s['body'], 'format' => 'plain_text'],
    'field_owner_name' => \$s['owner'],
    'field_refresh_cadence' => \$s['cadence'],
    'field_report_url' => ['uri' => \$s['url'], 'title' => 'Open Report'],
    'field_data_fields' => \$data_fields,
    'field_report_type' => \$type_term ? ['target_id' => \$type_term->id()] : NULL,
    'field_department' => \$dept_term ? ['target_id' => \$dept_term->id()] : NULL,
    'status' => 1,
  ]);
  \$node->save();
  echo 'Created: ' . \$s['title'] . PHP_EOL;
}
"

echo "✅  Sample reports created."

# ── 8. Configure JSON:API (read/write, authenticated users only) ──────────────
echo ""
echo "⏳  Configuring JSON:API permissions..."
$DRUSH php:eval "
  \$config = \Drupal::configFactory()->getEditable('jsonapi.settings');
  \$config->set('read_only', FALSE)->save();
  echo 'JSON:API set to read/write mode\n';
"

# JSON:API requires authenticated users — revoke anonymous content access
$DRUSH php:eval "
  \$role = \Drupal\user\Entity\Role::load('anonymous');
  \$role->revokePermission('access content');
  \$role->save();
  echo 'Anonymous content access revoked (Okta auth required)\n';
"

# Authenticated users can view content and use JSON:API
$DRUSH php:eval "
  \$role = \Drupal\user\Entity\Role::load('authenticated');
  \$role->grantPermission('access content');
  \$role->grantPermission('access jsonapi resources');
  \$role->save();
  echo 'Authenticated users granted content + JSON:API access\n';
"
echo "✅  JSON:API configured (authentication required)."

# ── 9. Enable OpenID Connect (Okta SSO) ───────────────────────────────────────
echo ""
echo "⏳  Enabling OpenID Connect module..."
$DRUSH pm:enable openid_connect consumers --yes 2>&1
echo "✅  OpenID Connect enabled."

# ── 10. Lock down anonymous access (redirect to login / Okta) ─────────────────
echo ""
echo "⏳  Configuring site-wide authentication requirement..."
$DRUSH php:eval "
  // Redirect anonymous users to login page rather than showing 403
  \$config = \Drupal::configFactory()->getEditable('system.site');
  \$config->set('page.403', '/user/login')->save();
  echo 'Anonymous 403 → login redirect configured\n';
"

# Restrict all node content to authenticated users by default
$DRUSH php:eval "
  \$role = \Drupal\user\Entity\Role::load('anonymous');
  // Ensure no content-viewing permissions remain for anonymous
  foreach (['access content', 'view published content'] as \$perm) {
    if (\$role->hasPermission(\$perm)) {
      \$role->revokePermission(\$perm);
    }
  }
  \$role->save();
  echo 'All anonymous content permissions removed\n';
"
echo "✅  Site locked to authenticated users only."

# ── 11. Clear caches ──────────────────────────────────────────────────────────
echo ""
echo "⏳  Clearing caches..."
$DRUSH cache:rebuild 2>&1
echo "✅  Caches cleared."

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Drupal demo setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  🌐  Drupal site:    http://localhost:8080"
echo "  🔑  Admin login:    http://localhost:8080/user/login"
echo "      Username:       ${DRUPAL_ADMIN_USER:-admin}"
echo "      Password:       ${DRUPAL_ADMIN_PASSWORD:-admin_password123}"
echo ""
echo "  🗄️   Adminer (DB):  http://localhost:8082"
echo "      Server:         mariadb"
echo "      Username:       ${MYSQL_USER:-drupal}"
echo "      Password:       ${MYSQL_PASSWORD:-drupal_password123}"
echo ""
echo "  🔌  JSON:API base:  http://localhost:8080/jsonapi"
echo "  📄  Report nodes:   http://localhost:8080/jsonapi/node/report_profile"
echo ""
echo "  ⚠️   Okta not yet configured — site is locked to authenticated users"
echo "       but login still uses local Drupal accounts."
echo "       Follow OKTA_SETUP.md to connect your Okta dev tenant."
echo ""
