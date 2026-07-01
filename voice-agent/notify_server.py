"""
Outbound notify server — the bridge the Next.js app calls when the swarm files an issue.

Flow:
  Action agent files a complaint  ->  Next.js POSTs /notify  ->  this server
    1. creates a LiveKit room carrying the issue briefing as metadata,
    2. dispatches the `samadhaan-voice` agent into it (runs in `notify` mode),
    3. creates an outbound SIP participant via the Vobiz trunk to dial the official.

The official simply answers their phone; Gemini Live briefs them. No internet, no ISD,
no app on their side.

Run:  `uvicorn notify_server:app --host 0.0.0.0 --port 8080`
"""

from __future__ import annotations

import os
import secrets
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from livekit import api
from pydantic import BaseModel

load_dotenv()

# LiveKit outbound SIP trunk id created by setup_trunks.py (Vobiz termination).
SIP_OUTBOUND_TRUNK_ID = os.environ["SIP_OUTBOUND_TRUNK_ID"]
# Must match the worker name in agent.py's WorkerOptions (defaults to the file/agent name).
AGENT_NAME = os.environ.get("AGENT_NAME", "samadhaan-voice")
# Shared secret so only our Next.js backend can trigger outbound calls.
NOTIFY_SECRET = os.environ.get("NOTIFY_SECRET", "")

app = FastAPI(title="Samadhaan notify server")


class NotifyRequest(BaseModel):
    phone: str            # official's number in E.164, e.g. +9198XXXXXXXX
    title: str = "a civic issue"
    category: str = "issue"
    severity: str = "medium"
    area: str = "your ward"
    shortId: str = ""
    department: str = "the concerned department"


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}


@app.post("/notify")
async def notify(req: NotifyRequest, x_notify_secret: str = Header(default="")) -> dict:
    if NOTIFY_SECRET and not secrets.compare_digest(x_notify_secret, NOTIFY_SECRET):
        raise HTTPException(status_code=401, detail="bad secret")

    room_name = f"notify-{req.shortId or uuid.uuid4().hex[:8]}"
    metadata = req.model_dump_json()  # the agent reads mode + issue facts from here

    lkapi = api.LiveKitAPI()
    try:
        # 1+2) put the agent in the room, in notify mode, with the briefing.
        await lkapi.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name=AGENT_NAME,
                room=room_name,
                metadata=_with_mode(metadata),
            )
        )

        # 3) dial the official and drop them into the same room.
        await lkapi.sip.create_sip_participant(
            api.CreateSIPParticipantRequest(
                sip_trunk_id=SIP_OUTBOUND_TRUNK_ID,
                sip_call_to=req.phone,
                room_name=room_name,
                participant_identity=f"official-{req.shortId or 'x'}",
                participant_name="Municipal official",
                wait_until_answered=False,
            )
        )
    finally:
        await lkapi.aclose()

    return {"ok": True, "room": room_name, "dialed": req.phone}


def _with_mode(metadata_json: str) -> str:
    import json

    data = json.loads(metadata_json)
    data["mode"] = "notify"
    return json.dumps(data)
