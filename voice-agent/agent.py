"""
Samadhaan voice agent — LiveKit + Gemini Live (speech-to-speech) over a Vobiz SIP trunk.

This is the *phone front-end* for the civic platform. It does NOT replace the
autonomous swarm: at the end of a call it POSTs the captured issue to the existing
Next.js webhook (`/api/voice`), which ingests it through the same Intake → Diagnosis
→ Dedup → Action → Watchdog pipeline and drops the same pin on the live map.

Two modes, decided by the job metadata LiveKit passes when the room is created:

  • inbound  (default): a citizen dialled the +91 Vobiz number. The agent greets in
    Hindi/English, captures the issue + area, files it, and reads back a tracking id.
  • notify  : we dialled a municipal official outbound (see notify_server.py). The
    agent speaks a short briefing about a newly filed issue and lets them ask follow-ups.

Run as a LiveKit Agents worker:  `python agent.py dev`  (or `start` in prod).
"""

from __future__ import annotations

import json
import logging
import os

import aiohttp
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import Agent, AgentSession, JobContext, RunContext, function_tool
from livekit.plugins import google

load_dotenv()

logger = logging.getLogger("samadhaan-voice")
logging.basicConfig(level=logging.INFO)

# The deployed Next.js app whose /api/voice ingests reports into the swarm.
APP_URL = os.environ.get("APP_URL", "https://samadhaan-822987556610.us-central1.run.app").rstrip("/")
GEMINI_VOICE = os.environ.get("GEMINI_VOICE", "Puck")


async def file_report_to_app(note: str, area: str | None, reporter_name: str | None) -> dict:
    """POST a phone-sourced report to the existing Next.js webhook (plain-body branch)."""
    payload = {"note": note, "area": area, "reporterName": reporter_name, "source": "phone"}
    timeout = aiohttp.ClientTimeout(total=15)
    async with aiohttp.ClientSession(timeout=timeout) as http:
        async with http.post(f"{APP_URL}/api/voice", json=payload) as resp:
            data = await resp.json()
            logger.info("filed report -> %s", data.get("report", {}).get("shortId"))
            return data


# ── Inbound: citizen reports an issue ────────────────────────────────────────

INTAKE_INSTRUCTIONS = """You are the Samadhaan civic agent answering a phone call from a citizen \
in India. Many callers are in rural areas, may have limited literacy, and may speak Hindi, \
English, or a mix. Be warm, patient, and very brief.

Open with: "Namaste! You have reached the Samadhaan civic agent. Please tell me what the \
problem is and where it is — for example, a pothole near MG Road."

Your only job: find out (1) WHAT the civic issue is (pothole, water leak, broken streetlight, \
garbage, sewage, fallen tree, etc.) and (2) WHERE it is (an area or landmark). If the caller \
gives both in one sentence, do not interrogate them further. Mirror the caller's language.

Once you have the issue and the location, call the `file_report` tool ONCE. After it returns, \
read the tracking id back digit by digit and tell them the civic agents are now handling it and \
they can watch it on the Samadhaan map. Then thank them and end warmly. Never invent a tracking id."""


class IntakeAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=INTAKE_INSTRUCTIONS)

    @function_tool
    async def file_report(
        self,
        context: RunContext,
        issue: str,
        area: str = "",
        caller_name: str = "",
    ) -> str:
        """File the citizen's civic issue into the Samadhaan pipeline.

        Args:
            issue: What the problem is, in the caller's words (e.g. "big pothole on the main road").
            area: The locality / landmark where it is, if given (e.g. "MG Road", "Indiranagar").
            caller_name: The caller's name, only if they volunteered it.
        """
        data = await file_report_to_app(issue, area or None, caller_name or None)
        report = data.get("report", {})
        short_id = report.get("shortId", "")
        resolved_area = report.get("area", area)
        spelled = " ".join(short_id.replace("-", " "))
        return (
            f"Report filed successfully. Tracking id is {spelled}. Area on file: {resolved_area}. "
            f"Read the tracking id back to the caller clearly, one character at a time."
        )


# ── Outbound: brief a municipal official about a filed issue ──────────────────

def notify_instructions(meta: dict) -> str:
    title = meta.get("title", "a civic issue")
    area = meta.get("area", "your ward")
    category = meta.get("category", "issue")
    severity = meta.get("severity", "medium")
    short_id = meta.get("shortId", "")
    dept = meta.get("department", "the concerned department")
    spelled = " ".join(short_id.replace("-", " "))
    return f"""You are the Samadhaan civic agent calling a municipal official to brief them about a \
newly filed issue. Be concise, professional, and respectful of their time.

Open with: "Namaste, this is an automated call from the Samadhaan civic platform. A new issue has \
been reported in {area} that needs your attention."

Then state, in one or two short sentences: the issue is "{title}" ({category}), severity {severity}, \
routed to {dept}, tracking id {spelled}. Tell them the full details and the formal complaint are on \
the Samadhaan dashboard. Offer to repeat the tracking id. Answer brief follow-up questions about \
location or severity using only the facts above; do not invent details. When they have what they \
need, thank them and end the call."""


class NotifyAgent(Agent):
    def __init__(self, meta: dict) -> None:
        super().__init__(instructions=notify_instructions(meta))


# ── Worker entrypoint ────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    # notify_server.py passes the issue briefing as JSON in the job metadata.
    meta: dict = {}
    raw = ctx.job.metadata or ""
    if raw:
        try:
            meta = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("could not parse job metadata: %r", raw)

    mode = meta.get("mode", "inbound")
    agent: Agent = NotifyAgent(meta) if mode == "notify" else IntakeAgent()

    session = AgentSession(
        # Gemini Live: a single realtime model handles speech-in and speech-out.
        llm=google.beta.realtime.RealtimeModel(voice=GEMINI_VOICE, temperature=0.6),
    )

    await session.start(room=ctx.room, agent=agent)

    if mode == "notify":
        # Outbound: we initiate the briefing as soon as the official picks up.
        await session.generate_reply()
    else:
        # Inbound: greet the caller immediately.
        await session.generate_reply(
            instructions="Greet the caller now with the Namaste opening line."
        )


if __name__ == "__main__":
    # agent_name must match AGENT_NAME used by setup_trunks.py and notify_server.py
    # so inbound dispatch rules and outbound dispatches route to this worker.
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name=os.environ.get("AGENT_NAME", "samadhaan-voice"),
        )
    )
