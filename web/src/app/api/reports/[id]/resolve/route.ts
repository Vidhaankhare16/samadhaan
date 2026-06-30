import { NextResponse } from "next/server";
import { runProofOfFix } from "@/lib/agents";
import { getReport } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!getReport(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (!body.afterImageUrl)
    return NextResponse.json({ error: "afterImageUrl required" }, { status: 400 });
  const result = await runProofOfFix(id, body.afterImageUrl);
  return NextResponse.json({ result, report: getReport(id) });
}
