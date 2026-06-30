import { EventEmitter } from "node:events";
import type { Report } from "./types";
import { seedReports } from "./seed";

// ── Singleton, survives Next dev hot-reloads via globalThis ──────────

type StoreShape = {
  reports: Map<string, Report>;
  bus: EventEmitter;
  counter: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __samadhaan: StoreShape | undefined;
}

function create(): StoreShape {
  const bus = new EventEmitter();
  bus.setMaxListeners(100);
  const reports = new Map<string, Report>();
  for (const r of seedReports()) reports.set(r.id, r);
  // highest seeded short id so new ones keep counting up
  const maxShort = Math.max(
    2840,
    ...[...reports.values()].map((r) => Number(r.shortId.split("-")[1]) || 0),
  );
  return { reports, bus, counter: maxShort };
}

const store: StoreShape = globalThis.__samadhaan ?? (globalThis.__samadhaan = create());

export type StoreEvent =
  | { type: "report:new"; report: Report }
  | { type: "report:update"; report: Report }
  | { type: "agent:log"; reportId: string; report: Report };

export function emit(ev: StoreEvent) {
  store.bus.emit("event", ev);
}

export function subscribe(fn: (ev: StoreEvent) => void) {
  store.bus.on("event", fn);
  return () => store.bus.off("event", fn);
}

export function nextShortId(): string {
  store.counter += 1;
  return `SMD-${store.counter}`;
}

export function listReports(): Report[] {
  return [...store.reports.values()]
    .filter((r) => !r.duplicateOf)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function allReportsRaw(): Report[] {
  return [...store.reports.values()];
}

export function getReport(id: string): Report | undefined {
  return store.reports.get(id);
}

export function putReport(r: Report, ev: StoreEvent["type"] = "report:update") {
  r.updatedAt = Date.now();
  store.reports.set(r.id, r);
  if (ev === "report:new") emit({ type: "report:new", report: r });
  else emit({ type: "report:update", report: r });
}

export function pushAgentLog(r: Report) {
  r.updatedAt = Date.now();
  store.reports.set(r.id, r);
  emit({ type: "agent:log", reportId: r.id, report: r });
}
