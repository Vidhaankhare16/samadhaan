import { NextResponse } from "next/server";
import { listReports } from "@/lib/store";
import { ingestReport } from "@/lib/ingest";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ reports: listReports() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const report = ingestReport({
    source: body.source ?? "chat",
    note: body.note,
    title: body.title,
    imageUrl: body.imageUrl,
    lat: typeof body.lat === "number" ? body.lat : undefined,
    lng: typeof body.lng === "number" ? body.lng : undefined,
    area: body.area,
    reporterName: body.reporterName,
  });
  return NextResponse.json({ report });
}
