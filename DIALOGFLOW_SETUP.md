# Dialogflow CX — "call the civic agent" channel (LIVE)

A Dialogflow CX agent is **fully wired and live**. Calling the phone number runs the agent, which
files a real report through the same autonomous swarm the website uses.

## Live phone line

**📞 (251) 647-0679** — Dialogflow CX Phone Gateway ("Samadhaan agent", en-US).
> US number for now, due to budget constraints. A free **in-browser call** (no number / no ISD,
> works in India) is built into the site — open **Call agent** and talk to the same pipeline.

## What's wired (done)

- **Agent:** `Samadhaan Civic Agent`
  `projects/causal-galaxy-415009/locations/us-central1/agents/474d7221-2ac6-4294-af70-1061ba558a0b`
- **Webhook:** `Samadhaan Ingest` (`ea89bb3b-…`) → `https://samadhaan-822987556610.us-central1.run.app/api/voice`
- **Start Flow → welcome route** (`12c266f6-…`): greets *"Namaste! You have reached the Samadhaan
  civic agent."* and transitions to the Collect Report page.
- **Collect Report page** (`e9702200-…`): required parameter `issue` (`@sys.any`) with prompt
  *"Namaste! Please describe the civic issue and the area — for example, a pothole near MG Road."*
- **Webhook route** on that page: condition `$page.params.status = "FINAL"` → calls `Samadhaan Ingest`
  with tag `file_report` → transitions to **End Session**. The page's own duplicate spoken message was
  removed so only the webhook's richer confirmation (with the tracking id) is heard.

Verified end-to-end via `detectIntent`: greeting → issue capture → webhook fired (`webhook_ok: true`)
→ real reports created and geotagged on the live map.

## Two calling paths, one pipeline

1. **Real PSTN line:** (251) 647-0679 → Dialogflow CX → `/api/voice` → diagnosis swarm → map pin.
2. **Free in-browser call:** the site's Call screen (Web Speech API + browser TTS) → `/api/voice` →
   same swarm → map pin. No phone number, KYC, or ISD charges — works from India.

## Webhook contract (implemented in `web/src/app/api/voice/route.ts`)

Request (CX): `sessionInfo.parameters.issue`, `.location`, `.caller_name`
Response (CX):
```json
{
  "fulfillment_response": { "messages": [{ "text": { "text": ["...tracking id..."] } }] },
  "sessionInfo": { "parameters": { "tracking_id": "SMD-2842", "report_area": "Indiranagar" } }
}
```

## Optional next step — web chat widget

To also expose the agent as an embeddable chat: **Manage → Integrations → Dialogflow Messenger →
Connect**, then drop the `<df-messenger>` snippet into `web/src/app/layout.tsx`.
