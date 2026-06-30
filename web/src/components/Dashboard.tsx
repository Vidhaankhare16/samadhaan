"use client";

import { useMemo } from "react";
import { CATEGORY_META, type IssueCategory, type Report } from "@/lib/types";
import type { ActivityItem } from "@/lib/useLive";

export default function Dashboard({
  reports,
  activity,
}: {
  reports: Report[];
  activity: ActivityItem[];
}) {
  const s = useMemo(() => {
    const total = reports.length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const escalated = reports.filter((r) => r.status === "escalated").length;
    const withTime = reports.filter((r) => r.resolvedAt);
    const avg =
      withTime.length > 0
        ? withTime.reduce((a, r) => a + (r.resolvedAt! - r.createdAt), 0) / withTime.length / 3600_000
        : 0;
    const cats = (Object.keys(CATEGORY_META) as IssueCategory[])
      .map((c) => ({ c, n: reports.filter((r) => r.category === c).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);
    const areas = Object.entries(
      reports.reduce<Record<string, number>>((acc, r) => ((acc[r.area] = (acc[r.area] ?? 0) + 1), acc), {}),
    )
      .map(([area, n]) => ({ area, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
    return { total, resolved, escalated, avg, cats, areas };
  }, [reports]);

  const actions = activity.filter((a) => a.status === "action").length;
  const maxCat = Math.max(1, ...s.cats.map((c) => c.n));
  const maxArea = Math.max(1, ...s.areas.map((a) => a.n));

  return (
    <div className="p-4 space-y-4 overflow-y-auto thin-scroll h-full">
      <div className="grid grid-cols-2 gap-2">
        <Kpi big label="Issues tracked" value={s.total} />
        <Kpi big label="Resolved" value={s.resolved} accent="#236646" />
        <Kpi label="Resolution rate" value={`${s.total ? Math.round((s.resolved / s.total) * 100) : 0}%`} />
        <Kpi label="Avg. resolve" value={`${s.avg.toFixed(1)}h`} />
        <Kpi label="Autonomous actions" value={actions} accent="#a8501f" />
        <Kpi label="Escalations" value={s.escalated} accent="#9c2f24" />
      </div>

      <div className="card p-3">
        <div className="eyebrow mb-2">Issues by category</div>
        <div className="space-y-1.5">
          {s.cats.map(({ c, n }) => (
            <div key={c} className="flex items-center gap-2 text-[12px]">
              <span className="w-5">{CATEGORY_META[c].emoji}</span>
              <span className="w-24 shrink-0 text-ink-soft">{CATEGORY_META[c].label}</span>
              <div className="flex-1 h-3 bg-paper-2 rounded-sm overflow-hidden border border-line">
                <div className="h-full bg-saffron/70" style={{ width: `${(n / maxCat) * 100}%` }} />
              </div>
              <span className="mono w-5 text-right">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-3">
        <div className="eyebrow mb-2">Hotspots</div>
        <div className="space-y-1.5">
          {s.areas.map(({ area, n }) => (
            <div key={area} className="flex items-center gap-2 text-[12px]">
              <span className="w-28 shrink-0 text-ink-soft truncate">{area}</span>
              <div className="flex-1 h-3 bg-paper-2 rounded-sm overflow-hidden border border-line">
                <div className="h-full bg-deep/60" style={{ width: `${(n / maxArea) * 100}%` }} />
              </div>
              <span className="mono w-5 text-right">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-ink-soft leading-relaxed px-1">
        Anonymized, aggregated civic intelligence — the kind of dashboard a city planner or NGO
        could act on. Updates live as agents work.
      </p>
    </div>
  );
}

function Kpi({ label, value, accent, big }: { label: string; value: string | number; accent?: string; big?: boolean }) {
  return (
    <div className="card p-3">
      <div className="eyebrow text-[9px]">{label}</div>
      <div className={`serif ${big ? "text-3xl" : "text-2xl"} mt-0.5`} style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}
