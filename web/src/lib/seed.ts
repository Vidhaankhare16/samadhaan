import { AREAS, jitter } from "./geo";
import { CATEGORY_META, type IssueCategory, type Report, type Severity, type ReportStatus, type AgentLogEntry } from "./types";

let n = 2800;
const sid = () => `SMD-${++n}`;
const HOUR = 3600_000;

type SeedSpec = {
  category: IssueCategory;
  area: string;
  title: string;
  description: string;
  severity: Severity;
  status: ReportStatus;
  ageHours: number;
  upvotes: number;
  source?: Report["source"];
};

const SPECS: SeedSpec[] = [
  { category: "pothole", area: "Koramangala", title: "Crater-sized pothole on 80ft Road", description: "Deep pothole near Sony signal swallowing two-wheelers, worsens when waterlogged.", severity: "high", status: "in_progress", ageHours: 30, upvotes: 41, source: "photo" },
  { category: "water_leak", area: "MG Road", title: "Burst pipeline flooding footpath", description: "Continuous water gushing from a cracked main, footpath submerged for 2 days.", severity: "critical", status: "escalated", ageHours: 52, upvotes: 67, source: "phone" },
  { category: "streetlight", area: "Indiranagar", title: "Entire stretch of dark streetlights", description: "12th Main lights out for a week, unsafe for women commuters at night.", severity: "medium", status: "filed", ageHours: 14, upvotes: 23, source: "chat" },
  { category: "garbage", area: "BTM Layout", title: "Overflowing garbage black-spot", description: "Uncleared waste pile attracting strays and stench near the bus stop.", severity: "high", status: "resolved", ageHours: 70, upvotes: 38, source: "photo" },
  { category: "sewage", area: "HSR Layout", title: "Sewage overflow onto main road", description: "Manhole overflowing across 27th Main, raw sewage on the carriageway.", severity: "critical", status: "in_progress", ageHours: 9, upvotes: 52, source: "phone" },
  { category: "fallen_tree", area: "Malleshwaram", title: "Tree down blocking road after rain", description: "Large rain-tree uprooted, fully blocking Sampige Road traffic.", severity: "high", status: "resolved", ageHours: 40, upvotes: 29, source: "photo" },
  { category: "traffic_signal", area: "Hebbal", title: "Signal dead at flyover junction", description: "Traffic signal not working at Hebbal junction, snarls during peak hours.", severity: "high", status: "filed", ageHours: 5, upvotes: 19, source: "chat" },
  { category: "pothole", area: "Whitefield", title: "Series of potholes near ITPL", description: "Stretch of broken tarmac outside ITPL gate, IT commuters affected daily.", severity: "medium", status: "diagnosed", ageHours: 2, upvotes: 11, source: "photo" },
  { category: "garbage", area: "Jayanagar", title: "Construction debris dumped illegally", description: "Truckload of debris dumped on 4th Block park edge overnight.", severity: "medium", status: "in_progress", ageHours: 22, upvotes: 15, source: "photo" },
  { category: "water_leak", area: "Electronic City", title: "Leaking valve wasting water", description: "BWSSB valve leaking near Phase 1, steady water loss for days.", severity: "low", status: "filed", ageHours: 18, upvotes: 8, source: "chat" },
  { category: "streetlight", area: "HSR Layout", title: "Flickering lights on service road", description: "Lights flicker and trip every night along the service road.", severity: "low", status: "resolved", ageHours: 60, upvotes: 6, source: "photo" },
  { category: "pothole", area: "Indiranagar", title: "Pothole cluster at CMH Road", description: "Multiple potholes after recent digging left unrepaired.", severity: "medium", status: "in_progress", ageHours: 33, upvotes: 27, source: "phone" },
];

function buildLog(spec: SeedSpec, base: number, dept: string, conf: number): AgentLogEntry[] {
  const meta = CATEGORY_META[spec.category];
  const log: AgentLogEntry[] = [];
  let t = base;
  const step = (agent: AgentLogEntry["agent"], action: string, reasoning: string, status: AgentLogEntry["status"] = "done") => {
    t += 1100 + Math.random() * 1500;
    log.push({ id: `${spec.area}-${log.length}-${t}`, agent, action, reasoning, status, at: t });
  };
  step("Intake", `Received ${spec.source ?? "report"} report`, `Captured ${spec.source} input from ${spec.area} and normalized it into a structured report.`);
  if (["diagnosed", "filed", "in_progress", "escalated", "resolved"].includes(spec.status))
    step("Diagnosis", `Classified as ${meta.label} · ${Math.round(conf * 100)}% conf`, `Vision analysis matched ${meta.label.toLowerCase()} cues; assessed severity as ${spec.severity}.`);
  if (spec.upvotes > 20)
    step("Dedup", `Merged ${Math.floor(spec.upvotes / 8)} duplicate reports`, `Found nearby reports within 60m describing the same issue; clustered to raise priority instead of spamming the department.`);
  if (["filed", "in_progress", "escalated", "resolved"].includes(spec.status))
    step("Action", `Filed complaint → ${dept}`, `Drafted a formal grievance and routed it to ${dept} with a ${meta.department.slaHours}h SLA.`, "action");
  if (spec.status === "escalated")
    step("Watchdog", `SLA breached → escalated`, `Deadline passed with no resolution; auto-escalated to the next authority and notified the citizen.`, "action");
  if (spec.status === "resolved") {
    step("Watchdog", `SLA on track`, `Department acknowledged within window; monitoring for closure.`);
    step("ProofOfFix", `Fix verified from after-photo`, `Compared before/after imagery — issue no longer present. Auto-closed and credited resolvers.`, "action");
  }
  return log;
}

export function seedReports(): Report[] {
  const now = Date.now();
  return SPECS.map((spec) => {
    const anchor = AREAS.find((a) => a.name === spec.area) ?? AREAS[0];
    const p = jitter(anchor, 500);
    const meta = CATEGORY_META[spec.category];
    const createdAt = now - spec.ageHours * HOUR;
    const conf = 0.78 + Math.random() * 0.2;
    const dept = meta.department.name;
    const log = buildLog(spec, createdAt, dept, conf);
    const filed = ["filed", "in_progress", "escalated", "resolved"].includes(spec.status);
    const slaDueAt = filed ? createdAt + meta.department.slaHours * HOUR : undefined;
    return {
      id: crypto.randomUUID(),
      shortId: sid(),
      source: spec.source ?? "photo",
      category: spec.category,
      title: spec.title,
      description: spec.description,
      severity: spec.severity,
      status: spec.status,
      lat: p.lat,
      lng: p.lng,
      address: `${spec.area}, Bengaluru`,
      area: spec.area,
      department: filed ? meta.department : undefined,
      confidence: conf,
      upvotes: spec.upvotes,
      slaDueAt,
      createdAt,
      updatedAt: createdAt,
      resolvedAt: spec.status === "resolved" ? createdAt + meta.department.slaHours * 0.6 * HOUR : undefined,
      draftedComplaint: filed ? draftLetter(spec, dept) : undefined,
      agentLog: log,
    } satisfies Report;
  });
}

function draftLetter(spec: SeedSpec, dept: string): string {
  const meta = CATEGORY_META[spec.category];
  return `To: The Officer-in-Charge, ${dept}\nSubject: ${meta.label} grievance — ${spec.area}\n\nThis is to formally report a ${meta.label.toLowerCase()} at ${spec.area}, Bengaluru. ${spec.description} Severity has been assessed as ${spec.severity.toUpperCase()}. ${spec.upvotes} citizens have corroborated this issue.\n\nWe request resolution within the ${meta.department.slaHours}-hour service standard. This complaint was generated and filed autonomously by the Samadhaan civic agent on behalf of affected residents.\n\n— Samadhaan Autonomous Civic Desk`;
}
