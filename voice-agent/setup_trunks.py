"""
One-time LiveKit SIP wiring for the Vobiz trunk.

Creates:
  • an INBOUND trunk    — so calls to your +91 Vobiz number reach LiveKit,
  • a DISPATCH RULE     — so each inbound call spins up a fresh room running the agent,
  • an OUTBOUND trunk   — so notify_server.py can dial officials through Vobiz.

Run once:  `python setup_trunks.py`
Then copy the printed SIP_OUTBOUND_TRUNK_ID into your .env.

Vobiz gives you (from its console / SIP trunk page):
  VOBIZ_SIP_HOST      e.g. sip.vobiz.ai
  VOBIZ_PHONE_NUMBER  your provisioned +91 DID (E.164)
  VOBIZ_USERNAME / VOBIZ_PASSWORD   SIP auth for outbound termination
See voice-agent/README.md and https://docs.vobiz.ai/platform/sip/overview
"""

from __future__ import annotations

import asyncio
import os

from dotenv import load_dotenv
from livekit import api

load_dotenv()

AGENT_NAME = os.environ.get("AGENT_NAME", "samadhaan-voice")
VOBIZ_SIP_HOST = os.environ["VOBIZ_SIP_HOST"]
VOBIZ_PHONE_NUMBER = os.environ["VOBIZ_PHONE_NUMBER"]
VOBIZ_USERNAME = os.environ.get("VOBIZ_USERNAME", "")
VOBIZ_PASSWORD = os.environ.get("VOBIZ_PASSWORD", "")


async def main() -> None:
    lkapi = api.LiveKitAPI()
    try:
        inbound = await lkapi.sip.create_sip_inbound_trunk(
            api.CreateSIPInboundTrunkRequest(
                trunk=api.SIPInboundTrunkInfo(
                    name="Vobiz inbound (Samadhaan)",
                    numbers=[VOBIZ_PHONE_NUMBER],
                )
            )
        )
        print("INBOUND trunk:", inbound.sip_trunk_id)

        rule = await lkapi.sip.create_sip_dispatch_rule(
            api.CreateSIPDispatchRuleRequest(
                trunk_ids=[inbound.sip_trunk_id],
                rule=api.SIPDispatchRule(
                    dispatch_rule_individual=api.SIPDispatchRuleIndividual(room_prefix="call-")
                ),
                room_config=api.RoomConfiguration(
                    agents=[api.RoomAgentDispatch(agent_name=AGENT_NAME)]
                ),
            )
        )
        print("DISPATCH rule:", rule.sip_dispatch_rule_id)

        outbound = await lkapi.sip.create_sip_outbound_trunk(
            api.CreateSIPOutboundTrunkRequest(
                trunk=api.SIPOutboundTrunkInfo(
                    name="Vobiz outbound (Samadhaan)",
                    address=VOBIZ_SIP_HOST,
                    numbers=[VOBIZ_PHONE_NUMBER],
                    auth_username=VOBIZ_USERNAME,
                    auth_password=VOBIZ_PASSWORD,
                )
            )
        )
        print("OUTBOUND trunk:", outbound.sip_trunk_id)
        print("\n>>> Put this in your .env:")
        print(f"SIP_OUTBOUND_TRUNK_ID={outbound.sip_trunk_id}")
    finally:
        await lkapi.aclose()


if __name__ == "__main__":
    asyncio.run(main())
