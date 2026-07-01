import { NextResponse } from "next/server";
import { placeDemoCall } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Starter-guide "Get a call from our agent" demo. Immediately places an outbound
 * briefing call to the given number via the voice-agent, so the caller experiences
 * exactly what a municipal official hears when an issue is escalated.
 * Body: { phone }.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone: string = (body.phone ?? "").toString();

  if (!phone.replace(/\D/g, "")) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const result = await placeDemoCall(phone);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
