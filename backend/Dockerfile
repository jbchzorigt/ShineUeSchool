# Backend (FastAPI) production image. uv-ээр lock файлын дагуу dependency суулгана.
FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1 PYTHONIOENCODING=utf-8
WORKDIR /app

# Эхлээд зөвхөн dependency (кэш ашиглахын тулд), дараа нь код
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY fonts ./fonts
COPY scripts ./scripts
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && useradd -m -u 1000 app && mkdir -p /app/media && chown -R app:app /app

ENV PATH="/app/.venv/bin:$PATH" MEDIA_DIR=/app/media
USER app
EXPOSE 8000
# Media volume-ийг Dockerfile-д биш compose/Railway-ийн тохиргоогоор өгнө (Railway VOLUME зааврыг зөвшөөрдөггүй)

ENTRYPOINT ["/entrypoint.sh"]
