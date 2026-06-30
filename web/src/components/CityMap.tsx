"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/mapsLoader";
import { MAP_OPTIONS } from "@/lib/mapStyle";
import { CITY_CENTER } from "@/lib/geo";
import { CATEGORY_META, SEVERITY_META, type Report } from "@/lib/types";
import type { Place } from "@/lib/places";
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

function placeSvg(p: Place): string {
  const emoji = p.tags.includes("pet_friendly") ? "🐾" : p.tags.includes("cyclist") ? "🚲" : "♿";
  const svg = `<svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
<defs><filter id="d" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/></filter></defs>
<rect x="3" y="3" width="28" height="28" rx="8" fill="#1f4f7a" stroke="#faf5eb" stroke-width="2.2" filter="url(#d)"/>
<text x="17" y="18" font-size="14" text-anchor="middle" dominant-baseline="central">${emoji}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function CityMap({
  reports,
  places = [],
  focus = null,
  routeTo = null,
  selectedId,
  onSelect,
}: {
  reports: Report[];
  places?: Place[];
  focus?: { lat: number; lng: number } | null;
  routeTo?: (Place & { _origin?: { lat: number; lng: number } | null }) | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markers = useRef<Map<string, google.maps.Marker>>(new Map());
  const placeMarkers = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarker = useRef<google.maps.Marker | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const routeLine = useRef<google.maps.Polyline | null>(null);
  const didFocus = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    window.gm_authFailure = () => setFailed(true);
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !divRef.current || mapRef.current) return;
        mapRef.current = new g.maps.Map(divRef.current, { ...MAP_OPTIONS, center: CITY_CENTER, zoom: 12 });
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // issue markers
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
        const marker = new g.maps.Marker({ position: { lat: r.lat, lng: r.lng }, map, icon, title: r.title, animation: g.maps.Animation.DROP });
        marker.addListener("click", () => onSelectRef.current(r.id));
        markers.current.set(r.id, marker);
      }
    }
  }, [reports, selectedId, ready]);

  // accessibility place markers (+ fit to them when shown)
  useEffect(() => {
    const map = mapRef.current;
    const g = (typeof window !== "undefined" && window.google) || null;
    if (!map || !g || !ready) return;
    const live = new Set(places.map((p) => p.id));
    for (const [id, m] of placeMarkers.current) {
      if (!live.has(id)) {
        m.setMap(null);
        placeMarkers.current.delete(id);
      }
    }
    for (const p of places) {
      if (placeMarkers.current.has(p.id)) continue;
      const marker = new g.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        icon: { url: placeSvg(p), scaledSize: new g.maps.Size(34, 34), anchor: new g.maps.Point(17, 17) },
        title: `${p.name} — ${p.note}`,
        zIndex: 500,
      });
      placeMarkers.current.set(p.id, marker);
    }
    if (places.length) {
      const b = new g.maps.LatLngBounds();
      places.forEach((p) => b.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(b, 80);
    }
  }, [places, ready]);

  // auto-center on the user's detected location (one-shot) + "you are here"
  useEffect(() => {
    const map = mapRef.current;
    const g = (typeof window !== "undefined" && window.google) || null;
    if (!map || !g || !ready || !focus || didFocus.current) return;
    didFocus.current = true;
    map.panTo(focus);
    map.setZoom(14);
    userMarker.current?.setMap(null);
    userMarker.current = new g.maps.Marker({
      position: focus,
      map,
      icon: { path: g.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#1f4f7a", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
      title: "You are here",
      zIndex: 1000,
    });
  }, [focus, ready]);

  // pan to selected report
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const r = reports.find((x) => x.id === selectedId);
    if (r) {
      map.panTo({ lat: r.lat, lng: r.lng });
      if ((map.getZoom() ?? 12) < 14) map.setZoom(14);
    }
  }, [selectedId, reports]);

  // draw a route to a recommended place ("take me there")
  useEffect(() => {
    const map = mapRef.current;
    const g = (typeof window !== "undefined" && window.google) || null;
    if (!map || !g || !ready) return;

    // clear any previous route
    directionsRenderer.current?.setMap(null);
    directionsRenderer.current = null;
    routeLine.current?.setMap(null);
    routeLine.current = null;
    if (!routeTo) return;

    const dest = { lat: routeTo.lat, lng: routeTo.lng };
    const origin = routeTo._origin ?? focus ?? CITY_CENTER;

    const drawStraightLine = () => {
      routeLine.current = new g.maps.Polyline({
        path: [origin, dest],
        map,
        geodesic: true,
        strokeColor: "#1f4f7a",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        icons: [{ icon: { path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 }, offset: "100%" }],
      });
      const b = new g.maps.LatLngBounds();
      b.extend(origin);
      b.extend(dest);
      map.fitBounds(b, 90);
    };

    try {
      const service = new g.maps.DirectionsService();
      directionsRenderer.current = new g.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: { strokeColor: "#1f4f7a", strokeOpacity: 0.95, strokeWeight: 5 },
      });
      service.route(
        { origin, destination: dest, travelMode: g.maps.TravelMode.DRIVING },
        (result, status) => {
          if (status === "OK" && result && directionsRenderer.current) {
            directionsRenderer.current.setDirections(result);
          } else {
            // synthetic / unroutable coords → fall back to a direct guide line
            directionsRenderer.current?.setMap(null);
            directionsRenderer.current = null;
            drawStraightLine();
          }
        },
      );
    } catch {
      drawStraightLine();
    }
  }, [routeTo, focus, ready]);

  function locate() {
    const map = mapRef.current;
    const g = window.google;
    if (!map || !g) return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.panTo(at);
        map.setZoom(15);
        userMarker.current?.setMap(null);
        userMarker.current = new g.maps.Marker({
          position: at,
          map,
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#1f4f7a", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
          title: "You are here",
          zIndex: 1000,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }

  if (failed) return <FallbackMap reports={reports} selectedId={selectedId} onSelect={onSelect} />;

  return (
    <>
      <div ref={divRef} className="absolute inset-0" />
      <button
        onClick={locate}
        aria-label="Find my location"
        className="absolute bottom-24 right-3 lg:bottom-3 z-10 w-10 h-10 rounded-full bg-card border border-line-strong shadow-md grid place-items-center text-lg hover:bg-paper-2"
      >
        ◎
      </button>
    </>
  );
}
