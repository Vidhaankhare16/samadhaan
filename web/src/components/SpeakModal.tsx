"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AREAS } from "@/lib/geo";
import type { Report } from "@/lib/types";
import type { GeoOffset } from "@/app/page";

const AGENT_NAME = "Samadhaan Civic Agent";
const GREETING =
  "Namaste! You've reached the Samadhaan civic agent. Please describe the civic issue and the area — for example, a pothole near the main road junction.";

const SAMPLES = [
  "There's a huge pothole near the main road signal, dangerous for two-wheelers",
  "A water pipe has burst near the market, the whole footpath is flooded",
  "Street lights are not working on my street, it's very dark at night",
  "Garbage is overflowing near the bus stop in my area",
];

type Turn = { who: "agent" | "you"; text: string };
type Phase = "dialing" | "connected" | "filing" | "filed";

async function fileVoice(
  note: string,
  coords: { lat: number; lng: number } | null,
): Promise<Report> {
  // an explicitly spoken area name overrides GPS; otherwise pin to the caller
  const area = AREAS.find((a) => note.toLowerCase().includes(a.name.toLowerCase()))?.name;
  const res = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "voice", note, area, lat: coords?.lat, lng: coords?.lng }),
  });
  return (await res.json()).report as Report;
}

function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 1.02;
    synth.speak(u);
  } catch {
    /* TTS is best-effort */
  }
}

function mmss(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function SpeakModal({
  onClose,
  onFiled,
  offset = { dLat: 0, dLng: 0 },
}: {
  onClose: () => void;
  onFiled: (r: Report) => void;
  offset?: GeoOffset;
}) {
  const [phase, setPhase] = useState<Phase>("dialing");
  const [listening, setListening] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partial, setPartial] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [done, setDone] = useState<Report | null>(null);
  const [located, setLocated] = useState(false);

  const recRef = useRef<{ stop(): void } | null>(null);
  const finalRef = useRef("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // caller's position in the synthetic city space (map re-applies the same
  // offset on display, so the pin lands exactly where the caller stands)
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // grab the caller's location the moment the line opens, so whatever issue
  // they describe is geotagged to where they actually are — not a random spot.
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        coordsRef.current = {
          lat: p.coords.latitude - offset.dLat,
          lng: p.coords.longitude - offset.dLng,
        };
        setLocated(true);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supported =
    typeof window !== "undefined" && (window.webkitSpeechRecognition || window.SpeechRecognition);

  const file = useCallback(
    async (text: string) => {
      setPartial("");
      setTurns((t) => [...t, { who: "you", text }]);
      setPhase("filing");
      try {
        const r = await fileVoice(text, coordsRef.current);
        const line = `Thank you. Your ${r.area} report is filed with tracking id ${r.shortId
          .replace("-", " ")
          .split("")
          .join(" ")}. Our civic agents are handling it now. You can watch it live on the map.`;
        setTurns((t) => [...t, { who: "agent", text: line }]);
        speak(`Thank you. Your ${r.area} report is filed with tracking id ${r.shortId}. Our civic agents are handling it now.`);
        setDone(r);
        onFiled(r);
        setPhase("filed");
      } catch {
        setTurns((t) => [
          ...t,
          { who: "agent", text: "Sorry, the line dropped while filing. Please try again." },
        ]);
        setPhase("connected");
      }
    },
    [onFiled],
  );

  const startListening = useCallback(() => {
    const Ctor = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    finalRef.current = "";
    setPartial("");
    setListening(true);
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t;
        else interim += t;
      }
      setPartial(finalRef.current + interim);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      const text = finalRef.current.trim();
      if (text.length >= 4) file(text);
    };
    rec.start();
  }, [file]);

  // "Ring", then the agent picks up and greets.
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("connected");
      setTurns([{ who: "agent", text: GREETING }]);
      speak(GREETING);
      // give the greeting a moment, then open the mic
      if (supported) setTimeout(startListening, 2600);
    }, 1700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // call timer (runs once connected, freezes after filed)
  useEffect(() => {
    if (phase === "dialing" || phase === "filed") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, partial]);

  // cleanup on unmount
  useEffect(
    () => () => {
      recRef.current?.stop();
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* noop */
      }
    },
    [],
  );

  function hangUp() {
    recRef.current?.stop();
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* noop */
    }
    onClose();
  }

  const dialing = phase === "dialing";
  const filing = phase === "filing";

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch sm:items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-md" style={{ background: "#0b1f18cc" }} />

      <div
        className="relative w-full sm:max-w-md sm:rounded-3xl overflow-hidden flex flex-col text-white shadow-2xl"
        style={{
          background: "linear-gradient(165deg,#173a2f 0%,#0f2a22 55%,#0b201a 100%)",
          maxHeight: "100dvh",
        }}
      >
        {/* status bar */}
        <div className="px-6 pt-7 text-center shrink-0">
          <div className="eyebrow" style={{ color: "#f0b67f" }}>
            {dialing ? "Calling…" : filing ? "Filing your report…" : phase === "filed" ? "Call ended" : "Connected"}
          </div>

          <div className="mx-auto mt-4 relative grid place-items-center">
            {(dialing || listening) && (
              <>
                <span className="call-ring" />
                <span className="call-ring call-ring-2" />
              </>
            )}
            <div
              className="grid place-items-center w-24 h-24 rounded-full text-4xl"
              style={{ background: "#ffffff14", border: "1px solid #ffffff2e" }}
            >
              <span className="deva">स</span>
            </div>
          </div>

          <h2 className="serif text-2xl mt-4 leading-tight">{AGENT_NAME}</h2>
          <div className="mono text-[13px] mt-1" style={{ color: "#cfe3d8" }}>
            {dialing ? "ringing…" : `${mmss(seconds)} · secure civic line`}
          </div>
          {!dialing && (
            <div className="mono text-[11px] mt-1.5 inline-flex items-center gap-1.5" style={{ color: located ? "#8fd3ad" : "#9fc4b3" }}>
              <span>📍</span>
              {located ? "Location locked — your report will pin here" : "Locating you…"}
            </div>
          )}
        </div>

        {/* transcript */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto thin-scroll px-4 py-5 mt-5 space-y-3 min-h-[34vh]"
        >
          {turns.map((t, i) => (
            <div key={i} className={`flex ${t.who === "you" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[82%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug rise"
                style={
                  t.who === "you"
                    ? { background: "#d2602e", color: "#fff", borderBottomRightRadius: 6 }
                    : { background: "#ffffff14", color: "#eaf3ee", borderBottomLeftRadius: 6 }
                }
              >
                {t.text}
              </div>
            </div>
          ))}

          {partial && (
            <div className="flex justify-end">
              <div
                className="max-w-[82%] rounded-2xl px-3.5 py-2 text-[14px] italic"
                style={{ background: "#d2602e88", color: "#fff", borderBottomRightRadius: 6 }}
              >
                {partial}
              </div>
            </div>
          )}

          {listening && !partial && (
            <div className="text-center text-[13px]" style={{ color: "#9fc4b3" }}>
              <span className="live-dot">●</span> listening…
            </div>
          )}
        </div>

        {/* controls */}
        <div className="px-6 pb-8 pt-3 shrink-0">
          {done ? (
            <button
              onClick={onClose}
              className="w-full rounded-full py-3 font-semibold"
              style={{ background: "#fff", color: "#173a2f" }}
            >
              See it on the map →
            </button>
          ) : (
            <>
              {/* not-supported / quick demo path */}
              {phase === "connected" && !listening && !supported && (
                <p className="text-center text-[13px] mb-3" style={{ color: "#cfe3d8" }}>
                  Voice needs Chrome or Edge. Use the demo call below.
                </p>
              )}

              <div className="flex items-center justify-center gap-6">
                {/* mic toggle (only when connected) */}
                {phase === "connected" && supported && (
                  <button
                    onClick={() => (listening ? recRef.current?.stop() : startListening())}
                    aria-label={listening ? "Stop talking" : "Talk"}
                    className="grid place-items-center w-14 h-14 rounded-full text-xl transition-transform active:scale-95"
                    style={{
                      background: listening ? "#b23a2e" : "#ffffff1f",
                      border: "1px solid #ffffff33",
                    }}
                  >
                    🎙️
                  </button>
                )}

                {/* hang up */}
                <button
                  onClick={hangUp}
                  aria-label="Hang up"
                  className="grid place-items-center w-16 h-16 rounded-full text-2xl transition-transform active:scale-95"
                  style={{ background: "#e23b2e", boxShadow: "0 8px 22px #e23b2e55" }}
                >
                  📞
                </button>
              </div>

              {(phase === "connected" || dialing) && (
                <button
                  onClick={() => file(SAMPLES[Math.floor(Math.random() * SAMPLES.length)])}
                  disabled={dialing || filing}
                  className="mx-auto mt-4 block text-[13px] underline underline-offset-4 disabled:opacity-40"
                  style={{ color: "#cfe3d8" }}
                >
                  ▶ Speak a sample issue (demo)
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .call-ring {
          position: absolute;
          width: 6rem;
          height: 6rem;
          border-radius: 9999px;
          border: 2px solid #f0b67f55;
          animation: callpulse 1.8s ease-out infinite;
        }
        .call-ring-2 {
          animation-delay: 0.9s;
        }
        @keyframes callpulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.9);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
