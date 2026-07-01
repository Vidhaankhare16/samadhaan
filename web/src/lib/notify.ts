// Outbound "the agent calls the official" trigger.
//
// When the Action agent files a complaint, we ask the voice-agent notify server
// to dial every official subscribed to that area and have Gemini Live brief them.
//
// Fully gated: if VOICE_AGENT_URL is unset (e.g. before the SIP stack is wired,
// or during local dev / judging without telephony), this no-ops and just logs —
// so the app deploys and runs green with or without the phone layer.

import { CATEGORY_META, type Report } from "./types";
import { officialsForArea, normalizePhone, type Official } from "./officials";

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

/**
 * Immediately ring a number with a demo briefing — powers the starter guide's
 * "Get a call from our agent" button, so the caller hears exactly what an
 * escalated official hears. Returns why it didn't dial (if it didn't).
 */
export async function placeDemoCall(rawPhone: string): Promise<{ ok: boolean; reason?: string }> {
  const phone = normalizePhone(rawPhone);
  if (!VOICE_AGENT_URL) {
    console.log(`[notify] demo call for ${phone} skipped — voice-agent not configured.`);
    return { ok: false, reason: "voice-agent-not-configured" };
  }
  try {
    const resp = await fetch(`${VOICE_AGENT_URL}/notify`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-notify-secret": NOTIFY_SECRET },
      body: JSON.stringify({
        phone,
        title: "a large pothole on the main road",
        category: "pothole",
        severity: "high",
        area: "your area",
        shortId: "DEMO",
        department: "the municipal corporation",
      }),
    });
    if (!resp.ok) {
      console.warn(`[notify] demo call ${phone} failed: ${resp.status}`);
      return { ok: false, reason: `notify-${resp.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.warn(`[notify] demo call ${phone} errored:`, err);
    return { ok: false, reason: "network" };
  }
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
