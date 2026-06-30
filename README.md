# समाधान · Samadhaan — the civic issue that resolves itself

**Live demo:** https://samadhaan-822987556610.us-central1.run.app

An autonomous, multi-agent civic platform for the **Community Hero — Hyperlocal Problem Solver**
problem statement. Citizens only **report** a problem (by photo, chat, or voice). A swarm of AI
agents then does everything a municipal back-office would do — **diagnose, de-duplicate, draft the
formal complaint, file it to the right department, track the SLA, escalate on breach, and verify
the fix** — with *no human pressing a button*.

Past winners of this problem statement stopped at *insight* (ingest → summarize → dashboard).
Samadhaan closes the loop the brief actually asks for: **identify → report → validate → track →
resolve.**

---

## The four things a judge can verify in 60 seconds

1. **🗺️ Living City Map** — report an issue and watch it appear as a custom emoji pin on a
   hand-styled Google Map of Bengaluru, color-coded by AI-assessed severity.
2. **🤖 Live Agent Desk** — the autonomy is *rendered on screen*. Watch the agents reason and act
   in real time: `Diagnosis → Dedup → Action (files complaint) → Watchdog (tracks SLA)`.
3. **🎙️ Talk to the agent** — can't type or read? **Speak** your complaint in the browser (or
   simulate a phone call). The voice agent files it and it lands on the map in seconds.
4. **✅ AI Proof-of-Fix** — upload an "after" photo; Gemini compares it to the original and
   **auto-verifies** the resolution, closing the loop end-to-end.

---

## The autonomous agent swarm

| Agent | Trigger | What it does (no prompt) |
|-------|---------|--------------------------|
| **Intake** | new report (photo / chat / voice) | normalizes any input into a structured case |
| **Diagnosis** | after intake | Gemini multimodal — classifies category + severity, writes a title |
| **Dedup** | after diagnosis | geo-clusters reports within 80 m, merges duplicates, raises priority |
| **Action** | after dedup | drafts a **formal grievance letter** and files it to the correct department with an SLA |
| **Watchdog** | continuous (cron) | monitors SLA deadlines and **auto-escalates** breaches |
| **ProofOfFix** | after-photo upload | Gemini before/after comparison → auto-resolves the case |

Every agent writes a reasoning entry to a live event stream, so the swarm's work is visible, not
just claimed.

## Google technologies

- **Gemini 3.5 Flash** (Vertex / Gemini API) — multimodal diagnosis, complaint drafting, proof-of-fix
- **Google Maps Platform** — custom-styled Maps JavaScript API
- **Cloud Run** — deployment (single always-on instance, CPU always allocated for background agents)
- **Cloud Build + Artifact Registry** — container build & registry
- **Dialogflow CX** — telephony voice channel → `/api/voice` webhook (see `DIALOGFLOW_SETUP.md`)

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Server-Sent Events for realtime · Gemini REST.
A **Warm-Civic × Govtech** design language — paper textures, editorial serif headlines, custom map
styling — deliberately not a templated SaaS theme.

---

## Run locally

```bash
cd web
cp .env.example .env.local   # fill in GEMINI_API_KEY + NEXT_PUBLIC_MAPS_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

## Deploy to Cloud Run

```bash
cd web
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_MAPS_KEY="$MAPS_KEY"
gcloud run deploy samadhaan \
  --image us-central1-docker.pkg.dev/<PROJECT>/samadhaan/web:latest \
  --region us-central1 --allow-unauthenticated \
  --min-instances 1 --max-instances 1 --no-cpu-throttling \
  --set-env-vars "GEMINI_API_KEY=...,GEMINI_MODEL=gemini-3.5-flash"
```

## Architecture notes

- **Realtime** is an in-process event bus + SSE (`/api/stream`). A single always-on Cloud Run
  instance keeps the store consistent and lets background agents finish after the HTTP response —
  zero external-DB dependency that could fail mid-judging.
- The map **degrades gracefully**: if Google Maps can't authorize, the app renders its own designed
  schematic map so the demo is never broken.
