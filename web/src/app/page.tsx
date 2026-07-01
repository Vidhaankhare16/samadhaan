"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLive } from "@/lib/useLive";
import { CITY_CENTER } from "@/lib/geo";
import type { Report } from "@/lib/types";
import type { Place } from "@/lib/places";
import CommandPanel, { type PanelView } from "@/components/CommandPanel";
import StarterGuide from "@/components/StarterGuide";
import ReportModal from "@/components/ReportModal";
import SpeakModal from "@/components/SpeakModal";
import NeedsModal from "@/components/NeedsModal";
import Toaster, { type Toast } from "@/components/Toaster";
import { CATEGORY_META } from "@/lib/types";
import { useLocale } from "@/lib/useLocale";
import { deptName, localizeArea, localizeReport, localizeText } from "@/lib/locale";

const CityMap = dynamic(() => import("@/components/CityMap"), { ssr: false });

type ModalKind = null | "report" | "speak" | "needs";
export interface GeoOffset { dLat: number; dLng: number }

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
  const [guide, setGuide] = useState(true); // opens on every load
  const [needsPlaces, setNeedsPlaces] = useState<Place[]>([]);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [sheetFull, setSheetFull] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notifiedRef = useRef<Map<string, string>>(new Map());
  const sheetDragY = useRef<number | null>(null);
  const isDesktop = useIsDesktop();

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    setToasts((cur) => [...cur, { ...t, id: crypto.randomUUID() }].slice(-3));
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  // auto-detect location → center the map on the user's vicinity
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // shift the (synthetic) city data so it sits around wherever the user is
  const offset: GeoOffset = useMemo(
    () =>
      userLoc
        ? { dLat: userLoc.lat - CITY_CENTER.lat, dLng: userLoc.lng - CITY_CENTER.lng }
        : { dLat: 0, dLng: 0 },
    [userLoc],
  );

  // resolve the user's real city + neighborhood names from their location
  const locale = useLocale(userLoc, offset);

  // Notify the citizen when their report is actually routed to / escalated by /
  // resolved with an authority — fires once per status transition per report.
  useEffect(() => {
    for (const r of reports) {
      const prev = notifiedRef.current.get(r.id);
      if (prev === r.status) continue;
      const seen = notifiedRef.current.has(r.id);
      notifiedRef.current.set(r.id, r.status);
      // never toast on first sighting (initial snapshot / seeded reports) — only
      // on a real status change observed live during this session.
      if (!seen) continue;
      const emoji = CATEGORY_META[r.category]?.emoji ?? "📍";
      const area = localizeArea(r.area, locale);
      const dept = r.department ? deptName(r.category, locale?.city) : "the department";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- notify on live status change
      if (r.status === "filed" && r.department) {
        pushToast({
          emoji: "✅",
          accent: "#2f7d57",
          title: `Reported to ${dept}`,
          body: `${emoji} ${r.shortId} · ${area} — a complaint was filed automatically with a ${r.department.slaHours}-hour response standard.`,
        });
      } else if (r.status === "escalated") {
        pushToast({
          emoji: "⚠️",
          accent: "#b23a2e",
          title: `${r.shortId} escalated to higher authority`,
          body: `${dept} missed its SLA — Samadhaan auto-escalated it for you.`,
        });
      } else if (r.status === "resolved") {
        pushToast({
          emoji: "🎉",
          accent: "#2f7d57",
          title: `${r.shortId} resolved & verified`,
          body: `${emoji} ${area} — the fix was confirmed and the case closed.`,
        });
      }
    }
  }, [reports, pushToast, locale]);

  // shift coordinates to the user, then relabel all text to their city
  const shiftedReports = useMemo(
    () =>
      reports.map((r) =>
        localizeReport({ ...r, lat: r.lat + offset.dLat, lng: r.lng + offset.dLng }, locale),
      ),
    [reports, offset, locale],
  );
  // recommended places are REAL nearby places (real coords) — no shift/relabel
  const routeTo = useMemo(() => {
    const p = needsPlaces.find((x) => x.id === routeId);
    return p ? { ...p, _origin: userLoc } : null;
  }, [needsPlaces, routeId, userLoc]);

  const localizedActivity = useMemo(
    () =>
      locale
        ? activity.map((a) => ({
            ...a,
            area: localizeArea(a.area, locale),
            action: localizeText(a.action, locale),
            reasoning: localizeText(a.reasoning, locale),
          }))
        : activity,
    [activity, locale],
  );

  // autonomous watchdog heartbeat
  useEffect(() => {
    const tick = () => fetch("/api/watchdog", { method: "POST" }).catch(() => {});
    tick();
    const id = setInterval(tick, 45000);
    return () => clearInterval(id);
  }, []);

  const selected: Report | null = useMemo(
    () => shiftedReports.find((r) => r.id === selectedId) ?? null,
    [shiftedReports, selectedId],
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
      reports={shiftedReports}
      activity={localizedActivity}
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
      <CityMap
        reports={shiftedReports}
        places={needsPlaces}
        focus={userLoc}
        routeTo={routeTo}
        selectedId={selectedId}
        onSelect={selectReport}
      />

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
            onTouchStart={(e) => (sheetDragY.current = e.touches[0].clientY)}
            onTouchEnd={(e) => {
              if (sheetDragY.current == null) return;
              const dy = e.changedTouches[0].clientY - sheetDragY.current;
              if (dy < -35) setSheetFull(true);
              else if (dy > 35) setSheetFull(false);
              sheetDragY.current = null;
            }}
            className="shrink-0 py-2.5 grid place-items-center touch-none"
            aria-label={sheetFull ? "Collapse panel" : "Expand panel"}
          >
            <span className="h-1.5 w-12 rounded-full bg-line-strong" />
          </button>
          <div className="flex-1 min-h-0">{panel}</div>
        </aside>
      )}

      {routeTo && (
        <div className="absolute inset-x-0 top-14 sm:top-16 z-30 flex justify-center px-3 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-civic-blue text-white rounded-full pl-3.5 pr-2 py-1.5 shadow-lg rise max-w-[92vw]">
            <span className="text-sm">🧭</span>
            <span className="text-[12.5px] font-medium truncate">Routing to {routeTo.name}</span>
            <a
              href={`https://www.google.com/maps/dir/?api=1${userLoc ? `&origin=${userLoc.lat},${userLoc.lng}` : ""}&destination=${routeTo.lat},${routeTo.lng}`}
              target="_blank"
              rel="noreferrer"
              className="ml-1 text-[11px] mono bg-white/15 hover:bg-white/25 rounded-full px-2 py-0.5 transition"
            >
              open ↗
            </a>
            <button
              onClick={() => setRouteId(null)}
              aria-label="Clear route"
              className="text-white/90 hover:text-white text-sm leading-none px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Toaster toasts={toasts} onDismiss={dismissToast} />

      {guide && <StarterGuide onClose={() => setGuide(false)} />}
      {modal === "report" && <ReportModal offset={offset} onClose={() => setModal(null)} onFiled={onFiled} />}
      {modal === "speak" && <SpeakModal onClose={() => setModal(null)} onFiled={onFiled} />}
      {modal === "needs" && (
        <NeedsModal
          userLoc={userLoc}
          onClose={() => setModal(null)}
          onShowOnMap={(places) => setNeedsPlaces(places)}
          onRoute={(place) => {
            setNeedsPlaces((prev) => (prev.some((p) => p.id === place.id) ? prev : [...prev, place]));
            setRouteId(place.id);
            setModal(null);
            if (!isDesktop) setSheetFull(false);
          }}
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
