"use client";

import { useState } from "react";
import Modal from "./Modal";
import { NEED_PROFILES, type NeedTag, type Place } from "@/lib/places";

export interface Reco {
  place: Place;
  reason: string;
  distanceM?: number;
}

function km(m?: number) {
  if (m == null) return null;
  return m < 950 ? `${m} m away` : `${(m / 1000).toFixed(1)} km away`;
}

export default function NeedsModal({
  onClose,
  onShowOnMap,
  onRoute,
  userLoc,
}: {
  onClose: () => void;
  onShowOnMap: (places: Place[]) => void;
  onRoute: (place: Place) => void;
  userLoc?: { lat: number; lng: number } | null;
}) {
  const [tags, setTags] = useState<NeedTag[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [recos, setRecos] = useState<Reco[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(t: NeedTag) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function find() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags, note: note.trim(), lat: userLoc?.lat, lng: userLoc?.lng }),
      });
      const data = (await res.json()) as { places: Reco[]; needLocation?: boolean; error?: string };
      if (data.needLocation) {
        setMsg("Please allow location access so we can find places right next to you.");
        return;
      }
      if (data.error || !data.places?.length) {
        setMsg(data.error ?? "No matching places found close to you. Try fewer filters.");
        return;
      }
      setRecos(data.places);
      onShowOnMap(data.places.map((p) => p.place));
    } catch {
      setMsg("Something went wrong finding places. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal eyebrow="Made for you" title="Tell us your needs" onClose={onClose} wide>
      {!recos ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft leading-relaxed">
            Pick what applies. We&apos;ll find <strong>real places near you</strong> that genuinely
            work for you — accessible transit, pet-friendly cafes, and more — then map a route
            straight to them.
          </p>
          <div className="flex flex-wrap gap-2">
            {NEED_PROFILES.map((p) => {
              const on = tags.includes(p.tag);
              return (
                <button
                  key={p.tag}
                  onClick={() => toggle(p.tag)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    on ? "bg-civic-blue text-white border-civic-blue" : "border-line bg-paper-2 hover:border-civic-blue"
                  }`}
                >
                  {p.emoji} {p.label}
                </button>
              );
            })}
          </div>
          <div>
            <div className="eyebrow mb-1">Anything else? (optional)</div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. I use a wheelchair and I'm travelling with my dog"
              className="w-full rounded-lg border border-line bg-paper-2 px-3 py-2.5 text-sm outline-none focus:border-civic-blue"
            />
          </div>
          {msg && (
            <div className="text-[12.5px] text-urgent bg-urgent/10 border border-urgent/30 rounded-lg px-3 py-2">
              {msg}
            </div>
          )}
          <button onClick={find} disabled={busy} className="btn-primary w-full">
            {busy ? "Finding places near you…" : "Find places near me"}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-ink-soft">{recos.length} real places near you, nearest first.</div>
            <button onClick={() => { setRecos(null); setMsg(null); }} className="text-[12px] mono text-civic-blue hover:underline">
              ↺ change needs
            </button>
          </div>
          {recos.map(({ place, reason, distanceM }) => (
            <div key={place.id} className="card p-3 rise">
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] px-1.5 py-0.5 rounded-sm bg-civic-blue/10 text-civic-blue">
                  {place.kind}
                </span>
                <span className="text-[12px] text-ink-soft truncate">{place.area}</span>
                {km(distanceM) && (
                  <span className="ml-auto shrink-0 mono text-[11px] text-civic-blue">📍 {km(distanceM)}</span>
                )}
              </div>
              <div className="font-semibold text-[14px] mt-1">{place.name}</div>
              <div className="text-[12.5px] text-ink-soft leading-snug mt-0.5">{reason}</div>
              <button
                onClick={() => onRoute(place)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-civic-blue text-white px-3 py-1.5 text-[12.5px] font-medium hover:brightness-110 transition"
              >
                🧭 Take me there
              </button>
            </div>
          ))}
          <button onClick={onClose} className="btn-primary w-full mt-1">
            Show them on the map
          </button>
        </div>
      )}
    </Modal>
  );
}
