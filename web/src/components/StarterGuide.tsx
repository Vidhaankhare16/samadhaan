"use client";

import { useState } from "react";

// Live Dialogflow phone-gateway number, injected at build time.
const VOICE_NUMBER = process.env.NEXT_PUBLIC_VOICE_NUMBER?.trim();
const telHref = (() => {
  if (!VOICE_NUMBER) return undefined;
  const digits = VOICE_NUMBER.replace(/\D/g, "");
  if (!digits) return undefined;
  return "tel:+" + (digits.length === 10 ? "1" + digits : digits);
})();

const STEPS = [
  {
    emoji: "🎙️",
    tag: "Speak it",
    title: "Call the agent — just talk",
    body: "See a problem in the city? Tell our voice agent what it is and where. We pin it on the map and report it to the right authority for you — no forms, no logins.",
    accent: "#d2602e",
  },
  {
    emoji: "📷",
    tag: "Snap it",
    title: "Or send a photo",
    body: "Take a picture of the issue. Our AI identifies it, maps it, and files the complaint with the correct department automatically.",
    accent: "#173a2f",
  },
  {
    emoji: "♿",
    tag: "Made for you",
    title: "Tell us your needs",
    body: "Wheelchair user, pet parent, low vision or senior? We'll map places near you that actually work — accessible metro stations, pet-friendly cafes and more.",
    accent: "#1f4f7a",
  },
  {
    emoji: "🏛️",
    tag: "For officials",
    title: "Get called when issues arise",
    body: "Municipal or ward officer? Leave your number and our agent phones you the moment an issue is filed in your area — a spoken briefing with the tracking id. No app, no internet needed on your side.",
    accent: "#173a2f",
  },
];

export default function StarterGuide({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  // "For officials" sign-up state
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [signup, setSignup] = useState<"idle" | "saving" | "done">("idle");

  async function registerOfficial() {
    if (!phone.replace(/\D/g, "")) return;
    setSignup("saving");
    try {
      await fetch("/api/officials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, area }),
      });
      setSignup("done");
    } catch {
      setSignup("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/55 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-md bg-card border border-line-strong rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-5 text-center">
          <div className="eyebrow text-saffron">Welcome to</div>
          <div className="flex items-baseline justify-center gap-2 mt-0.5">
            <span className="serif text-2xl leading-none" style={{ fontFamily: "system-ui,'Noto Sans Devanagari',serif" }}>समाधान</span>
            <span className="serif text-xl leading-none">Samadhaan</span>
          </div>
        </div>

        <div key={i} className="px-6 py-6 text-center rise">
          <div
            className="mx-auto grid place-items-center w-20 h-20 rounded-full text-4xl"
            style={{ background: step.accent + "18" }}
          >
            {step.emoji}
          </div>
          <div className="eyebrow mt-4" style={{ color: step.accent }}>
            Step {i + 1} of {STEPS.length} · {step.tag}
          </div>
          <h2 className="serif text-3xl mt-1.5 leading-tight">{step.title}</h2>
          <p className="text-[14px] text-ink-soft leading-relaxed mt-2.5 max-w-sm mx-auto">{step.body}</p>

          {i === 0 && telHref && (
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <a
                href={telHref}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform active:scale-95"
                style={{ background: step.accent }}
              >
                📞 Call the agent — {VOICE_NUMBER}
              </a>
              <span className="text-[11px] text-ink-soft">
                Also free in your browser — open <strong>Call agent</strong> (works in India, no ISD)
              </span>
            </div>
          )}

          {step.tag === "For officials" && (
            <div className="mt-4 flex flex-col items-center gap-2">
              {signup === "done" ? (
                <p className="text-[13px] font-semibold" style={{ color: step.accent }}>
                  ✓ You&apos;re set. We&apos;ll call {phone} when an issue is filed
                  {area ? ` in ${area}` : ""}.
                </p>
              ) : (
                <div className="w-full max-w-xs flex flex-col gap-2">
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Your phone, e.g. +91 98XXXXXXXX"
                    className="w-full rounded-lg border border-line-strong bg-card px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Area you cover (optional)"
                    className="w-full rounded-lg border border-line-strong bg-card px-3 py-2 text-sm outline-none focus:border-ink"
                  />
                  <button
                    onClick={registerOfficial}
                    disabled={signup === "saving" || !phone.replace(/\D/g, "")}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
                    style={{ background: step.accent }}
                  >
                    {signup === "saving" ? "Saving…" : "📞 Call me about issues"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 pb-5">
          {i > 0 ? (
            <button onClick={() => setI(i - 1)} className="text-[13px] text-ink-soft hover:text-ink mono">
              ← Back
            </button>
          ) : (
            <button onClick={onClose} className="text-[13px] text-ink-soft hover:text-ink mono">
              Skip
            </button>
          )}

          <div className="flex gap-1.5">
            {STEPS.map((_, n) => (
              <span
                key={n}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: n === i ? 18 : 6,
                  background: n === i ? step.accent : "var(--color-line-strong)",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => (last ? onClose() : setI(i + 1))}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-95"
            style={{ background: step.accent }}
          >
            {last ? "Explore the map" : "Next"} →
          </button>
        </div>
      </div>
    </div>
  );
}
