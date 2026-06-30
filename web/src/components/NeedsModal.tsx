"use client";

import { useState } from "react";
import Modal from "./Modal";
import { NEED_PROFILES, type NeedTag, type Place } from "@/lib/places";

export interface Reco {
  place: Place;
  reason: string;
}

export default function NeedsModal({
  onClose,
  onShowOnMap,
}: {
  onClose: () => void;
  onShowOnMap: (places: Place[]) => void;
}) {
  const [tags, setTags] = useState<NeedTag[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [recos, setRecos] = useState<Reco[] | null>(null);

  function toggle(t: NeedTag) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function find() {
    setBusy(true);
    try {
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags, note: note.trim() }),
      });
      const { places } = (await res.json()) as { places: Reco[] };
      setRecos(places);
      onShowOnMap(places.map((p) => p.place));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal eyebrow="Made for you" title="Tell us your needs" onClose={onClose} wide>
      {!recos ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft leading-relaxed">
            Pick what applies. We&apos;ll find places nearby that genuinely work for you — accessible
            metro stations, pet-friendly cafes, and more.
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
          <button onClick={find} disabled={busy} className="btn-primary w-full">
            {busy ? "Finding places for you…" : "Find places for me"}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-ink-soft">{recos.length} places mapped for you.</div>
            <button onClick={() => setRecos(null)} className="text-[12px] mono text-civic-blue hover:underline">
              ↺ change needs
            </button>
          </div>
          {recos.map(({ place, reason }) => (
            <div key={place.id} className="card p-3 rise">
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] px-1.5 py-0.5 rounded-sm bg-civic-blue/10 text-civic-blue">
                  {place.kind}
                </span>
                <span className="text-[12px] text-ink-soft">{place.area}</span>
              </div>
              <div className="font-semibold text-[14px] mt-1">{place.name}</div>
              <div className="text-[12.5px] text-ink-soft leading-snug mt-0.5">{reason}</div>
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
