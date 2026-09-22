#!/usr/bin/env bash
# Aplica as migrations da VISIO num Postgres limpo e roda a suíte de testes de banco.
#
# Verifica o que só um Postgres de verdade verifica: RLS, triggers, RPCs e as
# garantias de isolamento entre redes. Sem isto, "multi-tenant" é só intenção.
#
# Uso: npm run test:db
set -euo pipefail

PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
SOCK="${VISIO_PGSOCK:-/var/run/visio-pg}"
PGDATA="${VISIO_PGDATA:-/var/lib/visio-pgdata}"
PORT="${VISIO_PGPORT:-55432}"
DB="${VISIO_PGDB:-visio_test}"

export PGHOST="$SOCK" PGPORT="$PORT" PGUSER=postgres

# Sobe o cluster se ainda não estiver de pé.
if ! "$PGBIN/pg_isready" -q 2>/dev/null; then
  echo "▸ subindo cluster de teste em $PGDATA"
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

echo "▸ recriando o banco $DB"
psql -d postgres -q -c "drop database if exists $DB;" -c "create database $DB;"

echo "▸ stub do schema auth"
psql -d "$DB" -v ON_ERROR_STOP=1 -q -f supabase/tests/00_auth_stub.sql

echo "▸ migrations"
for f in supabase/migrations/*.sql; do
  printf '   %-56s' "$(basename "$f")"
  psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
  echo "ok"
done

echo "▸ testes"
status=0
for f in supabase/tests/*.sql; do
  # 00_ é o stub do schema auth, já aplicado acima.
  case "$(basename "$f")" in 00_*) continue;; esac
  echo "   ── $(basename "$f")"
  if ! psql -d "$DB" -v ON_ERROR_STOP=1 -q -f "$f"; then status=1; fi
done

[ "$status" -eq 0 ] && echo "▸ suíte de banco: tudo verde" || echo "▸ suíte de banco: FALHOU"
exit "$status"
