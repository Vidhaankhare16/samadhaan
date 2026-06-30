"use client";

import { useMemo } from "react";
import { AREAS } from "@/lib/geo";
import { CATEGORY_META, SEVERITY_META, type Report } from "@/lib/types";

// Schematic "civic paper" map used when Google Maps can't authorize.
// Projects lat/lng over the Bengaluru area bounds onto a styled canvas.

const PAD = 0.03;

function bounds() {
  const lats = AREAS.map((a) => a.lat);
  const lngs = AREAS.map((a) => a.lng);
  return {
    minLat: Math.min(...lats) - PAD,
    maxLat: Math.max(...lats) + PAD,
    minLng: Math.min(...lngs) - PAD,
    maxLng: Math.max(...lngs) + PAD,
  };
}

export default function FallbackMap({
  reports,
  selectedId,
  onSelect,
}: {
  reports: Report[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const b = useMemo(bounds, []);
  const project = (lat: number, lng: number) => ({
    left: `${((lng - b.minLng) / (b.maxLng - b.minLng)) * 100}%`,
    top: `${(1 - (lat - b.minLat) / (b.maxLat - b.minLat)) * 100}%`,
  });

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "#efe7d7" }}>
      {/* faint road grid */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.5 }}>
        <defs>
          <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M64 0H0V64" fill="none" stroke="#e0d4bd" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <line x1="0" y1="38%" x2="100%" y2="46%" stroke="#e3cba6" strokeWidth="6" strokeLinecap="round" />
        <line x1="22%" y1="0" x2="30%" y2="100%" stroke="#e3cba6" strokeWidth="6" strokeLinecap="round" />
        <line x1="70%" y1="0" x2="62%" y2="100%" stroke="#e3cba6" strokeWidth="5" strokeLinecap="round" />
      </svg>

      {/* area labels */}
      {AREAS.map((a) => {
        const p = project(a.lat, a.lng);
        return (
          <div
            key={a.name}
            className="absolute -translate-x-1/2 -translate-y-1/2 mono text-[10px] text-ink-soft/70 pointer-events-none select-none"
            style={p}
          >
            ◦ {a.name}
          </div>
        );
      })}

      {/* pins */}
      {reports.map((r) => {
        const p = project(r.lat, r.lng);
        const resolved = r.status === "resolved";
        const color = resolved
          ? "#2f7d57"
          : r.status === "escalated"
            ? "#b23a2e"
            : SEVERITY_META[r.severity].color;
        const isSel = r.id === selectedId;
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className="absolute -translate-x-1/2 -translate-y-full rise"
            style={{ ...p, zIndex: isSel ? 50 : 10 }}
            title={r.title}
          >
            <span
              className="grid place-items-center rounded-full border-2 shadow-md transition-transform hover:scale-110"
              style={{
                width: isSel ? 38 : 32,
                height: isSel ? 38 : 32,
                background: "#faf5eb",
                borderColor: color,
                fontSize: isSel ? 18 : 15,
                boxShadow: isSel ? `0 0 0 4px ${color}33` : undefined,
              }}
            >
              {resolved ? "✓" : CATEGORY_META[r.category].emoji}
            </span>
          </button>
        );
      })}

      <div className="absolute top-16 left-3 mono text-[10px] text-ink-soft/70 pointer-events-none">
        schematic view · live map key pending
      </div>
    </div>
  );
}
