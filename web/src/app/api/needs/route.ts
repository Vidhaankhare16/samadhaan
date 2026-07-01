import { NextResponse } from "next/server";
import { NEED_PROFILES, type NeedTag } from "@/lib/places";
import { searchNearby, placesReady, type NearbyPlace } from "@/lib/placesNearby";
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

  // We only recommend REAL places near the user — never a fixed/far-away city.
  if (!user) return NextResponse.json({ places: [], needLocation: true });
  if (!placesReady()) return NextResponse.json({ places: [], error: "Place search is unavailable right now." });

  let candidates: NearbyPlace[];
  try {
    candidates = await searchNearby(user, tags);
  } catch {
    return NextResponse.json({ places: [], error: "Couldn't reach place search. Please try again." });
  }
  if (!candidates.length) {
    return NextResponse.json({ places: [], error: "No matching places found close to you. Try fewer filters." });
  }

  const labels = NEED_PROFILES.filter((p) => tags.includes(p.tag)).map((p) => p.label);

  // Gemini picks the best 4-6 and writes a warm, specific, proximity-aware reason.
  let recos: Reco[] = [];
  if (geminiReady()) {
    try {
      const list = candidates
        .map((p) => `${p.id}: ${p.name} (${p.kind}, ${p.area}) — ~${(p.distanceM / 1000).toFixed(1)} km away — ${p.note}`)
        .join("\n");
      const out = await genJSON<{ recommendations: Reco[] }>(
        `A resident describes their needs: profile = [${labels.join(", ") || "general"}]; note = "${note || "none"}".
These are REAL places near their current location. Pick the 4-6 best (favor closest + best accessibility match) and, for each, write ONE warm, specific sentence (max 22 words) telling them why it suits their needs. Mention proximity when natural.
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
  if (!recos.length) recos = candidates.slice(0, 6).map((p) => ({ id: p.id, reason: p.note }));

  const byId = new Map(candidates.map((p) => [p.id, p]));
  const places = recos
    .map((r) => {
      const place = byId.get(r.id)!;
      return { place, reason: r.reason, distanceM: place?.distanceM };
    })
    .filter((x) => x.place)
    .sort((a, b) => (a.distanceM ?? 1e12) - (b.distanceM ?? 1e12));

  return NextResponse.json({ places });
}
