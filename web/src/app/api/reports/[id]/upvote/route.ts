import { NextResponse } from "next/server";
import { getReport, putReport } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = getReport(id);
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
  r.upvotes += 1;
  putReport(r);
  return NextResponse.json({ report: r });
}
