// Bengaluru-centric geo helpers (no external deps)

export const CITY_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bengaluru

export const AREAS = [
  { name: "MG Road", lat: 12.9756, lng: 77.6068 },
  { name: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { name: "Indiranagar", lat: 12.9719, lng: 77.6412 },
  { name: "Jayanagar", lat: 12.925, lng: 77.5938 },
  { name: "Whitefield", lat: 12.9698, lng: 77.7499 },
  { name: "HSR Layout", lat: 12.9116, lng: 77.6473 },
  { name: "Malleshwaram", lat: 13.0035, lng: 77.5709 },
  { name: "BTM Layout", lat: 12.9166, lng: 77.6101 },
  { name: "Electronic City", lat: 12.8452, lng: 77.6602 },
  { name: "Hebbal", lat: 13.0359, lng: 77.597 },
];

const R = 6371000; // earth radius m

export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest known area for a coordinate. */
export function nearestArea(p: { lat: number; lng: number }) {
  let best = AREAS[0];
  let bestD = Infinity;
  for (const a of AREAS) {
    const d = haversine(p, a);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

/** Small random jitter around an anchor (for seeding / geocode fallback). */
export function jitter(anchor: { lat: number; lng: number }, meters = 400) {
  const dLat = (Math.random() - 0.5) * (meters / 111000) * 2;
  const dLng =
    (Math.random() - 0.5) *
    (meters / (111000 * Math.cos((anchor.lat * Math.PI) / 180))) *
    2;
  return { lat: anchor.lat + dLat, lng: anchor.lng + dLng };
}
