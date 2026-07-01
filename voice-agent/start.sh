#!/usr/bin/env bash
# Runs both Samadhaan voice processes in one Cloud Run container.
#   - LiveKit Agents worker (agent.py)  -> connects out to LiveKit, answers calls
#   - notify server (FastAPI on $PORT)  -> Cloud Run health check + /notify trigger
# If either process exits, we exit non-zero so Cloud Run restarts the instance.
set -uo pipefail

PORT="${PORT:-8080}"

# 1) LiveKit worker (production mode). Downloads model files then registers.
python agent.py start &
AGENT_PID=$!

# 2) Notify HTTP server on the Cloud Run port (foreground-ish, backgrounded so we can wait -n).
uvicorn notify_server:app --host 0.0.0.0 --port "${PORT}" &
UVICORN_PID=$!

echo "[start] agent pid=${AGENT_PID} uvicorn pid=${UVICORN_PID} on :${PORT}"

# Exit as soon as either child dies, so Cloud Run recycles the instance.
wait -n "${AGENT_PID}" "${UVICORN_PID}"
echo "[start] a child process exited; shutting down container"
kill "${AGENT_PID}" "${UVICORN_PID}" 2>/dev/null
exit 1
