import { NextResponse } from "next/server";
import { matchPlaces, NEED_PROFILES, type NeedTag, type Place } from "@/lib/places";
import { haversine } from "@/lib/geo";
import { genJSON, geminiReady } from "@/lib/gemini";

export const dynamic = "force-dynamic";

interface Reco {
  id: string;
  reason: string;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const tags: NeedTag[] = Array.isArray(body.tags) ? body.tags : [];
  const note: string = (body.note ?? "").toString().slice(0, 300);
  const user =
    typeof body.lat === "number" && typeof body.lng === "number"
      ? { lat: body.lat as number, lng: body.lng as number }
      : null;

  // rank by proximity to the user (when we know where they are), then take the
  // closest handful as candidates for Gemini to personalize.
  let matched = matchPlaces(tags);
  if (user) {
    matched = [...matched].sort((a, b) => haversine(user, a) - haversine(user, b));
  }
  const candidates = matched.slice(0, 8);
  const dist = (p: Place) => (user ? Math.round(haversine(user, p)) : undefined);

  const labels = NEED_PROFILES.filter((p) => tags.includes(p.tag)).map((p) => p.label);

  let recos: Reco[] = [];
  if (geminiReady() && candidates.length) {
    try {
      const list = candidates
        .map((p) => {
          const d = dist(p);
          const near = d != null ? ` — ~${(d / 1000).toFixed(1)} km away` : "";
          return `${p.id}: ${p.name} (${p.kind}, ${p.area})${near} — ${p.note}`;
        })
        .join("\n");
      const out = await genJSON<{ recommendations: Reco[] }>(
        `A Bengaluru resident describes their needs: profile = [${labels.join(", ") || "general"}]; note = "${note || "none"}".
${user ? "They are sharing their live location, so prefer the CLOSEST options and mention proximity when natural." : ""}
From this list of accessible places, pick the 4-6 most relevant and, for each, write ONE warm, specific sentence (max 22 words) telling them why it suits their needs.
Places:
${list}
Return STRICT JSON: {"recommendations":[{"id":"<place id>","reason":"<sentence>"}]}`,
        { temperature: 0.5 },
      );
      recos = (out.recommendations ?? []).filter((r) => candidates.some((c) => c.id === r.id));
    } catch {
      recos = [];
    }
  }

  if (!recos.length) {
    recos = candidates.slice(0, 6).map((p) => ({ id: p.id, reason: p.note }));
  }

  const byId = new Map(candidates.map((p) => [p.id, p]));
  const places = recos
    .map((r) => {
      const place = byId.get(r.id) as Place;
      return { place, reason: r.reason, distanceM: place ? dist(place) : undefined };
    })
    .filter((x) => x.place)
    // keep them ordered nearest-first for the UI
    .sort((a, b) => (a.distanceM ?? 1e12) - (b.distanceM ?? 1e12));

  return NextResponse.json({ places });
}
