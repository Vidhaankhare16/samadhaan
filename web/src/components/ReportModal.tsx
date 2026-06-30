"use client";

import { useRef, useState } from "react";
import Modal from "./Modal";
import { AREAS } from "@/lib/geo";
import type { Report } from "@/lib/types";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function ReportModal({
  onClose,
  onFiled,
  offset = { dLat: 0, dLng: 0 },
}: {
  onClose: () => void;
  onFiled: (r: Report) => void;
  offset?: { dLat: number; dLng: number };
}) {
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState<string>();
  const [area, setArea] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Report | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setImageUrl(await fileToDataUrl(f));
  }
  function locate() {
    // store in the synthetic city's coordinate space; the map re-applies the
    // same offset on display, so the pin lands exactly where the user stands.
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude - offset.dLat, lng: p.coords.longitude - offset.dLng }),
      () => {},
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }
  async function submit() {
    if (!note.trim() && !imageUrl) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: imageUrl ? "photo" : "chat",
          note: note.trim(),
          imageUrl,
          area: area || undefined,
          lat: coords?.lat,
          lng: coords?.lng,
        }),
      });
      const { report } = (await res.json()) as { report: Report };
      setDone(report);
      onFiled(report);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal eyebrow="Report an issue" title="What's the problem?" onClose={onClose}>
      {done ? (
        <div className="rise text-center py-3">
          <div className="text-4xl">✅</div>
          <h3 className="serif text-2xl mt-2">Filed · {done.shortId}</h3>
          <p className="text-sm text-ink-soft mt-2 leading-relaxed">
            It&apos;s on the map. The agents are diagnosing it and filing it with the right
            department right now — no forms, no follow-ups from you.
          </p>
          <button onClick={onClose} className="btn-primary mt-4 w-full">
            Watch it on the map
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            autoFocus
            placeholder="e.g. Big pothole near the Koramangala signal, dangerous for bikes…"
            className="w-full resize-none rounded-lg border border-line bg-paper-2 px-3 py-2.5 text-sm outline-none focus:border-saffron"
          />
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-lg border border-line bg-paper-2 px-3 py-2.5 text-sm hover:border-saffron transition-colors"
            >
              📷 {imageUrl ? "Change photo" : "Add photo"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickFile} />
            <button
              onClick={locate}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                coords ? "border-verify text-verify" : "border-line bg-paper-2 hover:border-saffron"
              }`}
            >
              📍 {coords ? "Located" : "Use my location"}
            </button>
          </div>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-full h-40 object-cover rounded-lg border border-line" />
          )}
          {!coords && (
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper-2 px-3 py-2.5 text-sm outline-none focus:border-saffron"
            >
              <option value="">Pick an area (optional)</option>
              {AREAS.map((a) => (
                <option key={a.name} value={a.name}>{a.name}</option>
              ))}
            </select>
          )}
          <button onClick={submit} disabled={busy || (!note.trim() && !imageUrl)} className="btn-saffron w-full">
            {busy ? "Filing…" : "File it — agents take over"}
          </button>
        </div>
      )}
    </Modal>
  );
}
