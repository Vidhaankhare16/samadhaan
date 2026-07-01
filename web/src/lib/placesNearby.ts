// Real nearby-place search via Google Places API (New). Server-side only.
// Returns genuine places around the user's location — never a fixed city.

import { haversine } from "./geo";
import type { NeedTag, Place } from "./places";

const KEY = process.env.PLACES_API_KEY ?? process.env.NEXT_PUBLIC_MAPS_API_KEY ?? "";
const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

export const placesReady = () => Boolean(KEY);

// Need profile → Google place types to search for (Places API "Table A" types).
const TYPES_FOR: Record<NeedTag, string[]> = {
  wheelchair: ["subway_station", "train_station", "transit_station", "shopping_mall", "park", "pharmacy"],
  low_vision: ["subway_station", "train_station", "transit_station", "park"],
  senior_friendly: ["park", "pharmacy", "hospital", "place_of_worship", "shopping_mall"],
  stroller: ["park", "shopping_mall", "cafe", "restaurant"],
  pet_friendly: ["park", "cafe", "restaurant"],
  cyclist: ["park", "bicycle_store"],
};

const DEFAULT_TYPES = ["subway_station", "transit_station", "park", "cafe", "shopping_mall"];

interface PlacesResult {
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryType?: string;
  types?: string[];
  rating?: number;
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleParking?: boolean;
    wheelchairAccessibleRestroom?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };
  allowsDogs?: boolean;
}

const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// short locality from a formatted address, e.g. "12 Main St, Brooklyn, NY" → "Brooklyn"
function localityOf(addr?: string): string {
  if (!addr) return "Nearby";
  const parts = addr.split(",").map((p) => p.trim());
  return parts.length >= 3 ? parts[parts.length - 3] : parts[0] ?? "Nearby";
}

function accessibilityNote(r: PlacesResult, tags: NeedTag[]): string {
  const bits: string[] = [];
  const a = r.accessibilityOptions;
  if (a?.wheelchairAccessibleEntrance) bits.push("step-free entrance");
  if (a?.wheelchairAccessibleRestroom) bits.push("accessible restroom");
  if (a?.wheelchairAccessibleParking) bits.push("accessible parking");
  if (tags.includes("pet_friendly") && r.allowsDogs) bits.push("dog-friendly");
  if (typeof r.rating === "number") bits.push(`rated ${r.rating.toFixed(1)}★`);
  if (!bits.length) return "Nearby option that fits your needs.";
  return titleCase(bits[0]) + (bits.length > 1 ? ", " + bits.slice(1).join(", ") + "." : ".");
}

// how well a result matches the selected needs (higher = better), for ranking
function matchScore(r: PlacesResult, tags: NeedTag[]): number {
  let s = 0;
  const a = r.accessibilityOptions;
  const wantsAccess = tags.some((t) => ["wheelchair", "senior_friendly", "low_vision", "stroller"].includes(t));
  if (wantsAccess && a?.wheelchairAccessibleEntrance) s += 3;
  if (wantsAccess && (a?.wheelchairAccessibleRestroom || a?.wheelchairAccessibleParking)) s += 1;
  if (tags.includes("pet_friendly") && r.allowsDogs) s += 3;
  if (typeof r.rating === "number") s += Math.min(1, r.rating / 5);
  return s;
}

export interface NearbyPlace extends Place {
  distanceM: number;
}

/** Search real places near the user, ranked by need-match then proximity. */
export async function searchNearby(
  user: { lat: number; lng: number },
  tags: NeedTag[],
  radiusM = 6000,
): Promise<NearbyPlace[]> {
  if (!KEY) return [];
  const typeSet = new Set<string>();
  if (tags.length) tags.forEach((t) => TYPES_FOR[t]?.forEach((x) => typeSet.add(x)));
  else DEFAULT_TYPES.forEach((x) => typeSet.add(x));

  const body = {
    includedTypes: [...typeSet],
    maxResultCount: 20,
    rankPreference: "DISTANCE",
    locationRestriction: {
      circle: { center: { latitude: user.lat, longitude: user.lng }, radius: radiusM },
    },
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types,places.rating,places.accessibilityOptions,places.allowsDogs",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Places ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as { places?: (PlacesResult & { id?: string })[] };
  const raw = data.places ?? [];

  const mapped: NearbyPlace[] = raw
    .filter((r) => r.location)
    .map((r, i) => {
      const lat = r.location!.latitude;
      const lng = r.location!.longitude;
      // infer the tags this place satisfies (best-effort)
      const placeTags: NeedTag[] = [];
      if (r.accessibilityOptions?.wheelchairAccessibleEntrance) placeTags.push("wheelchair");
      if (r.allowsDogs) placeTags.push("pet_friendly");
      return {
        id: r.id ?? `pl-${i}-${lat.toFixed(4)}`,
        name: r.displayName?.text ?? titleCase(r.primaryType ?? "Place"),
        kind: titleCase(r.primaryType ?? r.types?.[0] ?? "Place"),
        area: localityOf(r.formattedAddress),
        lat,
        lng,
        tags: placeTags,
        note: accessibilityNote(r, tags),
        distanceM: Math.round(haversine(user, { lat, lng })),
      } satisfies NearbyPlace;
    });

  // rank: need-match desc, then distance asc; keep the closest/best dozen
  mapped.sort((a, b) => {
    const ra = raw.find((x) => (x.id ?? "") === a.id);
    const rb = raw.find((x) => (x.id ?? "") === b.id);
    const sd = matchScore(rb ?? {}, tags) - matchScore(ra ?? {}, tags);
    if (sd !== 0) return sd;
    return a.distanceM - b.distanceM;
  });

  return mapped.slice(0, 12);
}
