FROM python:3.11

WORKDIR /app

COPY . .

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

RUN pip install --no-cache-dir fastapi uvicorn asyncpg httpx

# Default (will be overridden by docker-compose)
CMD ["uvicorn"]