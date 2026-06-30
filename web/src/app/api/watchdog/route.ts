import { NextResponse } from "next/server";
import { runWatchdog } from "@/lib/agents";

export const dynamic = "force-dynamic";

// Hit by Cloud Scheduler (and a light client heartbeat) — autonomous, no prompt.
async function run() {
  const out = runWatchdog();
  return NextResponse.json({ ok: true, ...out, at: Date.now() });
}

export const GET = run;
export const POST = run;
