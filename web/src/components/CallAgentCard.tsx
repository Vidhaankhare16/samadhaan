"use client";

import { useRef, useState } from "react";
import type { Report } from "@/lib/types";
import { AREAS } from "@/lib/geo";

const NUMBER = process.env.NEXT_PUBLIC_VOICE_NUMBER || "";

const SAMPLES = [
  "There's a huge pothole near the Koramangala 80 feet road signal, it's dangerous for bikes",
  "Water pipe has burst near MG Road, the whole footpath is flooded",
  "Street lights are not working on the 12th main in Indiranagar, it's very dark",
  "Garbage is overflowing near the BTM Layout bus stop, very bad smell",
];

async function fileVoice(note: string): Promise<Report> {
  const area = AREAS.find((a) => note.toLowerCase().includes(a.name.toLowerCase()))?.name;
  const res = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note, area }),
  });
  return (await res.json()).report as Report;
}

export default function CallAgentCard({ onFiled }: { onFiled: (r: Report) => void }) {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Report | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<{ stop(): void } | null>(null);

  const speechSupported =
    typeof window !== "undefined" && (window.webkitSpeechRecognition || window.SpeechRecognition);

  async function simulate() {
    setBusy(true);
    try {
      const r = await fileVoice(SAMPLES[Math.floor(Math.random() * SAMPLES.length)]);
      setLast(r);
      onFiled(r);
    } finally {
      setBusy(false);
    }
  }

  function startListening() {
    const Ctor = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    setTranscript("");
    setListening(true);

    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setTranscript(finalText + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend = async () => {
      setListening(false);
      const text = (finalText || transcript).trim();
      if (text.length < 4) return;
      setBusy(true);
      try {
        const r = await fileVoice(text);
        setLast(r);
        onFiled(r);
      } finally {
        setBusy(false);
      }
    };
    rec.start();
  }

  function stopListening() {
    recRef.current?.stop();
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">📞</span>
        <div className="eyebrow">Talk to the civic agent</div>
      </div>
      <p className="text-[12px] text-ink-soft mt-1.5 leading-relaxed">
        Can&apos;t type or read? Just <b>speak</b>. The voice agent understands your complaint,
        files it, and it appears on the map in seconds.
      </p>

      {speechSupported ? (
        <button
          onClick={listening ? stopListening : startListening}
          disabled={busy}
          className={`w-full mt-3 inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-semibold transition-colors ${
            listening ? "bg-urgent text-white" : "btn-saffron"
          }`}
        >
          <span className={listening ? "live-dot inline-block w-2 h-2 rounded-full bg-white" : ""} />
          {listening ? "Listening… tap to stop" : busy ? "Filing…" : "🎙️ Speak your report"}
        </button>
      ) : (
        <div className="mt-3 rounded-sm border border-dashed border-line bg-paper-2 px-3 py-2 text-[11px] text-ink-soft text-center">
          Voice input works in Chrome. Use the simulated call below.
        </div>
      )}

      {transcript && (
        <div className="mt-2 text-[12px] text-ink bg-paper-2 border border-line rounded-sm px-3 py-2 italic">
          “{transcript}”
        </div>
      )}

      {NUMBER && (
        <a href={`tel:${NUMBER}`} className="block text-center text-[12px] mono text-saffron mt-2 hover:underline">
          or dial {NUMBER} (Dialogflow phone line)
        </a>
      )}

      <button onClick={simulate} disabled={busy || listening} className="btn-primary w-full mt-2">
        {busy ? "Caller speaking…" : "▶ Simulate a phone call"}
      </button>

      {last && (
        <div className="mt-2 text-[12px] text-verify rise">
          ✓ Filed <span className="mono">{last.shortId}</span> in {last.area} — see it on the map.
        </div>
      )}
    </div>
  );
}
