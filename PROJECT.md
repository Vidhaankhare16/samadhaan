# समाधान · Samadhaan

> The civic issue that resolves itself.

## Live links

- **Live application:** https://samadhaan-822987556610.us-central1.run.app
- **Source code:** https://github.com/Vidhaankhare16/samadhaan
- **Call the civic agent:** [(251) 647‑0679](tel:+12516470679) (US number for now, due to budget constraints)

## Summary

Samadhaan is an autonomous, multi agent civic platform built for the **Community Hero, Hyperlocal Problem Solver** problem statement. A citizen does exactly one thing: they **report** a problem (a pothole, a water leak, a broken streetlight, overflowing garbage). Everything that normally requires a municipal back office then happens on its own. A team of AI agents diagnoses the issue, removes duplicates, drafts a formal complaint, files it with the correct department, tracks the service deadline, escalates it if nobody acts, and even verifies the fix from an "after" photo.

Most comparable projects stop at *insight* (they ingest reports and show a dashboard). Samadhaan closes the loop the problem statement actually asks for: **identify, report, validate, track, and resolve**. Just as important, the autonomy is shown on screen, so anyone watching can see the agents reason and act in real time.

You can try the whole thing right now at the [live application](https://samadhaan-822987556610.us-central1.run.app), or read the code at the [repository](https://github.com/Vidhaankhare16/samadhaan).

## Google technologies used (and the feature each one powers)

| Google technology | What it powers in Samadhaan |
|-------------------|------------------------------|
| **Gemini 3.5 Flash** (Gemini API / Vertex AI) | Multimodal photo diagnosis, severity scoring, autonomous complaint drafting, before/after proof of fix, and the personalized accessibility recommendations |
| **Dialogflow CX** | The phone agent on [(251) 647‑0679](tel:+12516470679). It greets the caller, captures the issue, and calls the app webhook to file a real report |
| **Google Maps Platform** | The Maps JavaScript API with a hand tuned "civic paper" style, custom emoji markers, and geolocation that centres the map on the user |
| **Cloud Run** | Hosting for the whole application as a single always on container, with CPU always allocated so background agents finish their work |
| **Cloud Build and Artifact Registry** | Container build pipeline and image registry for every deploy |

## What makes Samadhaan different

### 1. Call to report: the most inclusive channel comes first

The headline feature is that you can **call a phone number and simply speak**. Dial [(251) 647‑0679](tel:+12516470679), say what the problem is and where it is, and the Dialogflow agent files it for you and reads back a tracking id. The report appears on the live map within seconds.

Why this matters:

- **Low internet or no internet for the app.** A plain phone call works on the most basic handset and the weakest network. People who cannot stream a web app can still report a problem.
- **No tech expertise required.** No app to install, no account, no form, no typing. If you can make a phone call, you can be a Community Hero.
- **Truly local and inclusive.** Elderly residents, people who cannot read or write comfortably, and anyone without a smartphone are included by default rather than as an afterthought.

There are two calling paths into the same pipeline:

1. **Real phone line:** [(251) 647‑0679](tel:+12516470679), powered by the Dialogflow CX phone gateway.
2. **Free in browser call:** the app has a full "call the agent" screen (ringing, a connected timer, the agent speaking, and a live transcript) built with the browser speech APIs. It needs no phone number, no international dialling, and no charges, so it works from India during the demo.

Both paths reach the same endpoint, run the same autonomous agents, and drop the same pin on the map. Try either one from the [live application](https://samadhaan-822987556610.us-central1.run.app).

### 2. Built for every body: the accessibility layer

Samadhaan is not only about fixing what is broken. It also helps people navigate the city as it is. In **My needs**, a resident says who they are (wheelchair user, pet owner, parent with a stroller, low vision, senior, cyclist) or describes their situation in their own words. Gemini then recommends nearby places that genuinely work for them, for example step free metro stations, pet friendly cafes, or paved accessible parks, and pins them on the map with a short, personal reason for each.

This turns the platform into an everyday companion for inclusion, not just a complaint box, and it directly supports the goal of making cities cleaner, safer, and more accessible for everyone.

### 3. Snap a photo, geotagged on the map

For anyone who prefers to show rather than tell, a single photo is enough. Take a picture of the issue and the app does the rest:

- The photo is **geotagged**. The app uses your location (or a chosen area) so the report lands at the right spot, and the map auto centres on your vicinity.
- **Gemini Vision** looks at the image, identifies what the issue is (pothole, leak, garbage, and so on), and scores how serious it is.
- The report is **plotted live** as a custom marker, colour coded by severity, and the agents take over from there.

The map is the heart of the experience: a living, breathing picture of the neighbourhood that updates the moment a report comes in, from any channel.

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

Key design choices:

- **Frontend:** Next.js 16 (App Router), TypeScript, and Tailwind, deployed as a standalone server on [Cloud Run](https://samadhaan-822987556610.us-central1.run.app).
- **Realtime without a fragile database:** state lives in an in process store and streams to the browser over Server Sent Events at `/api/stream`. A single always on Cloud Run instance keeps the data consistent and lets background agents finish after the HTTP response. There is no external database that could fail in the middle of judging.
- **Visible autonomy:** every agent writes a short reasoning line to a live feed, so the **Agent desk** in the app shows the swarm working step by step rather than just claiming it does.
- **Graceful map:** if Google Maps cannot authorize for any reason, the app falls back to its own designed schematic map, so the demo is never broken.
- **Location aware:** the app detects the user's location and shifts the demo data so the living map appears around wherever they are.

## The autonomous agent swarm

| Agent | When it runs | What it does on its own |
|-------|--------------|--------------------------|
| **Intake** | a new report arrives (call, photo, or text) | turns any input into a structured case |
| **Diagnosis** | after intake | Gemini classifies the category and severity and writes a clear title |
| **Dedup** | after diagnosis | clusters nearby reports of the same issue, merges duplicates, and raises priority |
| **Action** | after dedup | drafts a formal grievance letter and files it with the correct department and a deadline |
| **Watchdog** | continuously | tracks the service deadline and escalates a breach with no human trigger |
| **ProofOfFix** | an after photo is uploaded | Gemini compares before and after and auto resolves the case |

## Running locally

```bash
cd web
cp .env.example .env.local   # add GEMINI_API_KEY and NEXT_PUBLIC_MAPS_API_KEY
npm install
npm run dev                  # http://localhost:3000
```

## Deploying to Cloud Run

```bash
cd web
gcloud builds submit --config cloudbuild.yaml --substitutions=_MAPS_KEY="$MAPS_KEY"
gcloud run deploy samadhaan \
  --image us-central1-docker.pkg.dev/<PROJECT>/samadhaan/web:latest \
  --region us-central1 --allow-unauthenticated \
  --min-instances 1 --max-instances 1 --no-cpu-throttling \
  --set-env-vars "GEMINI_API_KEY=...,GEMINI_MODEL=gemini-3.5-flash"
```

The Dialogflow phone setup is documented in [DIALOGFLOW_SETUP.md](DIALOGFLOW_SETUP.md).

## Try it

Open the [live application](https://samadhaan-822987556610.us-central1.run.app), press the microphone or call [(251) 647‑0679](tel:+12516470679), and watch a report travel from your voice to a pin on the map and a filed complaint, on its own.
