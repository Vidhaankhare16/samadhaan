// Municipal officials who opted in to get an outbound phone briefing when an
// issue is filed in their area. In-process + globalThis singleton, same pattern
// as store.ts so it survives Next dev hot-reloads and shares one instance.

export interface Official {
  id: string;
  phone: string; // E.164, e.g. +9198XXXXXXXX
  area?: string; // ward / locality they cover; empty = all areas
  name?: string;
  createdAt: number;
}

declare global {
  var __samadhaanOfficials: Map<string, Official> | undefined;
}

const officials: Map<string, Official> =
  globalThis.__samadhaanOfficials ?? (globalThis.__samadhaanOfficials = new Map());

export function addOfficial(input: { phone: string; area?: string; name?: string }): Official {
  const phone = normalizePhone(input.phone);
  // de-dupe by phone number
  for (const o of officials.values()) {
    if (o.phone === phone) {
      o.area = input.area?.trim() || o.area;
      o.name = input.name?.trim() || o.name;
      return o;
    }
  }
  const official: Official = {
    id: crypto.randomUUID(),
    phone,
    area: input.area?.trim() || undefined,
    name: input.name?.trim() || undefined,
    createdAt: Date.now(),
  };
  officials.set(official.id, official);
  return official;
}

/** Officials who should be called about a report in `area` (area match or catch-all). */
export function officialsForArea(area: string | undefined): Official[] {
  const target = area?.toLowerCase().trim();
  return [...officials.values()].filter(
    (o) => !o.area || (target && o.area.toLowerCase() === target),
  );
}

export function listOfficials(): Official[] {
  return [...officials.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** Best-effort E.164 normalization, defaulting bare 10-digit numbers to India (+91). */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (hasPlus) return "+" + digits;
  if (digits.length === 10) return "+91" + digits; // bare Indian mobile
  return "+" + digits;
}
