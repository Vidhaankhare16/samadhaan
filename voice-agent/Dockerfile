# ─── Samadhaan voice agent — LiveKit worker + notify server on Cloud Run ───────
# One container runs two processes:
#   • the LiveKit Agents worker (agent.py) — handles inbound calls + outbound briefings
#   • the FastAPI notify server (notify_server.py) on $PORT — the app POSTs /notify here
# Secrets come from Cloud Run env vars (NOT baked into the image).
FROM python:3.13-slim

WORKDIR /app

# System deps some audio/native wheels expect.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["bash", "start.sh"]
