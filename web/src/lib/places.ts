// Curated, real-world inclusive places across Bengaluru for the "My Needs"
// recommendation feature. Tags drive matching; Gemini personalizes the copy.

export type NeedTag =
  | "wheelchair"
  | "pet_friendly"
  | "stroller"
  | "low_vision"
  | "senior_friendly"
  | "cyclist";

export interface Place {
  id: string;
  name: string;
  kind: string; // "Metro station", "Cafe", "Park"…
  area: string;
  lat: number;
  lng: number;
  tags: NeedTag[];
  note: string; // factual accessibility note
}

export const NEED_PROFILES: { tag: NeedTag; label: string; emoji: string; blurb: string }[] = [
  { tag: "wheelchair", label: "Wheelchair user", emoji: "♿", blurb: "step-free, ramps & lifts" },
  { tag: "pet_friendly", label: "Pet owner", emoji: "🐾", blurb: "pets welcome" },
  { tag: "stroller", label: "Parent / stroller", emoji: "🍼", blurb: "stroller-friendly, baby care" },
  { tag: "low_vision", label: "Low vision", emoji: "🦯", blurb: "tactile paths, audio cues" },
  { tag: "senior_friendly", label: "Senior", emoji: "🧓", blurb: "seating, gentle access" },
  { tag: "cyclist", label: "Cyclist", emoji: "🚲", blurb: "cycle parking & lanes" },
];

export const PLACES: Place[] = [
  { id: "p1", name: "MG Road Metro Station", kind: "Namma Metro", area: "MG Road", lat: 12.9759, lng: 77.6066, tags: ["wheelchair", "low_vision", "senior_friendly"], note: "Lifts to all platforms, tactile flooring, accessible restroom." },
  { id: "p2", name: "Cubbon Park Metro Station", kind: "Namma Metro", area: "MG Road", lat: 12.9763, lng: 77.5957, tags: ["wheelchair", "stroller", "low_vision"], note: "Step-free entry, lifts, wide gates for strollers and wheelchairs." },
  { id: "p3", name: "Indiranagar Metro Station", kind: "Namma Metro", area: "Indiranagar", lat: 12.9784, lng: 77.6386, tags: ["wheelchair", "senior_friendly"], note: "Lift access and reserved seating near platform." },
  { id: "p4", name: "Third Wave Coffee, Indiranagar", kind: "Cafe", area: "Indiranagar", lat: 12.9719, lng: 77.6412, tags: ["pet_friendly", "wheelchair"], note: "Outdoor pet-friendly seating, ground-floor step-free entry." },
  { id: "p5", name: "The Pet Cafe, Koramangala", kind: "Cafe", area: "Koramangala", lat: 12.9352, lng: 77.6245, tags: ["pet_friendly", "stroller"], note: "Dedicated pet area, water bowls, high chairs available." },
  { id: "p6", name: "Cubbon Park", kind: "Park", area: "MG Road", lat: 12.9698, lng: 77.5928, tags: ["pet_friendly", "stroller", "senior_friendly", "cyclist"], note: "Paved walking loops, pet-friendly, cycling on car-free days." },
  { id: "p7", name: "Lalbagh Botanical Garden", kind: "Park", area: "Jayanagar", lat: 12.9507, lng: 77.5848, tags: ["wheelchair", "senior_friendly", "stroller"], note: "Paved main paths, wheelchair loan at gate, benches throughout." },
  { id: "p8", name: "Jayanagar Metro Station", kind: "Namma Metro", area: "Jayanagar", lat: 12.9301, lng: 77.5838, tags: ["wheelchair", "low_vision"], note: "Lifts, tactile guide paths to platform." },
  { id: "p9", name: "Dialog in the Dark", kind: "Experience", area: "HSR Layout", lat: 12.9121, lng: 77.6446, tags: ["low_vision"], note: "Run by visually-impaired guides; designed for non-visual navigation." },
  { id: "p10", name: "Toit Brewpub Patio", kind: "Cafe", area: "Indiranagar", lat: 12.9785, lng: 77.6408, tags: ["pet_friendly"], note: "Pet-friendly patio seating." },
  { id: "p11", name: "HSR BDA Complex Ramp", kind: "Civic", area: "HSR Layout", lat: 12.9116, lng: 77.6413, tags: ["wheelchair", "senior_friendly"], note: "Ramped entry, accessible counters." },
  { id: "p12", name: "Whitefield Metro Station", kind: "Namma Metro", area: "Whitefield", lat: 12.9966, lng: 77.7472, tags: ["wheelchair", "stroller"], note: "Step-free, lifts, wide gates." },
  { id: "p13", name: "Cycle lane — Outer Ring Road", kind: "Cycle Lane", area: "HSR Layout", lat: 12.9101, lng: 77.6481, tags: ["cyclist"], note: "Segregated cycle track stretch with parking stands." },
  { id: "p14", name: "Smoor, Lavelle Road", kind: "Cafe", area: "MG Road", lat: 12.9712, lng: 77.5993, tags: ["wheelchair", "stroller", "senior_friendly"], note: "Level entry, spacious seating, baby-changing." },
  { id: "p15", name: "Malleshwaram Metro Station", kind: "Namma Metro", area: "Malleshwaram", lat: 13.0033, lng: 77.5703, tags: ["wheelchair", "senior_friendly", "low_vision"], note: "Lifts, tactile paths, reserved seating." },
  { id: "p16", name: "Cafe Noir, Whitefield", kind: "Cafe", area: "Whitefield", lat: 12.9706, lng: 77.7505, tags: ["pet_friendly", "cyclist"], note: "Pet-friendly garden, cycle parking out front." },
];

export function matchPlaces(tags: NeedTag[]): Place[] {
  if (!tags.length) return PLACES;
  return PLACES.filter((p) => p.tags.some((t) => tags.includes(t)));
}
