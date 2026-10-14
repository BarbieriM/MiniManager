#!/usr/bin/env bash
# Runs the Playwright end-to-end tests (`make e2e`) against a throwaway database, never the dev one:
#   1. starts the local Postgres from compose.yaml and creates mini_manager_e2e on it, fresh;
#   2. applies the migrations and seeds a test Admin (ADR 0002 allows this on throwaway databases only);
#   3. builds and starts the API on :8090 with emails to a temporary outbox and Photos off;
#   4. runs Playwright, which starts Vite on :5174 pointing at that API;
#   5. stops the API and drops the database, even when a test fails.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
database="mini_manager_e2e"
database_url="postgres://mini:mini@localhost:5433/${database}?sslmode=disable"
api_port=8090
web_port=5174
# The test Admin, seeded below and passed to the tests: the one place its credentials are written.
admin_email="e2e-admin@example.com"
admin_password="e2e admin password"
work_dir="$(mktemp -d)"
server_pid=""

psql_in_db() {
  docker compose -f "$root/compose.yaml" exec -T db psql --username mini --dbname mini_manager --quiet --command "$1"
}

cleanup() {
  if [ -n "$server_pid" ]; then kill "$server_pid" 2>/dev/null || true; fi
  psql_in_db "DROP DATABASE IF EXISTS ${database} WITH (FORCE);" >/dev/null 2>&1 || true
  rm -rf "$work_dir"
}
trap cleanup EXIT

# The API gets these settings, and the ones .env could add (Cloudinary, Brevo, Resend, the seed) are removed, so
# Photos are off and emails stay in the temporary outbox.
api_env=(
  env -u CLOUDINARY_CLOUD_NAME -u CLOUDINARY_API_KEY -u CLOUDINARY_API_SECRET -u CLOUDINARY_FOLDER
  -u BREVO_API_KEY -u RESEND_API_KEY -u WEB_DIR
  "DATABASE_URL=$database_url"
  "JWT_SECRET=e2e-only-secret-0123456789abcdef0123456789"
  "PORT=$api_port"
  "EMAIL_FROM=Mini Manager <minis@example.com>"
  "APP_BASE_URL=http://localhost:$web_port"
  "EMAIL_OUTBOX_DIR=$work_dir/outbox"
)

docker compose -f "$root/compose.yaml" up -d --wait db
# A first start (an empty volume, as on CI) runs a short setup server that passes the health check, then restarts;
# wait until Postgres really answers before using it.
for attempt in $(seq 1 30); do
  if psql_in_db "SELECT 1;" >/dev/null 2>&1; then break; fi
  if [ "$attempt" = 30 ]; then echo "Postgres did not accept connections within 30 seconds."; exit 1; fi
  sleep 1
done
psql_in_db "DROP DATABASE IF EXISTS ${database} WITH (FORCE);"
psql_in_db "CREATE DATABASE ${database};"

cd "$root/api"
go tool goose -dir migrations postgres "$database_url" up >/dev/null
"${api_env[@]}" "SEED_ADMIN_EMAIL=$admin_email" "SEED_ADMIN_PASSWORD=$admin_password" \
  "SEED_ADMIN_NAME=Mateus" go run ./cmd/seed
go build -o "$work_dir/server" ./cmd/server
"${api_env[@]}" "$work_dir/server" >"$work_dir/server.log" 2>&1 &
server_pid=$!

api_up=""
for _ in $(seq 1 30); do
  if curl --silent --output /dev/null "http://localhost:$api_port/api/v1/me"; then api_up="yes"; break; fi
  sleep 1
done
if [ -z "$api_up" ]; then
  echo "The API did not start on :$api_port within 30 seconds."
  tail -n 50 "$work_dir/server.log"
  exit 1
fi

cd "$root/web"
E2E_BASE_URL="http://localhost:$web_port" API_PROXY_TARGET="http://localhost:$api_port" \
  E2E_ADMIN_EMAIL="$admin_email" E2E_ADMIN_PASSWORD="$admin_password" \
  corepack yarn playwright test "$@" || { echo "--- API log ---"; tail -n 50 "$work_dir/server.log"; exit 1; }
