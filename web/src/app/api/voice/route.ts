import { NextResponse } from "next/server";
import { ingestReport } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * Dialogflow CX webhook fulfillment.
 * The agent collects an "issue" description and a "location" from the caller,
 * then calls this webhook (tag: file_report). We ingest it as a phone report
 * and speak back the tracking id — which the caller watches appear on the map.
 *
 * Also accepts a plain { note, area } body for quick testing without telephony.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  // Dialogflow CX shape
  const params = body?.sessionInfo?.parameters ?? {};
  const note: string =
    params.issue || params.note || body.note || body.text || "Issue reported by phone";
  const area: string | undefined = params.location || params.area || body.area;
  const reporterName: string | undefined = params.caller_name || body.reporterName;

  const report = ingestReport({
    source: "phone",
    note,
    area,
    reporterName,
  });

  const speak = `Thank you. Your ${report.area} report has been filed with tracking id ${spell(report.shortId)}. Our civic agents are now handling it. You can watch it live on the Samadhaan map.`;

  // If it's a Dialogflow CX webhook call, answer in its format.
  if (body?.sessionInfo || body?.fulfillmentInfo) {
    return NextResponse.json({
      fulfillment_response: { messages: [{ text: { text: [speak] } }] },
      sessionInfo: {
        parameters: { tracking_id: report.shortId, report_area: report.area },
      },
    });
  }

  return NextResponse.json({ report, speak });
}

// "SMD-2841" -> "S M D 2 8 4 1" so the IVR reads it clearly
function spell(s: string): string {
  return s.replace("-", " ").split("").join(" ").replace(/\s+/g, " ").trim();
}
