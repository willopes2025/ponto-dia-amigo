#!/usr/bin/env bash
# Recria o banco de desenvolvimento a partir das migrations e semeia dados de
# demonstração. É o banco que `npm run dev:backend` serve.
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
SOCK="${VISIO_PGSOCK:-/var/run/visio-pg}"
PGDATA="${VISIO_PGDATA:-/var/lib/visio-pgdata}"
PORT="${VISIO_PGPORT:-55432}"
DB="${VISIO_DEV_DB:-visio_dev}"

export PGHOST="$SOCK" PGPORT="$PORT" PGUSER=postgres

if ! "$PGBIN/pg_isready" -q 2>/dev/null; then
  echo "▸ subindo cluster"
  id postgres >/dev/null 2>&1 || useradd -m postgres
  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    rm -rf "$PGDATA"; mkdir -p "$PGDATA"; chown postgres:postgres "$PGDATA"
    sudo -u postgres "$PGBIN/initdb" -D "$PGDATA" -A trust -U postgres >/dev/null
  fi
  mkdir -p "$SOCK"; chown postgres:postgres "$SOCK"
  : > /var/log/visio-pg.log; chown postgres:postgres /var/log/visio-pg.log
  sudo -u postgres "$PGBIN/pg_ctl" -D "$PGDATA" \
    -o "-p $PORT -k $SOCK -c listen_addresses=127.0.0.1" -l /var/log/visio-pg.log start >/dev/null
  for _ in $(seq 1 40); do "$PGBIN/pg_isready" -q && break; sleep 0.5; done
fi

echo "▸ recriando $DB"
psql -d postgres -q -c "drop database if exists $DB;" -c "create database $DB;"
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f supabase/tests/00_auth_stub.sql

echo "▸ migrations"
for f in supabase/migrations/*.sql; do
  printf '   %-56s' "$(basename "$f")"
  psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
  echo "ok"
done

# O PostgREST usa os papéis anon/authenticated e precisa poder assumi-los.
psql -d "$DB" -q -c "grant anon, authenticated to postgres;" 2>/dev/null || true

if [ -f scripts/seed-dev.sql ]; then
  echo "▸ dados de demonstração"
  psql -d "$DB" -v ON_ERROR_STOP=1 -q -f scripts/seed-dev.sql
fi

echo "▸ $DB pronto"
