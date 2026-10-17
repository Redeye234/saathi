FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
ENV DATABASE_URL=sqlite+aiosqlite:////tmp/saathi.db
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY saathi_api ./saathi_api
COPY migrations ./migrations
COPY alembic.ini .
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "saathi_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
