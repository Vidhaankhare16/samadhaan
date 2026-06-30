"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useLive } from "@/lib/useLive";
import type { Report } from "@/lib/types";
import type { Place } from "@/lib/places";
import CommandPanel, { type PanelView } from "@/components/CommandPanel";
import StarterGuide from "@/components/StarterGuide";
import ReportModal from "@/components/ReportModal";
import SpeakModal from "@/components/SpeakModal";
import NeedsModal from "@/components/NeedsModal";

const CityMap = dynamic(() => import("@/components/CityMap"), { ssr: false });

type ModalKind = null | "report" | "speak" | "needs";

function useIsDesktop() {
  const [d, setD] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setD(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return d;
}

export default function Home() {
  const { reports, activity, connected } = useLive();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<PanelView>("pulse");
  const [modal, setModal] = useState<ModalKind>(null);
  const [guide, setGuide] = useState(false);
  const [needsPlaces, setNeedsPlaces] = useState<Place[]>([]);
  const [sheetFull, setSheetFull] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!localStorage.getItem("sam_seen")) {
      setGuide(true);
      localStorage.setItem("sam_seen", "1");
    }
  }, []);

  // autonomous watchdog heartbeat
  useEffect(() => {
    const tick = () => fetch("/api/watchdog", { method: "POST" }).catch(() => {});
    tick();
    const id = setInterval(tick, 45000);
    return () => clearInterval(id);
  }, []);

  const selected: Report | null = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? null,
    [reports, selectedId],
  );

  const resolved = reports.filter((r) => r.status === "resolved").length;
  const actions = activity.filter((a) => a.status === "action").length;

  function onFiled(r: Report) {
    setModal(null);
    setSelectedId(r.id);
    setView("agents");
    if (!isDesktop) setSheetFull(true);
  }

  function selectReport(id: string | null) {
    setSelectedId(id);
    if (!isDesktop && id) setSheetFull(true);
  }

  const panel = (
    <CommandPanel
      reports={reports}
      activity={activity}
      selected={selected}
      onSelect={selectReport}
      view={view}
      setView={setView}
      onReport={() => setModal("report")}
      onSpeak={() => setModal("speak")}
      onNeeds={() => setModal("needs")}
    />
  );

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Map fills everything */}
      <CityMap reports={reports} places={needsPlaces} selectedId={selectedId} onSelect={selectReport} />

      {/* Top bar */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-3 sm:px-4 py-2.5 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-paper-2/90 backdrop-blur border border-line rounded-full pl-3 pr-2 py-1.5 shadow-sm">
          <span className="serif text-lg leading-none" style={{ fontFamily: "system-ui,'Noto Sans Devanagari',serif" }}>समाधान</span>
          <span className="serif text-base leading-none hidden sm:inline">Samadhaan</span>
          <span className="flex items-center gap-1 mono text-[10px] ml-1" style={{ color: connected ? "#236646" : "#9c2f24" }}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${connected ? "bg-verify live-dot" : "bg-urgent"}`} />
            LIVE
          </span>
        </div>

        <div className="pointer-events-auto ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 bg-paper-2/90 backdrop-blur border border-line rounded-full px-3 py-1.5 shadow-sm">
            <Kpi label="Tracked" value={reports.length} />
            <Kpi label="Resolved" value={resolved} color="#236646" />
            <Kpi label="Actions" value={actions} color="#a8501f" />
          </div>
          <button
            onClick={() => setGuide(true)}
            className="bg-paper-2/90 backdrop-blur border border-line rounded-full px-3 py-1.5 text-[12px] mono shadow-sm hover:border-ink"
          >
            ⓘ Guide
          </button>
        </div>
      </header>

      {/* Adaptive panel */}
      {isDesktop ? (
        <aside className="absolute left-4 top-16 bottom-4 w-[384px] z-20 bg-paper-2 border border-line-strong rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {panel}
        </aside>
      ) : (
        <aside
          className="fixed inset-x-0 bottom-0 z-20 bg-paper-2 border-t border-line-strong rounded-t-2xl shadow-2xl flex flex-col overflow-hidden transition-[height] duration-300"
          style={{ height: sheetFull ? "88vh" : "46vh" }}
        >
          <button
            onClick={() => setSheetFull((v) => !v)}
            className="shrink-0 py-2 grid place-items-center"
            aria-label={sheetFull ? "Collapse panel" : "Expand panel"}
          >
            <span className="h-1.5 w-12 rounded-full bg-line-strong" />
          </button>
          <div className="flex-1 min-h-0">{panel}</div>
        </aside>
      )}

      {guide && (
        <StarterGuide
          onSpeak={() => { setGuide(false); setModal("speak"); }}
          onPhoto={() => { setGuide(false); setModal("report"); }}
          onNeeds={() => { setGuide(false); setModal("needs"); }}
          onClose={() => setGuide(false)}
        />
      )}
      {modal === "report" && <ReportModal onClose={() => setModal(null)} onFiled={onFiled} />}
      {modal === "speak" && <SpeakModal onClose={() => setModal(null)} onFiled={onFiled} />}
      {modal === "needs" && (
        <NeedsModal
          onClose={() => setModal(null)}
          onShowOnMap={(places) => { setNeedsPlaces(places); setModal(null); }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center leading-none">
      <div className="serif text-lg" style={color ? { color } : undefined}>{value}</div>
      <div className="eyebrow text-[8px]">{label}</div>
    </div>
  );
}
