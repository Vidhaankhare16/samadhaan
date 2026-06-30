"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./mapsLoader";
import { AREAS } from "./geo";
import type { Locale } from "./locale";

function pick(results: google.maps.GeocoderResult[], types: string[]): string | undefined {
  for (const res of results)
    for (const c of res.address_components)
      if (types.some((t) => c.types.includes(t))) return c.long_name;
  return undefined;
}

const cityOf = (r: google.maps.GeocoderResult[]) =>
  pick(r, ["locality", "postal_town"]) ??
  pick(r, ["administrative_area_level_2"]) ??
  pick(r, ["administrative_area_level_1"]);

const hoodOf = (r: google.maps.GeocoderResult[]) =>
  pick(r, ["sublocality_level_1", "sublocality", "neighborhood"]) ?? pick(r, ["locality"]);

/**
 * Reverse-geocode the user's location into a real city + a map of neighborhood
 * names for each synthetic area anchor (shifted to the user's vicinity). Runs
 * once per detected location; degrades gracefully to null on any failure.
 */
export function useLocale(
  userLoc: { lat: number; lng: number } | null,
  offset: { dLat: number; dLng: number },
): Locale | null {
  const [locale, setLocale] = useState<Locale | null>(null);
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!userLoc) return;
    const key = `${userLoc.lat.toFixed(3)},${userLoc.lng.toFixed(3)}`;
    if (ranFor.current === key) return;
    ranFor.current = key;

    let cancelled = false;
    (async () => {
      try {
        const g = await loadGoogleMaps();
        const geocoder = new g.maps.Geocoder();
        const rev = async (loc: { lat: number; lng: number }) => {
          const { results } = await geocoder.geocode({ location: loc });
          return results;
        };

        const me = await rev(userLoc);
        const city = cityOf(me) ?? "your city";
        const country = pick(me, ["country"]);

        // resolve a real neighborhood for each synthetic anchor, sequentially
        // (kind to the geocoding quota), falling back to the user's city.
        const areaMap: Record<string, string> = {};
        for (const a of AREAS) {
          try {
            const res = await rev({ lat: a.lat + offset.dLat, lng: a.lng + offset.dLng });
            areaMap[a.name] = hoodOf(res) ?? city;
          } catch {
            areaMap[a.name] = city;
          }
          if (cancelled) return;
        }

        if (!cancelled) setLocale({ city, country, areaMap });
      } catch {
        if (!cancelled) setLocale(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userLoc, offset]);

  return locale;
}
