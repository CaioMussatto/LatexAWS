FROM python:3.11-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
COPY . .
RUN uv sync --frozen

EXPOSE 8080
CMD ["uv", "run", "gunicorn", "-b", "0.0.0.0:8080", "app.main:app"]
