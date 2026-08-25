FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8080 ENGINE_DAILY_REQUEST_BUDGET=2000 ENGINE_GUARD_COOLDOWN_SECONDS=10 ENGINE_MAX_BODY_BYTES=15000000
CMD exec gunicorn --bind :$PORT --workers 1 --threads 4 --timeout 120 guarded_app:app
