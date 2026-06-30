"use client";

import { CATEGORY_META, type Report } from "@/lib/types";
import { STATUS_META, timeAgo } from "@/lib/format";
import type { ActivityItem } from "@/lib/useLive";
import AgentConsole from "./AgentConsole";
import Dashboard from "./Dashboard";
import ReportDetail from "./ReportDetail";

export type PanelView = "pulse" | "agents" | "impact";

export default function CommandPanel({
  reports,
  activity,
  selected,
  onSelect,
  view,
  setView,
  onReport,
  onSpeak,
  onNeeds,
}: {
  reports: Report[];
  activity: ActivityItem[];
  selected: Report | null;
  onSelect: (id: string | null) => void;
  view: PanelView;
  setView: (v: PanelView) => void;
  onReport: () => void;
  onSpeak: () => void;
  onNeeds: () => void;
}) {
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const actions = activity.filter((a) => a.status === "action").length;

  if (selected) {
    return (
      <div className="flex flex-col h-full overflow-y-auto thin-scroll">
        <ReportDetail report={selected} onBack={() => onSelect(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* actions */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <button onClick={onReport} className="btn-saffron w-full text-[15px] py-3">
          ＋ Report an issue
        </button>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button onClick={onSpeak} className="rounded-lg border border-line bg-card px-3 py-2 text-sm hover:border-saffron transition-colors">
            📞 Call agent
          </button>
          <button onClick={onNeeds} className="rounded-lg border border-line bg-card px-3 py-2 text-sm hover:border-civic-blue transition-colors">
            ♿ My needs
          </button>
        </div>
      </div>

      {/* segmented */}
      <div className="flex gap-1 px-3 pb-2 shrink-0">
        {(
          [
            ["pulse", `City pulse`],
            ["agents", `Agents · ${actions}`],
            ["impact", `Impact · ${resolved}✓`],
          ] as [PanelView, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`flex-1 rounded-md py-1.5 text-[12px] font-medium transition-colors ${
              view === k ? "bg-ink text-paper-2" : "bg-card border border-line text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden border-t border-line">
        {view === "pulse" && <Pulse reports={reports} onSelect={onSelect} />}
        {view === "agents" && <AgentConsole activity={activity} onSelect={onSelect} />}
        {view === "impact" && <Dashboard reports={reports} activity={activity} />}
      </div>
    </div>
  );
}

function Pulse({ reports, onSelect }: { reports: Report[]; onSelect: (id: string) => void }) {
  return (
    <div className="h-full overflow-y-auto thin-scroll p-3 space-y-2">
      {reports.length === 0 && (
        <div className="text-center text-ink-soft text-sm py-10">No reports yet — be the first.</div>
      )}
      {reports.map((r) => {
        const st = STATUS_META[r.status];
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className="w-full text-left card p-3 hover:border-line-strong transition-colors rise"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-xl mt-0.5">{CATEGORY_META[r.category].emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium leading-snug truncate">{r.title}</div>
                <div className="text-[11.5px] text-ink-soft mt-0.5">
                  {r.area} · {timeAgo(r.createdAt)} · {r.upvotes}× backed
                </div>
              </div>
              <span
                className="shrink-0 text-[10px] mono px-1.5 py-0.5 rounded-sm"
                style={{ color: st.color, background: st.bg }}
              >
                {st.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
