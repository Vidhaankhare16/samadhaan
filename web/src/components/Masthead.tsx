"use client";

import type { Report } from "@/lib/types";
import type { ActivityItem } from "@/lib/useLive";
import IntroModal from "./IntroModal";

export default function Masthead({
  reports,
  activity,
  connected,
}: {
  reports: Report[];
  activity: ActivityItem[];
  connected: boolean;
}) {
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const actions = activity.filter((a) => a.status === "action").length;

  return (
    <header className="border-b border-line-strong bg-paper-2/80 backdrop-blur sticky top-0 z-30">
      <div className="px-4 sm:px-6 py-2.5 flex items-center gap-4">
        <div className="flex items-baseline gap-2.5">
          <span className="serif text-2xl sm:text-[26px] leading-none tracking-tight" style={{ fontFamily: "system-ui, 'Noto Sans Devanagari', sans-serif" }}>
            समाधान
          </span>
          <span className="serif text-xl sm:text-2xl leading-none text-ink">Samadhaan</span>
        </div>
        <span className="hidden md:block text-[12px] text-ink-soft border-l border-line pl-3 leading-tight">
          The civic issue that<br />resolves&nbsp;itself.
        </span>

        <div className="ml-auto flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:block">
            <IntroModal />
          </div>
          <Kpi label="Tracked" value={reports.length} />
          <Kpi label="Resolved" value={resolved} color="#236646" />
          <Kpi label="Agent actions" value={actions} color="#a8501f" />
          <div className="flex items-center gap-1.5 mono text-[11px]" style={{ color: connected ? "#236646" : "#9c2f24" }}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${connected ? "bg-verify live-dot" : "bg-urgent"}`} />
            {connected ? "LIVE" : "…"}
          </div>
        </div>
      </div>
    </header>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-right leading-none">
      <div className="serif text-xl sm:text-2xl" style={color ? { color } : undefined}>{value}</div>
      <div className="eyebrow text-[8px] sm:text-[9px]">{label}</div>
    </div>
  );
}
