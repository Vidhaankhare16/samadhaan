"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { AREAS } from "@/lib/geo";
import type { Report } from "@/lib/types";

const SAMPLES = [
  "There's a huge pothole near the Koramangala 80 feet road signal, dangerous for bikes",
  "Water pipe has burst near MG Road, the whole footpath is flooded",
  "Street lights are not working on 12th main in Indiranagar, it's very dark",
  "Garbage is overflowing near the BTM Layout bus stop",
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

export default function SpeakModal({
  onClose,
  onFiled,
}: {
  onClose: () => void;
  onFiled: (r: Report) => void;
}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Report | null>(null);
  const recRef = useRef<{ stop(): void } | null>(null);
  const finalRef = useRef("");

  const supported =
    typeof window !== "undefined" && (window.webkitSpeechRecognition || window.SpeechRecognition);

  async function file(text: string) {
    setBusy(true);
    try {
      const r = await fileVoice(text);
      setDone(r);
      onFiled(r);
    } finally {
      setBusy(false);
      setListening(false);
    }
  }

  function start() {
    const Ctor = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    finalRef.current = "";
    setTranscript("");
    setListening(true);
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t;
        else interim += t;
      }
      setTranscript(finalRef.current + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      const text = finalRef.current.trim();
      if (text.length >= 4) file(text);
    };
    rec.start();
  }

  useEffect(() => () => recRef.current?.stop(), []);

  return (
    <Modal eyebrow="Talk to the civic agent" title="Tell us what you see" onClose={onClose}>
      {done ? (
        <div className="rise text-center py-3">
          <div className="text-4xl">✅</div>
          <h3 className="serif text-2xl mt-2">Filed · {done.shortId}</h3>
          <p className="text-sm text-ink-soft mt-2">
            “{transcript}” — pinned in {done.area}. The agents are handling it now.
          </p>
          <button onClick={onClose} className="btn-primary mt-4 w-full">See it on the map</button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm text-ink-soft leading-relaxed">
            Press the mic and say the problem and where it is — like calling a helpline. No typing,
            no forms.
          </p>

          {supported ? (
            <button
              onClick={listening ? () => recRef.current?.stop() : start}
              disabled={busy}
              className="mx-auto my-5 grid place-items-center w-24 h-24 rounded-full text-3xl transition-transform active:scale-95"
              style={{
                background: listening ? "#b23a2e" : "#d2602e",
                color: "#fff",
                boxShadow: listening ? "0 0 0 10px #b23a2e22" : "0 6px 18px #d2602e44",
              }}
            >
              <span className={listening ? "live-dot" : ""}>🎙️</span>
            </button>
          ) : (
            <div className="my-5 text-[13px] text-ink-soft">
              Voice needs Chrome/Edge. Try a simulated call below.
            </div>
          )}

          <div className="min-h-[2.5rem] text-[15px] text-ink italic px-2">
            {busy ? "Filing your report…" : listening ? transcript || "Listening…" : transcript || " "}
          </div>

          <button
            onClick={() => file(SAMPLES[Math.floor(Math.random() * SAMPLES.length)])}
            disabled={busy || listening}
            className="btn-primary w-full mt-3"
          >
            ▶ Simulate a phone call instead
          </button>
        </div>
      )}
    </Modal>
  );
}
