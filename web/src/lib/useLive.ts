"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentLogEntry, AgentName, Report } from "./types";

export interface ActivityItem extends AgentLogEntry {
  reportId: string;
  shortId: string;
  area: string;
}

interface LiveState {
  reports: Report[];
  activity: ActivityItem[];
  connected: boolean;
}

const MAX_ACTIVITY = 60;

export function useLive() {
  const [state, setState] = useState<LiveState>({
    reports: [],
    activity: [],
    connected: false,
  });
  const mapRef = useRef<Map<string, Report>>(new Map());
  const seenLogRef = useRef<Set<string>>(new Set());

  const commit = useCallback(() => {
    const reports = [...mapRef.current.values()]
      .filter((r) => !r.duplicateOf)
      .sort((a, b) => b.createdAt - a.createdAt);
    setState((s) => ({ ...s, reports }));
  }, []);

  const ingestLogs = useCallback((report: Report, animate: boolean) => {
    const fresh: ActivityItem[] = [];
    for (const l of report.agentLog) {
      if (seenLogRef.current.has(l.id)) continue;
      seenLogRef.current.add(l.id);
      fresh.push({ ...l, reportId: report.id, shortId: report.shortId, area: report.area });
    }
    if (!fresh.length) return;
    setState((s) => {
      const merged = animate
        ? [...fresh.reverse(), ...s.activity]
        : [...fresh.reverse(), ...s.activity];
      return { ...s, activity: merged.slice(0, MAX_ACTIVITY) };
    });
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/stream");

    es.addEventListener("snapshot", (e) => {
      const { reports } = JSON.parse((e as MessageEvent).data) as { reports: Report[] };
      mapRef.current = new Map(reports.map((r) => [r.id, r]));
      // seed activity from existing logs (most recent first)
      const all: ActivityItem[] = [];
      for (const r of reports)
        for (const l of r.agentLog) {
          seenLogRef.current.add(l.id);
          all.push({ ...l, reportId: r.id, shortId: r.shortId, area: r.area });
        }
      all.sort((a, b) => b.at - a.at);
      setState({ reports: reports.filter((r) => !r.duplicateOf).sort((a, b) => b.createdAt - a.createdAt), activity: all.slice(0, MAX_ACTIVITY), connected: true });
    });

    const onReport = (e: Event) => {
      const ev = JSON.parse((e as MessageEvent).data) as { report: Report };
      mapRef.current.set(ev.report.id, ev.report);
      commit();
      ingestLogs(ev.report, true);
    };
    es.addEventListener("report:new", onReport);
    es.addEventListener("report:update", onReport);
    es.addEventListener("agent:log", (e) => {
      const ev = JSON.parse((e as MessageEvent).data) as { report: Report };
      mapRef.current.set(ev.report.id, ev.report);
      commit();
      ingestLogs(ev.report, true);
    });

    es.onopen = () => setState((s) => ({ ...s, connected: true }));
    es.onerror = () => setState((s) => ({ ...s, connected: false }));

    return () => es.close();
  }, [commit, ingestLogs]);

  return state;
}

export const AGENT_COLOR: Record<AgentName, string> = {
  Intake: "#1f4f7a",
  Diagnosis: "#7a4fa0",
  Dedup: "#2a7a7a",
  Action: "#d2602e",
  Watchdog: "#c6862a",
  ProofOfFix: "#2f7d57",
};
