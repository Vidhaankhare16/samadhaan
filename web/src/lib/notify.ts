// Outbound "the agent calls the official" trigger.
//
// When the Action agent files a complaint, we ask the voice-agent notify server
// to dial every official subscribed to that area and have Gemini Live brief them.
//
// Fully gated: if VOICE_AGENT_URL is unset (e.g. before the SIP stack is wired,
// or during local dev / judging without telephony), this no-ops and just logs —
// so the app deploys and runs green with or without the phone layer.

import { CATEGORY_META, type Report } from "./types";
import { officialsForArea, type Official } from "./officials";

const VOICE_AGENT_URL = process.env.VOICE_AGENT_URL?.replace(/\/$/, "");
const NOTIFY_SECRET = process.env.NOTIFY_SECRET ?? "";

/** Fire an outbound briefing call to each official covering this report's area. */
export async function notifyOfficials(report: Report): Promise<void> {
  const targets = officialsForArea(report.area);
  if (targets.length === 0) return;

  if (!VOICE_AGENT_URL) {
    console.log(
      `[notify] voice-agent not configured; would call ${targets.length} official(s) ` +
        `for ${report.shortId} (${report.area}).`,
    );
    return;
  }

  await Promise.allSettled(targets.map((o) => dial(o, report)));
}

async function dial(official: Official, report: Report): Promise<void> {
  const dept = report.department?.name ?? CATEGORY_META[report.category].department.name;
  try {
    const resp = await fetch(`${VOICE_AGENT_URL}/notify`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-notify-secret": NOTIFY_SECRET },
      body: JSON.stringify({
        phone: official.phone,
        title: report.title,
        category: report.category,
        severity: report.severity,
        area: report.area,
        shortId: report.shortId,
        department: dept,
      }),
    });
    if (!resp.ok) {
      console.warn(`[notify] dial ${official.phone} failed: ${resp.status}`);
    }
  } catch (err) {
    console.warn(`[notify] dial ${official.phone} errored:`, err);
  }
}
