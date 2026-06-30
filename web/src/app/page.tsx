"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useLive } from "@/lib/useLive";
import { CATEGORY_META, SEVERITY_META, type IssueCategory, type Report } from "@/lib/types";
import Masthead from "@/components/Masthead";
import AgentConsole from "@/components/AgentConsole";
import ReportForm from "@/components/ReportForm";
import Dashboard from "@/components/Dashboard";
import ReportDrawer from "@/components/ReportDrawer";
import CallAgentCard from "@/components/CallAgentCard";

const CityMap = dynamic(() => import("@/components/CityMap"), { ssr: false });

type Tab = "agents" | "report" | "impact";

export default function Home() {
  const { reports, activity, connected } = useLive();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("agents");
  const [filter, setFilter] = useState<IssueCategory | "all">("all");

  // Autonomous Watchdog heartbeat — keeps escalations running with no human.
  useEffect(() => {
    const tick = () => fetch("/api/watchdog", { method: "POST" }).catch(() => {});
    tick();
    const id = setInterval(tick, 45000);
    return () => clearInterval(id);
  }, []);

  const shown = useMemo(
    () => (filter === "all" ? reports : reports.filter((r) => r.category === filter)),
    [reports, filter],
  );

  const selected: Report | null = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const cats = useMemo(() => {
    const present = new Set(reports.map((r) => r.category));
    return (Object.keys(CATEGORY_META) as IssueCategory[]).filter((c) => present.has(c));
  }, [reports]);

  function onFiled(r: Report) {
    setSelectedId(r.id);
    setTab("agents");
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Masthead reports={reports} activity={activity} connected={connected} />

      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <main className="relative flex-1 min-w-0">
          <CityMap reports={shown} selectedId={selectedId} onSelect={setSelectedId} />

          {/* Filter chips */}
          <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 pointer-events-none">
            <Chip active={filter === "all"} onClick={() => setFilter("all")}>
              All · {reports.length}
            </Chip>
            {cats.map((c) => (
              <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </Chip>
            ))}
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 card px-3 py-2 text-[11px] pointer-events-none">
            <div className="eyebrow mb-1">Severity</div>
            <div className="flex gap-3">
              {(["low", "medium", "high", "critical"] as const).map((s) => (
                <span key={s} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: SEVERITY_META[s].color }} />
                  {SEVERITY_META[s].label}
                </span>
              ))}
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block bg-verify" />
                Resolved
              </span>
            </div>
          </div>
        </main>

        {/* Right rail */}
        <section className="w-[400px] shrink-0 border-l border-line-strong bg-paper-2 flex flex-col">
          <div className="flex border-b border-line shrink-0">
            {(
              [
                ["agents", "Live Agents"],
                ["report", "Report"],
                ["impact", "Impact"],
              ] as [Tab, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 py-2.5 text-[13px] font-medium transition-colors relative ${
                  tab === k ? "text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {label}
                {tab === k && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-saffron rounded-full" />}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {tab === "agents" && <AgentConsole activity={activity} onSelect={setSelectedId} />}
            {tab === "report" && (
              <div className="overflow-y-auto thin-scroll h-full">
                <ReportForm onFiled={onFiled} />
                <div className="px-4 pb-4">
                  <CallAgentCard onFiled={onFiled} />
                </div>
              </div>
            )}
            {tab === "impact" && <Dashboard reports={reports} activity={activity} />}
          </div>
        </section>
      </div>

      {selected && <ReportDrawer report={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`pointer-events-auto mono text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? "bg-ink text-paper-2 border-ink"
          : "bg-card/90 backdrop-blur border-line text-ink-soft hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}
