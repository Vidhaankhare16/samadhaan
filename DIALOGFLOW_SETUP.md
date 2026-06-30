# Dialogflow CX — "call the civic agent" channel

A Dialogflow CX agent and a webhook (→ the live `/api/voice` endpoint) are **already created** in
the project. This guide finishes the conversational route and connects it to a **web chat** widget
(judge-verifiable) and/or a **phone number**.

> The in-browser **🎙️ Speak your report** button on the live site already demonstrates the
> voice → autonomous-swarm → map pipeline end-to-end, with no telephony needed. Dialogflow adds a
> real phone/chat channel on top of the same webhook.

## What already exists

- **Agent:** `Samadhaan Civic Agent`
  `projects/causal-galaxy-415009/locations/us-central1/agents/474d7221-2ac6-4294-af70-1061ba558a0b`
- **Webhook:** `Samadhaan Ingest` → `https://samadhaan-822987556610.us-central1.run.app/api/voice`
- Console: https://dialogflow.cloud.google.com/cx/projects/causal-galaxy-415009/locations/us-central1/agents/474d7221-2ac6-4294-af70-1061ba558a0b

The webhook accepts the Dialogflow CX request shape and returns a spoken confirmation with a tracking
id; it ingests the report into the same agent swarm the website uses.

## Finish the flow (~10 min, Console)

1. **Default Start Flow → Start Page → add a parameter**
   - Page form parameter `issue`, entity `@sys.any`, required, prompt:
     *"Namaste! Describe the civic issue and the area — for example, a pothole near MG Road."*
   - (Optional) parameter `location`, entity `@sys.any`.
2. **Add a route** on that page:
   - Condition: `$page.params.status = "FINAL"`
   - **Webhook:** select `Samadhaan Ingest`, tag `file_report`
   - Fulfillment passes the captured text — the webhook reads
     `sessionInfo.parameters.issue` / `.location`.
   - Agent response: `$session.params.tracking_id` is returned by the webhook; say
     *"Filed with tracking id $session.params.tracking_id. Watch it on the Samadhaan map."*
3. **Test** in the simulator: type *"water leak near Indiranagar"* → you should get a tracking id,
   and the report appears on the live map.

## Expose it to judges

### Option A — Web chat (instant, recommended)
- **Manage → Integrations → Dialogflow Messenger → Connect** → Enable unauthenticated API.
- Copy the `<df-messenger>` snippet. (To embed it in the site, set
  `NEXT_PUBLIC_DF_*` and drop the snippet into `web/src/app/layout.tsx`.)
- Judges click the chat bubble on the page and talk to the Dialogflow agent directly.

### Option B — Phone number
- **Manage → Integrations → Conversational Agents / Phone gateway** (or a telephony partner such as
  Twilio / Avaya). Assign a number. Calls hit the same flow + webhook.
- Set `NEXT_PUBLIC_VOICE_NUMBER` in Cloud Run env and the number renders on the "Talk to the agent"
  card automatically.

## Webhook contract (already implemented)

Request (CX): `sessionInfo.parameters.issue`, `.location`, `.caller_name`
Response (CX):
```json
{
  "fulfillment_response": { "messages": [{ "text": { "text": ["...tracking id..."] } }] },
  "sessionInfo": { "parameters": { "tracking_id": "SMD-2842", "report_area": "Indiranagar" } }
}
```
