"use client";

import { useRef, useState } from "react";
import { AREAS } from "@/lib/geo";
import type { Report } from "@/lib/types";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ReportForm({ onFiled }: { onFiled: (r: Report) => void }) {
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [area, setArea] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Report | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setImageUrl(await fileToDataUrl(f));
  }

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCoords(null),
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

  function reset() {
    setDone(null);
    setNote("");
    setImageUrl(undefined);
    setArea("");
    setCoords(null);
  }

  if (done) {
    return (
      <div className="p-5 rise">
        <div className="eyebrow text-verify">Report filed</div>
        <h3 className="serif text-2xl mt-1">Tracking {done.shortId}</h3>
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
          Your report is on the map. The autonomous agents are now diagnosing, de-duplicating, and
          filing it with the right department — watch the Agent Desk to the right.
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={reset} className="btn-primary">
            Report another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <div className="eyebrow">What did you see?</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Big pothole near the Koramangala signal, dangerous for bikes…"
          className="mt-1.5 w-full resize-none rounded-sm border border-line bg-paper-2 px-3 py-2 text-sm outline-none focus:border-saffron"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 rounded-sm border border-line bg-paper-2 px-3 py-2 text-sm hover:border-saffron transition-colors flex items-center justify-center gap-2"
        >
          📷 {imageUrl ? "Change photo" : "Add photo"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickFile} />
        <button
          onClick={useMyLocation}
          className={`flex-1 rounded-sm border px-3 py-2 text-sm transition-colors flex items-center justify-center gap-2 ${
            coords ? "border-verify text-verify bg-verify/5" : "border-line bg-paper-2 hover:border-saffron"
          }`}
        >
          📍 {coords ? "Located" : "Use my location"}
        </button>
      </div>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="report" className="w-full h-36 object-cover rounded-sm border border-line" />
      )}

      {!coords && (
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="w-full rounded-sm border border-line bg-paper-2 px-3 py-2 text-sm outline-none focus:border-saffron"
        >
          <option value="">Pick an area (optional)</option>
          {AREAS.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      <button onClick={submit} disabled={busy || (!note.trim() && !imageUrl)} className="btn-primary w-full">
        {busy ? "Filing…" : "File report — agents take over"}
      </button>
      <p className="text-[11px] text-ink-soft text-center">
        No forms, no department-hunting. The AI agents do the bureaucracy.
      </p>
    </div>
  );
}
