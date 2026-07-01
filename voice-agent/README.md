# Samadhaan voice agent — real Indian phone line (LiveKit + Gemini Live + Vobiz)

This is the **phone front-end** for Samadhaan. It gives the platform a real **+91 number**
that rural, low-literacy, no-internet citizens can dial domestically (no ISD), and it lets
the autonomous swarm **call municipal officials outbound** to brief them when an issue is filed.

It does **not** replace the agent swarm. The voice agent only captures speech and POSTs the
issue to the existing Next.js webhook (`/api/voice`) — same pipeline, same map pin.

```
Citizen  --dial +91 (Vobiz)-->  LiveKit SIP  -->  agent.py (Gemini Live)  --POST /api/voice-->  swarm + map
Swarm files issue  -->  Next.js POST /notify  -->  notify_server.py  --outbound SIP-->  official's phone
```

Voice stack: **Gemini Live** (speech-to-speech) via `livekit-plugins-google` — fully Google,
so it keeps the "Google technologies" story.

---

## What you need (accounts)

| Service | For | Notes |
|---|---|---|
| [LiveKit Cloud](https://livekit.com/) | real-time audio + SIP bridge | free tier; get URL + API key/secret |
| [Vobiz](https://www.vobiz.ai/) | +91 number + SIP trunk (in/out) | self-serve, pay-per-minute; **KYC: Aadhaar + PAN** ([docs](https://docs.vobiz.ai/platform/sip/overview)) |
| Google AI (Gemini) | Gemini Live voice | a `GOOGLE_API_KEY` from aistudio.google.com |

> **KYC reality:** a real +91 DID requires Aadhaar + PAN per DoT rules — there's no way around
> this with any provider. Provisioning the proper number series can take a couple of days.

---

## Setup

```bash
cd voice-agent
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill it in
```

1. **Fill `.env`** with LiveKit, Google, and Vobiz credentials (see comments in `.env.example`).
2. **Wire the SIP trunks** (one time):
   ```bash
   python setup_trunks.py
   ```
   Copy the printed `SIP_OUTBOUND_TRUNK_ID=...` into `.env`. This creates the inbound trunk,
   the dispatch rule (so each call runs the agent), and the outbound trunk for official calls.
3. **In the Vobiz console**, point your +91 number's inbound route to your LiveKit SIP URI
   (LiveKit → Settings → SIP shows the address; Vobiz docs cover the inbound origination side).

## Run

```bash
# 1) the agent worker (handles both inbound calls and outbound notify sessions)
python agent.py dev          # use `start` in production

# 2) the notify server (the Next.js app calls this to dial officials)
uvicorn notify_server:app --host 0.0.0.0 --port 8080
```

## Connect the Next.js app

Set these env vars on the Cloud Run service so the swarm can trigger official calls:

```
VOICE_AGENT_URL=https://<your-notify-server-host>     # where notify_server.py is reachable
NOTIFY_SECRET=<same long random string as voice-agent/.env>
```

If `VOICE_AGENT_URL` is unset, the app still runs fine — the outbound call step just logs
instead of dialing, so nothing breaks during local dev or judging without telephony.

When you have the +91 number, also update `_VOICE_NUMBER` in [`web/cloudbuild.yaml`](../web/cloudbuild.yaml)
so the in-app "Call the agent" button shows it.

## Test

- **Inbound:** dial your +91 number → you should hear the Namaste greeting; after you describe an
  issue a pin appears on the live map and you get a tracking id.
- **Outbound:** in the app's starter guide → "For officials", register a phone + area, then file a
  report in that area (photo/text/call) → that phone rings with the Gemini briefing.

## Notes / limits

- **Outbound to any number:** a funded Vobiz trunk dials any number (unlike Twilio trial whitelists).
- **At scale**, automated outbound calls to Indian numbers fall under TRAI **DLT/DND** rules. Officials
  opt in by entering their own number (consent), which is fine for a demo and small rollouts.
- The LiveKit Agents / SIP API surface evolves quickly — if a call in `setup_trunks.py` or
  `notify_server.py` drifts, check the current [LiveKit SIP docs](https://docs.livekit.io/agents/integrations/google/)
  and Vobiz's [LiveKit tutorial](https://www.youtube.com/watch?v=PlK1QXk1-zI).
```
