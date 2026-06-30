"use client";

import { AGENT_COLOR, type ActivityItem } from "@/lib/useLive";
import { timeAgo } from "@/lib/format";

const AGENTS = ["Intake", "Diagnosis", "Dedup", "Action", "Watchdog", "ProofOfFix"] as const;

export default function AgentConsole({
  activity,
  onSelect,
}: {
  activity: ActivityItem[];
  onSelect: (id: string) => void;
}) {
  const actions = activity.filter((a) => a.status === "action").length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 border-b border-line">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Autonomous Agent Desk</div>
          <div className="flex items-center gap-1.5 text-[11px] mono text-verify">
            <span className="w-1.5 h-1.5 rounded-full bg-verify live-dot inline-block" />
            LIVE
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {AGENTS.map((a) => (
            <span
              key={a}
              className="mono text-[10px] px-1.5 py-0.5 rounded-sm border"
              style={{ color: AGENT_COLOR[a], borderColor: AGENT_COLOR[a] + "55", background: AGENT_COLOR[a] + "10" }}
            >
              {a}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll px-3 py-2 space-y-1.5">
        {activity.length === 0 && (
          <div className="text-ink-soft text-sm px-1 py-6 text-center">
            Waiting for civic signals…
          </div>
        )}
        {activity.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelect(a.reportId)}
            className="w-full text-left rise rounded-sm px-2.5 py-2 hover:bg-paper-2 transition-colors border border-transparent hover:border-line"
          >
            <div className="flex items-center gap-2">
              <span
                className="mono text-[10px] font-semibold px-1.5 py-0.5 rounded-sm shrink-0"
                style={{ color: AGENT_COLOR[a.agent], background: AGENT_COLOR[a.agent] + "16" }}
              >
                {a.agent}
              </span>
              <span className="mono text-[10px] text-ink-soft">{a.shortId}</span>
              <span className="mono text-[10px] text-ink-soft ml-auto">{timeAgo(a.at)}</span>
            </div>
            <div className="mt-1 text-[13px] leading-snug text-ink flex items-start gap-1.5">
              {a.status === "action" && <span className="text-saffron">▸</span>}
              {a.status === "thinking" && (
                <span className="inline-block w-2 h-2 mt-1 rounded-full bg-amber animate-pulse shrink-0" />
              )}
              <span className={a.status === "thinking" ? "text-ink-soft italic" : "font-medium"}>
                {a.action}
              </span>
            </div>
            <div className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{a.reasoning}</div>
          </button>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-line flex items-center justify-between text-[11px] mono text-ink-soft">
        <span>{activity.length} signals</span>
        <span className="text-saffron">{actions} autonomous actions</span>
      </div>
    </div>
  );
}
