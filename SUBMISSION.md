# समाधान · Samadhaan : Project Description

> **How to paste into Google Docs:** open a Google Doc, go to **Tools → Preferences** and turn on **"Automatically detect Markdown"**, then copy everything below this line and paste. The headings, the tables, and the architecture diagram block will format automatically. Set the doc sharing to **"Anyone with the link"** before submitting.

---

## Live links

- **Deployed application:** https://samadhaan-822987556610.us-central1.run.app
- **GitHub repository:** https://github.com/Vidhaankhare16/samadhaan
- **Call the civic agent:** (251) 647‑0679 (US number for now, due to budget constraints)

## Problem Statement Selected

**Community Hero, Hyperlocal Problem Solver.** Communities face potholes, water leakages, broken streetlights, garbage, and other infrastructure failures. Reporting is fragmented, hard to track, and opaque. The challenge is to build a platform that lets citizens **identify, report, validate, track, and resolve** community issues through collaboration, data, and intelligent automation.

## Solution Overview

Samadhaan (Hindi for *resolution*) is an autonomous, multi agent civic platform. A citizen does exactly one thing: they **report** a problem, by phone call, photo, voice, or text. A swarm of AI agents then performs the entire municipal back office workflow **with no human trigger**: it diagnoses the issue, removes duplicates, drafts a formal complaint, files it with the correct department, tracks the deadline, escalates a breach, and verifies the fix from an "after" photo.

Where comparable platforms stop at *insight* (ingest, summarize, dashboard), Samadhaan closes the loop the brief asks for, **report, validate, track, resolve**, and makes the autonomy **visible** through a live Agent Desk so anyone can watch the agents reason and act in real time. The full experience is open at the [live application](https://samadhaan-822987556610.us-central1.run.app).

## Key Features

The three features below are what set Samadhaan apart, in order of impact.

**1. Call to report (the most inclusive channel).** Dial **(251) 647‑0679**, say what the problem is and where, and the Dialogflow agent files it and reads back a tracking id. It works on a basic handset and a weak network, needs no app, account, form, or typing, and includes elderly people and anyone without a smartphone by default. A free **in browser call** screen offers the same experience with no phone charges, so it also works from India during the demo. Both paths reach the same pipeline and drop the same pin on the map.

**2. Built for every body (accessibility).** In **My needs**, a resident says who they are (wheelchair user, pet owner, parent with a stroller, low vision, senior, cyclist) or describes their situation, and Gemini recommends nearby places that genuinely work for them (step free metro stations, pet friendly cafes, accessible parks), pinned on the map with a personal reason for each.

**3. Snap a photo, geotagged on the map.** Take a picture of the issue. The photo is geotagged so it lands at the right spot, Gemini Vision identifies the issue and scores its severity, and it appears live as a colour coded marker before the agents take over.

Supporting features:

| Feature | What it does |
|---------|--------------|
| **Living City Map** | Reports appear instantly as custom, severity coded markers on a hand styled Google Map that auto centres on the user's vicinity |
| **Autonomous Agent Desk** | A live stream of six cooperating agents reasoning and acting with no human in the loop |
| **Autonomous complaint filing** | Gemini drafts a formal, department specific grievance and routes it with the correct deadline; the Watchdog agent escalates on breach |
| **AI Proof of Fix** | Gemini compares before and after photos and auto verifies resolution, closing the civic loop end to end |
| **Impact dashboard** | Live resolution rate, average resolve time, autonomous action count, category breakdown, and area hotspots |

The interface is a full bleed map with one adaptive panel (a docked sidebar on desktop, a bottom sheet on mobile), introduced by a game style starter guide, so a first time user understands it in seconds on any device.

## Google Technologies Utilized

| Google technology | What it powers in Samadhaan |
|-------------------|------------------------------|
| **Gemini 3.5 Flash** (Gemini API / Vertex AI) | Multimodal photo diagnosis, severity scoring, autonomous complaint drafting, before and after proof of fix, and personalized accessibility recommendations |
| **Dialogflow CX** | The phone agent on (251) 647‑0679: it greets the caller, captures the issue, and calls the app webhook to file a real report |
| **Google Maps Platform** | Maps JavaScript API with a custom "civic paper" style, custom markers, and geolocation that centres the map on the user |
| **Cloud Run** | Hosting for the whole app as one always on container, with CPU always allocated so background agents finish |
| **Cloud Build and Artifact Registry** | Container build pipeline and image registry for every deploy |

## Technologies Used

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Server Sent Events for realtime, the Web Speech API for in browser voice, Docker for a standalone build, and a custom civic editorial design system.

## Architecture

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

Design choices:

- **Frontend:** Next.js deployed as a standalone server on Cloud Run.
- **Realtime without a fragile database:** state lives in an in process store and streams to the browser over Server Sent Events. A single always on instance keeps it consistent and lets background agents finish after the response, so nothing external can fail during judging.
- **Visible autonomy:** every agent writes a reasoning line to a live feed, so the Agent Desk shows the swarm working step by step.
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

## Why it fits the evaluation matrix

| Criterion (weight) | How Samadhaan delivers |
|--------------------|------------------------|
| **Agentic Depth (20%)** | A genuine six agent, event driven swarm that acts autonomously and is rendered live on screen, not merely described |
| **Problem Solving and Impact (20%)** | Closes the full report to resolve loop, including the resolution and verification steps most solutions omit |
| **Innovation and Creativity (20%)** | Autonomous complaint drafting and filing, AI before and after proof of fix, and a four channel intake (phone, voice, photo, text) |
| **Google Technologies (15%)** | Gemini, Maps Platform, Dialogflow CX, Cloud Run, Cloud Build, Artifact Registry |
| **Product Experience and Design (10%)** | A distinctive, hand crafted civic editorial interface that works on desktop and mobile |
