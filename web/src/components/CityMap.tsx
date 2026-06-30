"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/mapsLoader";
import { MAP_OPTIONS } from "@/lib/mapStyle";
import { CITY_CENTER } from "@/lib/geo";
import { CATEGORY_META, SEVERITY_META, type Report } from "@/lib/types";
import FallbackMap from "./FallbackMap";

function pinSvg(report: Report): string {
  const meta = CATEGORY_META[report.category];
  const resolved = report.status === "resolved";
  const color = resolved
    ? "#2f7d57"
    : report.status === "escalated"
      ? "#b23a2e"
      : SEVERITY_META[report.severity].color;
  const emoji = resolved ? "✓" : meta.emoji;
  const svg = `<svg width="42" height="54" viewBox="0 0 44 56" xmlns="http://www.w3.org/2000/svg">
<defs><filter id="s" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-opacity="0.35"/></filter></defs>
<path d="M22 2 C11 2 3 10 3 21 C3 34 22 54 22 54 C22 54 41 34 41 21 C41 10 33 2 22 2 Z" fill="${color}" stroke="#faf5eb" stroke-width="2.2" filter="url(#s)"/>
<circle cx="22" cy="20" r="13" fill="#faf5eb"/>
<text x="22" y="21" font-size="${resolved ? 17 : 15}" font-family="system-ui, sans-serif" font-weight="700" fill="${color}" text-anchor="middle" dominant-baseline="central">${emoji}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function CityMap({
  reports,
  selectedId,
  onSelect,
}: {
  reports: Report[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<Map<string, google.maps.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Google calls this if the key is rejected → degrade to the schematic map.
    window.gm_authFailure = () => setFailed(true);
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !divRef.current || mapRef.current) return;
        mapRef.current = new g.maps.Map(divRef.current, {
          ...MAP_OPTIONS,
          center: CITY_CENTER,
          zoom: 12,
        });
        setReady(true); // trigger marker sync now that the map exists
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // sync markers
  useEffect(() => {
    const map = mapRef.current;
    const g = (typeof window !== "undefined" && window.google) || null;
    if (!map || !g || !ready) return;
    const live = new Set(reports.map((r) => r.id));

    for (const [id, m] of markers.current) {
      if (!live.has(id)) {
        m.setMap(null);
        markers.current.delete(id);
      }
    }

    for (const r of reports) {
      const existing = markers.current.get(r.id);
      const icon: google.maps.Icon = {
        url: pinSvg(r),
        scaledSize: new g.maps.Size(42, 54),
        anchor: new g.maps.Point(21, 52),
      };
      if (existing) {
        existing.setIcon(icon);
        existing.setPosition({ lat: r.lat, lng: r.lng });
        existing.setZIndex(r.id === selectedId ? 999 : undefined);
      } else {
        const marker = new g.maps.Marker({
          position: { lat: r.lat, lng: r.lng },
          map,
          icon,
          title: r.title,
          animation: g.maps.Animation.DROP,
        });
        marker.addListener("click", () => onSelectRef.current(r.id));
        markers.current.set(r.id, marker);
      }
    }
  }, [reports, selectedId, ready]);

  // pan to selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const r = reports.find((x) => x.id === selectedId);
    if (r) {
      map.panTo({ lat: r.lat, lng: r.lng });
      if ((map.getZoom() ?? 12) < 14) map.setZoom(14);
    }
  }, [selectedId, reports]);

  if (failed)
    return <FallbackMap reports={reports} selectedId={selectedId} onSelect={onSelect} />;

  return <div ref={divRef} className="absolute inset-0" />;
}
