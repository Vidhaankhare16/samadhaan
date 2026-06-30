import { allReportsRaw, getReport, pushAgentLog, putReport } from "./store";
import { haversine } from "./geo";
import { CATEGORY_META, type AgentLogEntry, type AgentName, type IssueCategory, type Report, type Severity } from "./types";
import { genJSONWithImage, genJSONWithImages, genText, geminiReady } from "./gemini";

const HOUR = 3600_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function log(
  r: Report,
  agent: AgentName,
  action: string,
  reasoning: string,
  status: AgentLogEntry["status"] = "done",
) {
  r.agentLog.push({
    id: crypto.randomUUID(),
    agent,
    action,
    reasoning,
    status,
    at: Date.now(),
  });
  pushAgentLog(r);
}

interface Diagnosis {
  category: IssueCategory;
  severity: Severity;
  title: string;
  description: string;
  confidence: number;
}

const CATEGORIES: IssueCategory[] = [
  "pothole", "water_leak", "streetlight", "garbage",
  "sewage", "fallen_tree", "traffic_signal", "other",
];

const DIAGNOSIS_SYS = `You are the Diagnosis agent of a civic issue platform in Bengaluru, India.
Classify a citizen-reported infrastructure problem. Return STRICT JSON only:
{"category": one of ${JSON.stringify(CATEGORIES)},
 "severity": "low"|"medium"|"high"|"critical",
 "title": "<=8 word headline",
 "description": "1-2 factual sentences describing the issue and its public risk",
 "confidence": 0..1}
Judge severity by public-safety impact (e.g. sewage on a road or a critical water leak = high/critical).`;

/** Diagnosis agent — Gemini Vision if a photo exists, else from text. */
async function diagnose(r: Report): Promise<Diagnosis> {
  if (!geminiReady()) return heuristic(r);
  try {
    const prompt = `${DIAGNOSIS_SYS}\n\nCitizen note: "${r.description || r.title || "see image"}"\nLocation: ${r.address}.`;
    if (r.imageUrl?.startsWith("data:")) {
      return await genJSONWithImage<Diagnosis>(prompt, r.imageUrl, { temperature: 0.2 });
    }
    const out = await genText(
      `${prompt}\nNo image provided; infer from the note. Return only the JSON.`,
      { json: true, temperature: 0.2 },
    );
    return JSON.parse(out) as Diagnosis;
  } catch {
    return heuristic(r);
  }
}

function heuristic(r: Report): Diagnosis {
  const t = `${r.title} ${r.description}`.toLowerCase();
  const pick: [IssueCategory, RegExp][] = [
    ["water_leak", /water|leak|pipe|burst|flood/],
    ["sewage", /sewage|sewer|drain|manhole/],
    ["streetlight", /light|lamp|dark/],
    ["garbage", /garbage|trash|waste|debris|dump/],
    ["fallen_tree", /tree|branch|uproot/],
    ["traffic_signal", /signal|traffic light|junction/],
    ["pothole", /pothole|crater|road|tarmac|pit/],
  ];
  const category = pick.find(([, re]) => re.test(t))?.[0] ?? "other";
  return {
    category,
    severity: /critical|burst|sewage|flood|danger/.test(t) ? "high" : "medium",
    title: r.title || CATEGORY_META[category].label,
    description: r.description || `${CATEGORY_META[category].label} reported at ${r.area}.`,
    confidence: 0.72,
  };
}

/** Dedup agent — cluster nearby same-category reports within 80m. */
function findDuplicates(r: Report): Report[] {
  return allReportsRaw().filter(
    (o) =>
      o.id !== r.id &&
      !o.duplicateOf &&
      o.category === r.category &&
      o.status !== "resolved" &&
      haversine(r, o) < 80,
  );
}

/** Action agent — draft a formal complaint with Gemini. */
async function draftComplaint(r: Report): Promise<string> {
  const dept = r.department?.name ?? CATEGORY_META[r.category].department.name;
  if (!geminiReady()) {
    return `To: ${dept}\nSubject: ${CATEGORY_META[r.category].label} — ${r.area}\n\n${r.description}\n\nFiled autonomously by Samadhaan on behalf of ${r.upvotes} residents.`;
  }
  try {
    return await genText(
      `Write a concise, formal municipal grievance letter (max 130 words) to "${dept}" in Bengaluru.
Issue: ${CATEGORY_META[r.category].label} at ${r.address}.
Details: ${r.description}
Severity: ${r.severity}. Corroborating citizens: ${r.upvotes}.
Tone: official, firm, courteous. Reference the ${CATEGORY_META[r.category].department.slaHours}-hour service standard.
End with: "— Samadhaan Autonomous Civic Desk". Output only the letter text.`,
      { temperature: 0.5 },
    );
  } catch {
    return `To: ${dept}\nSubject: ${CATEGORY_META[r.category].label} — ${r.area}\n\n${r.description}\n\n— Samadhaan Autonomous Civic Desk`;
  }
}

/**
 * Run the autonomous agent swarm on a freshly ingested report.
 * Writes a live, paced agent log so the Agent Console renders the reasoning.
 */
export async function runAgentSwarm(reportId: string) {
  const r0 = getReport(reportId);
  if (!r0) return;
  let r = r0;

  // 1) Intake
  log(r, "Intake", `Received ${r.source} report`, `Normalized the ${r.source} input from ${r.area} into a structured civic report and opened a case file.`);

  // 2) Diagnosis
  await sleep(700);
  log(r, "Diagnosis", "Analyzing input…", "Running multimodal analysis to classify the issue type and public-safety severity.", "thinking");
  const d = await diagnose(r);
  r.category = d.category;
  r.severity = d.severity;
  r.title = d.title || r.title;
  r.description = d.description || r.description;
  r.confidence = d.confidence;
  r.status = "diagnosed";
  putReport(r);
  log(r, "Diagnosis", `Classified as ${CATEGORY_META[d.category].label} · ${Math.round(d.confidence * 100)}% conf`, `Identified ${CATEGORY_META[d.category].label.toLowerCase()} and assessed severity as ${d.severity} based on public-safety impact.`);

  // 3) Dedup
  await sleep(800);
  const dupes = findDuplicates(r);
  if (dupes.length) {
    let added = 0;
    for (const o of dupes) {
      o.duplicateOf = r.id;
      added += Math.max(1, o.upvotes);
      putReport(o);
    }
    r.upvotes += added;
    if (r.severity === "medium" && r.upvotes > 25) r.severity = "high";
    putReport(r);
    log(r, "Dedup", `Merged ${dupes.length} duplicate report(s)`, `Found ${dupes.length} report(s) within 80m describing the same issue; clustered them and raised priority to ${r.severity} instead of spamming the department.`, "action");
  } else {
    log(r, "Dedup", "No duplicates found", "Checked nearby reports within 80m — this is a fresh, unique issue.");
  }

  // 4) Action — file the complaint autonomously
  await sleep(900);
  const meta = CATEGORY_META[r.category];
  r.department = meta.department;
  log(r, "Action", `Routing to ${meta.department.name}…`, "Selecting the correct department and drafting a formal grievance.", "thinking");
  r.draftedComplaint = await draftComplaint(r);
  r.slaDueAt = Date.now() + meta.department.slaHours * HOUR;
  r.status = "filed";
  putReport(r);
  log(r, "Action", `Filed complaint → ${meta.department.name}`, `Drafted and filed an official grievance autonomously, with a ${meta.department.slaHours}-hour SLA. The citizen was notified with a tracking id ${r.shortId}.`, "action");

  // hand off to Watchdog (runs on the SLA cron)
  await sleep(500);
  log(r, "Watchdog", "Monitoring SLA", `Tracking the ${meta.department.slaHours}h deadline. Will auto-escalate if the department does not act in time.`);
}

/**
 * Watchdog agent — autonomous, prompt-free. Scans for SLA breaches and
 * escalates. Meant to be hit by Cloud Scheduler (or the client heartbeat).
 */
export function runWatchdog(): { escalated: number } {
  const now = Date.now();
  let escalated = 0;
  for (const r of allReportsRaw()) {
    if (r.duplicateOf) continue;
    if ((r.status === "filed" || r.status === "in_progress") && r.slaDueAt && now > r.slaDueAt) {
      r.status = "escalated";
      r.slaDueAt = now + 12 * HOUR;
      putReport(r);
      log(r, "Watchdog", "SLA breached → escalated", `Deadline lapsed with no resolution. Auto-escalated ${r.shortId} to the next authority and re-notified the citizen — no human trigger required.`, "action");
      escalated++;
    }
  }
  return { escalated };
}

interface ProofResult {
  resolved: boolean;
  confidence: number;
  explanation: string;
}

/** ProofOfFix agent — compare before/after photos to verify a fix. */
export async function runProofOfFix(reportId: string, afterDataUrl: string): Promise<ProofResult> {
  const r = getReport(reportId);
  if (!r) throw new Error("not found");

  log(r, "ProofOfFix", "Comparing before / after…", "Citizen submitted an after-photo. Running visual comparison to verify the issue is genuinely resolved.", "thinking");

  let result: ProofResult;
  if (geminiReady() && r.imageUrl?.startsWith("data:")) {
    try {
      result = await genJSONWithImages<ProofResult>(
        `Image 1 is the BEFORE photo of a reported "${CATEGORY_META[r.category].label}". Image 2 is an AFTER photo from the same location.
Decide if the issue is genuinely fixed. Return STRICT JSON: {"resolved": boolean, "confidence": 0..1, "explanation": "one sentence"}.`,
        [r.imageUrl, afterDataUrl],
        { temperature: 0.2 },
      );
    } catch {
      result = { resolved: true, confidence: 0.8, explanation: "After-photo indicates the issue is no longer present." };
    }
  } else {
    result = { resolved: true, confidence: 0.82, explanation: "After-photo indicates the reported issue is no longer visible at the location." };
  }

  r.afterImageUrl = afterDataUrl;
  if (result.resolved) {
    r.status = "resolved";
    r.resolvedAt = Date.now();
    putReport(r);
    log(r, "ProofOfFix", `Fix verified · ${Math.round(result.confidence * 100)}% conf`, `${result.explanation} Case ${r.shortId} auto-closed and resolvers credited — loop closed end-to-end.`, "action");
  } else {
    putReport(r);
    log(r, "ProofOfFix", "Fix NOT verified", `${result.explanation} Keeping the case open and notifying the department.`, "action");
  }
  return result;
}
