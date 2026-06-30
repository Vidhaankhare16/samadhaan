# Samadhaan — Project Description

> Paste this into a Google Doc, set sharing to "Anyone with the link", and submit that link.

**Deployed application:** https://samadhaan-822987556610.us-central1.run.app
**GitHub repository:** https://github.com/Vidhaankhare16/samadhaan  *(update if different)*

---

## Problem Statement Selected

**Community Hero — Hyperlocal Problem Solver.** Communities face potholes, water leakages, broken
streetlights, garbage, and infrastructure failures. Reporting is fragmented, hard to track, and
opaque. The challenge: a platform that lets citizens **identify, report, validate, track, and
resolve** community issues through collaboration, data, and intelligent automation.

## Solution Overview

**Samadhaan** (Hindi: *resolution*) is an autonomous, multi-agent civic platform. Citizens only
**report** — by photo, chat, or voice. A swarm of AI agents then performs the entire municipal
back-office workflow **without any human trigger**: it diagnoses the issue, removes duplicates,
drafts a formal complaint, files it to the correct department, tracks the SLA, auto-escalates
breaches, and verifies the fix from an after-photo.

Where comparable platforms stop at *insight* (ingest → summarize → dashboard), Samadhaan closes the
loop the brief demands — **report → validate → track → resolve** — and makes the autonomy **visible**
through a live Agent Desk so anyone can watch the agents reason and act in real time.

## Key Features

1. **Living City Map** — reports appear instantly as custom, severity-coded emoji pins on a
   hand-styled Google Map of Bengaluru.
2. **Autonomous Agent Desk** — a live event stream of six cooperating agents (Intake, Diagnosis,
   Dedup, Action, Watchdog, ProofOfFix) reasoning and acting with no human in the loop.
3. **Multimodal reporting** — photo (Gemini Vision), free-text chat, and **in-browser voice**
   ("speak your complaint"), plus a Dialogflow CX phone/chat channel.
4. **Autonomous complaint filing** — Gemini drafts a formal, department-specific grievance letter
   and routes it with the correct SLA; the Watchdog agent auto-escalates on breach.
5. **AI Proof-of-Fix** — Gemini compares before/after photos and auto-verifies resolution,
   closing the civic loop end-to-end.
6. **My Needs (inclusive city)** — residents describe a disability or need (wheelchair, pet owner,
   low vision, senior, parent, cyclist); Gemini recommends nearby places that work for them —
   accessible metro stations, pet-friendly cafes — plotted on the map.
7. **Impact dashboard** — live resolution rate, average resolve time, autonomous-action count,
   category breakdown, and area hotspots — anonymized civic intelligence for planners and NGOs.

The interface is a full-bleed map with a single adaptive panel (a docked sidebar on desktop, a
bottom sheet on mobile) introduced by a game-style starter guide, so a first-time user understands
it in seconds on any device.

## Technologies Used

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Server-Sent Events (realtime) · Web Speech
API (in-browser voice) · Docker (standalone) · a custom **Warm-Civic × Govtech** design system.

## Google Technologies Utilized

- **Gemini 3.5 Flash** (Gemini API / Vertex AI) — multimodal image diagnosis, severity assessment,
  formal complaint drafting, and before/after proof-of-fix verification.
- **Google Maps Platform** — Maps JavaScript API with a bespoke "civic paper" map style and custom
  markers; geolocation-based reporting.
- **Dialogflow CX** — conversational voice/chat agent wired via webhook to the autonomous swarm
  (`/api/voice`), for a "call the civic agent" telephony channel.
- **Cloud Run** — fully managed deployment (always-on instance, CPU always allocated so background
  agents complete after the response).
- **Cloud Build + Artifact Registry** — containerized CI build and image registry.

## Why it wins on the evaluation matrix

- **Agentic Depth (20%)** — a genuine six-agent, event-driven swarm that acts autonomously and is
  rendered live on screen, not merely described.
- **Problem Solving & Impact (20%)** — closes the full report→resolve loop, including the
  resolution and verification steps most solutions omit.
- **Innovation & Creativity (20%)** — autonomous complaint drafting + filing, AI proof-of-fix
  before/after verification, and a multi-channel (photo/chat/voice/phone) intake.
- **Google Technologies (15%)** — Gemini, Maps, Dialogflow CX, Cloud Run, Cloud Build, Artifact
  Registry.
- **Product Experience & Design (10%)** — a distinctive, hand-crafted civic-editorial aesthetic.
