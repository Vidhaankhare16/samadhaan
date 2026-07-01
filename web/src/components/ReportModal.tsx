"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { AREAS } from "@/lib/geo";
import { CATEGORY_META, SEVERITY_META, type IssueCategory, type Report, type Severity } from "@/lib/types";

interface Classification {
  relevant: boolean;
  category: IssueCategory;
  severity: Severity;
  title: string;
  description: string;
  confidence: number;
  reason: string;
}

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
  const [classifying, setClassifying] = useState(false);
  const [cls, setCls] = useState<Classification | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function locate() {
    // store in the synthetic city's coordinate space; the map re-applies the
    // same offset on display, so the pin lands exactly where the user stands.
    navigator.geolocation?.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude - offset.dLat, lng: p.coords.longitude - offset.dLng }),
      () => {},
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }

  // geotag to the citizen's position as soon as the form opens, so the report
  // is pinned to where they're standing without an extra tap.
  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = await fileToDataUrl(f);
    setImageUrl(url);
    setCls(null);
    // geotag the photo to where the citizen is standing
    if (!coords) locate();
    // hand the photo to Gemini Vision for classification + rejection
    setClassifying(true);
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url, note: note.trim() }),
      });
      const { classification } = (await res.json()) as { classification: Classification };
      setCls(classification);
      // pre-fill the note from the AI description if the citizen left it blank
      if (classification.relevant && !note.trim() && classification.description) {
        setNote(classification.description);
      }
    } catch {
      setCls(null);
    } finally {
      setClassifying(false);
    }
  }

  function retakePhoto() {
    setImageUrl(undefined);
    setCls(null);
    fileRef.current?.click();
  }

  const rejected = cls != null && !cls.relevant;
  const canSubmit = !busy && !classifying && (note.trim().length > 0 || (imageUrl != null && !rejected));

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const usable = cls?.relevant ? cls : null;
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: imageUrl ? "photo" : "chat",
          note: note.trim(),
          title: usable?.title,
          imageUrl,
          area: area || undefined,
          lat: coords?.lat,
          lng: coords?.lng,
          category: usable?.category,
          severity: usable?.severity,
          confidence: usable?.confidence,
        }),
      });
      const { report } = (await res.json()) as { report: Report };
      setDone(report);
      onFiled(report);
    } finally {
      setBusy(false);
    }
  }

  // department shown on the success screen (known when classified at upload)
  const dept = done
    ? CATEGORY_META[done.category]?.department
    : cls?.relevant
      ? CATEGORY_META[cls.category]?.department
      : null;

  return (
    <Modal eyebrow="Report an issue" title="What's the problem?" onClose={onClose}>
      {done ? (
        <div className="rise text-center py-3">
          <div className="text-4xl">✅</div>
          <h3 className="serif text-2xl mt-2">Filed · {done.shortId}</h3>
          {dept ? (
            <div className="mt-3 card p-3 text-left rise">
              <div className="eyebrow text-verify">Reported to authority</div>
              <div className="text-sm font-semibold mt-1 flex items-center gap-2">
                <span className="text-lg">{CATEGORY_META[done.category].emoji}</span>
                {dept.name}
              </div>
              <p className="text-[12px] text-ink-soft mt-1 leading-relaxed">
                A formal complaint has been routed automatically with a{" "}
                <strong>{dept.slaHours}-hour</strong> response standard. You&apos;ll be notified if
                it&apos;s escalated — no forms, no follow-ups from you.
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-soft mt-2 leading-relaxed">
              It&apos;s on the map. The agents are diagnosing it and filing it with the right
              department right now.
            </p>
          )}
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

          {coords && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-verify">
              <span>📍</span> Pinned to your location — you&apos;ll land right on it after filing.
            </div>
          )}

          {imageUrl && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="w-full h-40 object-cover rounded-lg border border-line" />
              {classifying && (
                <div className="absolute inset-0 rounded-lg bg-ink/55 backdrop-blur-[2px] grid place-items-center text-paper-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="live-dot text-saffron">●</span> Gemini is analyzing the photo…
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI classification result */}
          {cls && !classifying && (
            cls.relevant ? (
              <div className="card p-3 rise border-verify/60">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_META[cls.category].emoji}</span>
                  <span className="text-[13px] font-semibold">{CATEGORY_META[cls.category].label}</span>
                  <span
                    className="ml-auto text-[10px] mono px-1.5 py-0.5 rounded-sm"
                    style={{ color: SEVERITY_META[cls.severity].color, background: SEVERITY_META[cls.severity].color + "1a" }}
                  >
                    {SEVERITY_META[cls.severity].label}
                  </span>
                </div>
                <div className="text-[12.5px] text-ink-soft leading-snug mt-1.5">{cls.reason}</div>
                <div className="eyebrow text-[9px] mt-2 text-verify">
                  ✓ Identified by Gemini Vision · {Math.round(cls.confidence * 100)}% · routes to{" "}
                  {CATEGORY_META[cls.category].department.name}
                </div>
              </div>
            ) : (
              <div className="card p-3 rise border-urgent/60">
                <div className="flex items-center gap-2 text-urgent">
                  <span className="text-lg">⚠️</span>
                  <span className="text-[13px] font-semibold">This doesn&apos;t look like a civic issue</span>
                </div>
                <p className="text-[12.5px] text-ink-soft leading-snug mt-1">{cls.reason}</p>
                <button onClick={retakePhoto} className="mt-2 text-[12px] mono text-saffron hover:underline">
                  ↻ Take another photo
                </button>
              </div>
            )
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
          <button onClick={submit} disabled={!canSubmit} className="btn-saffron w-full">
            {busy ? "Filing…" : classifying ? "Analyzing photo…" : "File it — agents take over"}
          </button>
        </div>
      )}
    </Modal>
  );
}
