import type { ReportStatus } from "./types";

export const STATUS_META: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  intake: { label: "Intake", color: "#5c5247", bg: "#e8dfce" },
  diagnosed: { label: "Diagnosed", color: "#6b4a8a", bg: "#ece2f1" },
  filed: { label: "Filed", color: "#a8501f", bg: "#f3e0cf" },
  in_progress: { label: "In Progress", color: "#9a6712", bg: "#f3e7c8" },
  escalated: { label: "Escalated", color: "#9c2f24", bg: "#f3d6cf" },
  resolved: { label: "Resolved", color: "#236646", bg: "#cfe7d6" },
};

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function slaLabel(dueAt?: number): { text: string; urgent: boolean } | null {
  if (!dueAt) return null;
  const ms = dueAt - Date.now();
  if (ms <= 0) return { text: "SLA breached", urgent: true };
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60000);
  return { text: h > 0 ? `${h}h ${m}m left` : `${m}m left`, urgent: ms < 3600_000 * 3 };
}
