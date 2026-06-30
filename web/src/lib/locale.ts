// Client-side localization layer.
//
// The synthetic Bengaluru dataset is shifted spatially to wherever the user is
// (see page.tsx offset). This module relabels the *text* — area names, city,
// addresses, departments, places and complaint letters — to the user's real
// city so the app is never Bengaluru-fixated. All helpers are pure and
// idempotent: applying them to already-localized data is a no-op.

import { AREAS } from "./geo";
import { CATEGORY_META, type IssueCategory, type Report } from "./types";
import type { Place } from "./places";

export interface Locale {
  city: string;
  country?: string;
  /** original synthetic area name → real neighborhood near the user */
  areaMap: Record<string, string>;
}

// Generic, globally-valid department roles per issue category. Prefixed with
// the user's city so it reads right anywhere (e.g. "Mumbai Roads & Infrastructure").
const ROLE: Record<IssueCategory, string> = {
  pothole: "Roads & Infrastructure Dept",
  water_leak: "Water & Sewerage Board",
  streetlight: "Electricity Utility",
  garbage: "Solid Waste Management",
  sewage: "Water & Sewerage Board",
  fallen_tree: "Parks & Trees Dept",
  traffic_signal: "Traffic Police",
  other: "Public Grievance Cell",
};

// original department display name → its category (for text replacement)
const DEPT_TO_CAT = Object.entries(CATEGORY_META).map(
  ([cat, m]) => [m.department.name, cat as IssueCategory] as const,
);

/** Department name for a category, localized to the user's city when known. */
export function deptName(category: IssueCategory, city?: string): string {
  if (!city) return CATEGORY_META[category].department.name;
  return `${city} ${ROLE[category]}`;
}

export function localizeArea(area: string, locale: Locale | null): string {
  if (!locale) return area;
  return locale.areaMap[area] ?? area;
}

/**
 * Swap every synthetic area name, default department name and "Bengaluru" out
 * of free text for the user's city. Idempotent on already-localized strings.
 */
export function localizeText(text: string, locale: Locale | null): string {
  if (!locale || !text) return text;
  let out = text;
  for (const a of AREAS) {
    const local = locale.areaMap[a.name];
    if (local && local !== a.name) out = out.split(a.name).join(local);
  }
  for (const [name, cat] of DEPT_TO_CAT) out = out.split(name).join(deptName(cat, locale.city));
  if (locale.city !== "Bengaluru") out = out.split("Bengaluru").join(locale.city);
  return out;
}

/** Relabel a report's area / address / department / complaint / agent log. */
export function localizeReport(r: Report, locale: Locale | null): Report {
  if (!locale) return r;
  const area = localizeArea(r.area, locale);
  const department = r.department
    ? { ...r.department, name: deptName(r.category, locale.city) }
    : r.department;
  return {
    ...r,
    area,
    address: `${area}, ${locale.city}`,
    department,
    description: localizeText(r.description, locale),
    draftedComplaint: r.draftedComplaint ? localizeText(r.draftedComplaint, locale) : r.draftedComplaint,
    agentLog: r.agentLog.map((l) => ({
      ...l,
      action: localizeText(l.action, locale),
      reasoning: localizeText(l.reasoning, locale),
    })),
  };
}

/** Relabel a recommended place to the user's city. */
export function localizePlace(p: Place, locale: Locale | null): Place {
  if (!locale) return p;
  const area = localizeArea(p.area, locale);
  const name = p.area && area !== p.area ? p.name.split(p.area).join(area) : p.name;
  return { ...p, area, name };
}
