import { nextShortId, putReport } from "./store";
import { runAgentSwarm } from "./agents";
import { AREAS, jitter, nearestArea } from "./geo";
import type { IssueCategory, Report, ReportSource, Severity } from "./types";

export interface IngestInput {
  source: ReportSource;
  note?: string; // free text / transcript
  title?: string;
  imageUrl?: string; // data URL
  lat?: number;
  lng?: number;
  area?: string;
  reporterName?: string;
  // pre-classification from the upload-time vision pass (skip re-diagnosing)
  category?: IssueCategory;
  severity?: Severity;
  confidence?: number;
}

/** Create a report, place it on the map immediately, then run the agent swarm. */
export function ingestReport(input: IngestInput): Report {
  // resolve location: explicit coords > named area > random Bengaluru area
  let lat = input.lat;
  let lng = input.lng;
  let area = input.area;

  if (lat == null || lng == null) {
    const anchor =
      (area && AREAS.find((a) => a.name.toLowerCase() === area!.toLowerCase())) ||
      pickAreaFromText(input.note) ||
      AREAS[Math.floor(Math.random() * AREAS.length)];
    const p = jitter(anchor, 450);
    lat = p.lat;
    lng = p.lng;
    area = anchor.name;
  }
  if (!area) area = nearestArea({ lat, lng }).name;

  const preClassified = Boolean(input.category);
  const now = Date.now();
  const report: Report = {
    id: crypto.randomUUID(),
    shortId: nextShortId(),
    source: input.source,
    category: input.category ?? "other",
    title: input.title || titleFrom(input.note) || "New civic report",
    description: input.note || "",
    severity: input.severity ?? "medium",
    status: "intake",
    lat,
    lng,
    address: `${area}, Bengaluru`,
    area,
    imageUrl: input.imageUrl,
    reporterName: input.reporterName,
    upvotes: 1,
    confidence: input.confidence,
    createdAt: now,
    updatedAt: now,
    agentLog: [],
  };

  putReport(report, "report:new"); // marker appears on the live map instantly
  void runAgentSwarm(report.id, { preClassified }); // autonomous swarm, streams to the console
  return report;
}

function pickAreaFromText(text?: string) {
  if (!text) return undefined;
  const t = text.toLowerCase();
  return AREAS.find((a) => t.includes(a.name.toLowerCase()));
}

function titleFrom(note?: string): string | undefined {
  if (!note) return undefined;
  const s = note.trim().replace(/\s+/g, " ");
  return s.length > 60 ? s.slice(0, 57) + "…" : s;
}
