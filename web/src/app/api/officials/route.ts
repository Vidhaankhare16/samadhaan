import { NextResponse } from "next/server";
import { addOfficial, listOfficials } from "@/lib/officials";

export const dynamic = "force-dynamic";

/**
 * Register a municipal official to receive an outbound phone briefing whenever an
 * issue is filed in their area. The agent calls THEM — no app or internet needed
 * on their side. Body: { phone, area?, name? }.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone: string = (body.phone ?? "").toString();

  if (!phone.replace(/\D/g, "")) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const official = addOfficial({
    phone,
    area: body.area?.toString(),
    name: body.name?.toString(),
  });

  return NextResponse.json({
    ok: true,
    official: { phone: official.phone, area: official.area, name: official.name },
  });
}

export async function GET() {
  return NextResponse.json({
    officials: listOfficials().map((o) => ({ phone: o.phone, area: o.area, name: o.name })),
  });
}
