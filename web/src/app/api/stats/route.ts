import { NextResponse } from "next/server";
import { listReports } from "@/lib/store";
import { CATEGORY_META, type IssueCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const reports = listReports();
  const total = reports.length;
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const escalated = reports.filter((r) => r.status === "escalated").length;
  const active = total - resolved;

  const resolvedWithTime = reports.filter((r) => r.resolvedAt);
  const avgResolveHrs =
    resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((s, r) => s + (r.resolvedAt! - r.createdAt), 0) /
        resolvedWithTime.length /
        3600_000
      : 0;

  const byCategory = Object.keys(CATEGORY_META).map((k) => ({
    category: k as IssueCategory,
    label: CATEGORY_META[k as IssueCategory].label,
    emoji: CATEGORY_META[k as IssueCategory].emoji,
    count: reports.filter((r) => r.category === k).length,
  }));

  const byArea = Object.entries(
    reports.reduce<Record<string, number>>((acc, r) => {
      acc[r.area] = (acc[r.area] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  const agentActions = reports.reduce(
    (s, r) => s + r.agentLog.filter((l) => l.status === "action").length,
    0,
  );

  return NextResponse.json({
    total,
    resolved,
    active,
    escalated,
    resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
    avgResolveHrs: Math.round(avgResolveHrs * 10) / 10,
    agentActions,
    byCategory: byCategory.sort((a, b) => b.count - a.count),
    byArea,
  });
}
