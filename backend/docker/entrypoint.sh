#!/bin/sh
# Production entrypoint: DB бэлэн болтол хүлээж, migration ажиллуулаад uvicorn асаана.
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "DB хүлээж байна..."
  i=0
  until python -c "
import asyncio, os, sys
import asyncpg
url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
async def main():
    conn = await asyncpg.connect(url); await conn.close()
asyncio.run(main())
" 2>/dev/null; do
    i=$((i+1)); [ "$i" -ge 30 ] && echo "DB 60 секундэд бэлэн болсонгүй" && exit 1
    sleep 2
  done
fi

echo "Migration: alembic upgrade head"
alembic upgrade head

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips="*" --workers "${WEB_CONCURRENCY:-2}"
