# समाधान · Samadhaan

> The civic issue that resolves itself.

## Live links

- **Live application:** https://samadhaan-822987556610.us-central1.run.app
- **Source code:** https://github.com/Vidhaankhare16/samadhaan
- **Call the civic agent:** [(251) 647‑0679](tel:+12516470679) (US number for now, due to budget constraints)
- **Full write up:** [PROJECT.md](PROJECT.md) · **Phone setup:** [DIALOGFLOW_SETUP.md](DIALOGFLOW_SETUP.md)

## Summary

Samadhaan is an autonomous, multi agent civic platform for the **Community Hero, Hyperlocal Problem Solver** problem statement. A citizen does exactly one thing: they **report** a problem (a pothole, a water leak, a broken streetlight, garbage). Everything a municipal back office would normally do then happens on its own. AI agents diagnose the issue, remove duplicates, draft a formal complaint, file it with the correct department, track the deadline, escalate if nobody acts, and verify the fix from an "after" photo.

Most comparable projects stop at *insight* (ingest reports, show a dashboard). Samadhaan closes the loop the brief asks for: **identify, report, validate, track, and resolve**, and it shows the agents working live on screen rather than only claiming autonomy.

Try it at the [live application](https://samadhaan-822987556610.us-central1.run.app).

## Google technologies used (and the feature each one powers)

| Google technology | What it powers in Samadhaan |
|-------------------|------------------------------|
| **Gemini 3.5 Flash** (Gemini API / Vertex AI) | Multimodal photo diagnosis, severity scoring, autonomous complaint drafting, before/after proof of fix, and personalized accessibility recommendations |
| **Dialogflow CX** | The phone agent on [(251) 647‑0679](tel:+12516470679): it greets the caller, captures the issue, and calls the app webhook to file a real report |
| **Google Maps Platform** | Maps JavaScript API with a custom "civic paper" style, custom emoji markers, and geolocation that centres the map on the user |
| **Cloud Run** | Hosting for the whole app as one always on container, with CPU always allocated so background agents finish |
| **Cloud Build and Artifact Registry** | Container build pipeline and image registry for every deploy |

## What makes Samadhaan different

### 1. Call to report: the most inclusive channel comes first

The headline feature is that you can **call a phone number and simply speak**. Dial [(251) 647‑0679](tel:+12516470679), say what the problem is and where it is, and the Dialogflow agent files it and reads back a tracking id. The report appears on the live map within seconds.

Why this matters:

- **Low internet or no internet for the app.** A plain phone call works on a basic handset and a weak network. People who cannot stream a web app can still report a problem.
- **No tech expertise required.** No app to install, no account, no form, no typing. If you can make a phone call, you can be a Community Hero.
- **Truly local and inclusive.** Elderly residents, people who are not comfortable reading or writing, and anyone without a smartphone are included by default.

Two calling paths reach the same pipeline:

1. **Real phone line:** [(251) 647‑0679](tel:+12516470679), via the Dialogflow CX phone gateway.
2. **Free in browser call:** a full "call the agent" screen (ringing, connected timer, the agent speaking, a live transcript) built with the browser speech APIs. No phone number, no international dialling, no charges, so it works from India during the demo.

### 2. Built for every body: the accessibility layer

In **My needs**, a resident says who they are (wheelchair user, pet owner, parent with a stroller, low vision, senior, cyclist) or describes their situation in their own words. Gemini recommends nearby places that genuinely work for them (step free metro stations, pet friendly cafes, accessible parks) and pins them on the map with a short, personal reason for each. The platform becomes an everyday companion for inclusion, not just a complaint box.

### 3. Snap a photo, geotagged on the map

Take a picture of the issue and the app does the rest. The photo is **geotagged** so the report lands at the right spot and the map auto centres on your vicinity. **Gemini Vision** identifies the issue and scores its severity, and the report is **plotted live** as a colour coded marker before the agents take over. The map is a living picture of the neighbourhood that updates the instant a report arrives, from any channel.

## How it works: architecture

```
 Citizen
   |  phone call  ->  Dialogflow CX  -------\
   |  in browser call (Web Speech)  --------+--> /api/voice  ----\
   |  photo or text  ----------------------/                     |
   |  My needs  ------------------------------> /api/needs       |
                                                                 v
                                                   In process event bus
                                                                 |
        Intake -> Diagnosis -> Dedup -> Action -> Watchdog -> ProofOfFix
        (Gemini)            (geo cluster) (files)  (SLA)     (before/after)
                                                                 |
                                            Server Sent Events (/api/stream)
                                                                 |
                            Live map  +  Agent desk  +  Impact dashboard
```

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind, deployed as a standalone server on [Cloud Run](https://samadhaan-822987556610.us-central1.run.app).
- **Realtime without a fragile database:** state lives in an in process store and streams to the browser over Server Sent Events. A single always on instance keeps it consistent and lets background agents finish after the response. Nothing external can fail mid judging.
- **Visible autonomy:** every agent writes a reasoning line to a live feed, so the **Agent desk** shows the swarm working step by step.
- **Graceful map:** if Google Maps cannot authorize, the app falls back to its own designed schematic map.
- **Location aware:** the app detects the user's location and shifts the demo data so the living map appears around wherever they are.

## The autonomous agent swarm

| Agent | When it runs | What it does on its own |
|-------|--------------|--------------------------|
| **Intake** | a report arrives (call, photo, or text) | turns any input into a structured case |
| **Diagnosis** | after intake | Gemini classifies the category and severity and writes a clear title |
| **Dedup** | after diagnosis | clusters nearby reports of the same issue and raises priority |
| **Action** | after dedup | drafts a formal grievance and files it with the right department and a deadline |
| **Watchdog** | continuously | tracks the deadline and escalates a breach with no human trigger |
| **ProofOfFix** | an after photo is uploaded | Gemini compares before and after and auto resolves the case |

## Run locally

```bash
cd web
cp .env.example .env.local   # add GEMINI_API_KEY and NEXT_PUBLIC_MAPS_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

## Deploy to Cloud Run

```bash
cd web
gcloud builds submit --config cloudbuild.yaml --substitutions=_MAPS_KEY="$MAPS_KEY"
gcloud run deploy samadhaan \
  --image us-central1-docker.pkg.dev/<PROJECT>/samadhaan/web:latest \
  --region us-central1 --allow-unauthenticated \
  --min-instances 1 --max-instances 1 --no-cpu-throttling \
  --set-env-vars "GEMINI_API_KEY=...,GEMINI_MODEL=gemini-3.5-flash"
```

For the full project write up see [PROJECT.md](PROJECT.md). For the phone agent setup see [DIALOGFLOW_SETUP.md](DIALOGFLOW_SETUP.md).
