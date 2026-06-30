// ── Domain model for Samadhaan ──────────────────────────────

export type IssueCategory =
  | "pothole"
  | "water_leak"
  | "streetlight"
  | "garbage"
  | "sewage"
  | "fallen_tree"
  | "traffic_signal"
  | "other";

export type Severity = "low" | "medium" | "high" | "critical";

export type ReportStatus =
  | "intake" // just received, agents working
  | "diagnosed" // categorized by AI
  | "filed" // complaint drafted + routed to dept
  | "in_progress" // dept acknowledged / SLA running
  | "escalated" // SLA breached, bumped up
  | "resolved"; // proof-of-fix verified

export type ReportSource = "photo" | "voice" | "chat" | "phone";

export type AgentName =
  | "Intake"
  | "Diagnosis"
  | "Dedup"
  | "Action"
  | "Watchdog"
  | "ProofOfFix";

export interface AgentLogEntry {
  id: string;
  agent: AgentName;
  /** one-line action, e.g. "Classified as pothole (87% conf)" */
  action: string;
  /** the agent's short reasoning, shown in the live console */
  reasoning: string;
  status: "thinking" | "done" | "action";
  at: number; // epoch ms
}

export interface Department {
  key: string;
  name: string;
  slaHours: number;
}

export interface Report {
  id: string;
  shortId: string; // e.g. SMD-2841
  source: ReportSource;
  category: IssueCategory;
  title: string;
  description: string;
  severity: Severity;
  status: ReportStatus;

  lat: number;
  lng: number;
  address: string;
  area: string;

  imageUrl?: string; // before photo (data URL or remote)
  afterImageUrl?: string; // proof-of-fix photo

  department?: Department;
  draftedComplaint?: string; // the official letter the Action agent wrote
  confidence?: number; // diagnosis confidence 0..1

  reporterName?: string;
  upvotes: number;
  duplicateOf?: string; // if merged into another report

  slaDueAt?: number; // epoch ms deadline
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;

  agentLog: AgentLogEntry[];
}

export const CATEGORY_META: Record<
  IssueCategory,
  { label: string; emoji: string; department: Department }
> = {
  pothole: {
    label: "Pothole",
    emoji: "🕳️",
    department: { key: "bbmp_roads", name: "BBMP — Road Infrastructure", slaHours: 72 },
  },
  water_leak: {
    label: "Water Leak",
    emoji: "💧",
    department: { key: "bwssb", name: "BWSSB — Water Supply & Sewerage", slaHours: 24 },
  },
  streetlight: {
    label: "Streetlight",
    emoji: "💡",
    department: { key: "bescom", name: "BESCOM — Electricity", slaHours: 48 },
  },
  garbage: {
    label: "Garbage / Waste",
    emoji: "🗑️",
    department: { key: "bbmp_swm", name: "BBMP — Solid Waste Management", slaHours: 24 },
  },
  sewage: {
    label: "Sewage Overflow",
    emoji: "🚱",
    department: { key: "bwssb", name: "BWSSB — Water Supply & Sewerage", slaHours: 12 },
  },
  fallen_tree: {
    label: "Fallen Tree",
    emoji: "🌳",
    department: { key: "bbmp_forest", name: "BBMP — Forest Cell", slaHours: 12 },
  },
  traffic_signal: {
    label: "Traffic Signal",
    emoji: "🚦",
    department: { key: "btp", name: "Bengaluru Traffic Police", slaHours: 12 },
  },
  other: {
    label: "Other",
    emoji: "📍",
    department: { key: "bbmp_grievance", name: "BBMP — Public Grievance Cell", slaHours: 72 },
  },
};

export const SEVERITY_META: Record<Severity, { label: string; color: string; weight: number }> = {
  low: { label: "Low", color: "#7a8a5a", weight: 1 },
  medium: { label: "Medium", color: "#c6862a", weight: 2 },
  high: { label: "High", color: "#cf6a2a", weight: 3 },
  critical: { label: "Critical", color: "#b23a2e", weight: 4 },
};
