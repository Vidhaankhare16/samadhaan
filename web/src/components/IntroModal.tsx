"use client";

import { useEffect, useState } from "react";

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Report in one breath",
    body: "Open Report → type, snap a photo, or 🎙️ speak your complaint. No forms, no department-hunting.",
  },
  {
    n: "02",
    title: "Watch the agents act — alone",
    body: "On Live Agents, a swarm diagnoses the issue, removes duplicates, drafts a formal complaint, files it to the right department, and tracks the SLA. No human presses a button.",
  },
  {
    n: "03",
    title: "Close the loop",
    body: "Open any pin → Submit proof of fix. Gemini compares before/after photos and auto-verifies the resolution. The civic loop closes end-to-end.",
  },
];

export default function IntroModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem("sam_seen");
    if (!seen) setOpen(true);
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem("sam_seen", "1");
    } catch {}
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mono text-[11px] px-2 py-1 rounded-full border border-line text-ink-soft hover:border-ink hover:text-ink transition-colors"
        title="How to try this"
      >
        ⓘ Demo guide
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={close} />
          <div className="relative w-full max-w-lg card p-6 rise">
            <div className="eyebrow text-saffron">An autonomous civic agent</div>
            <h2 className="serif text-3xl mt-1 leading-tight">
              समाधान — the civic issue that resolves itself
            </h2>
            <p className="text-sm text-ink-soft mt-2">
              Citizens only report. AI agents do the bureaucracy — diagnose, file, track, escalate,
              and verify the fix. Here&apos;s what to try:
            </p>
            <div className="mt-4 space-y-3">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-3">
                  <span className="serif text-2xl text-saffron/70 leading-none w-9 shrink-0">{s.n}</span>
                  <div>
                    <div className="font-semibold text-[14px]">{s.title}</div>
                    <div className="text-[12.5px] text-ink-soft leading-snug">{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={close} className="btn-primary w-full mt-5">
              Enter the command center
            </button>
          </div>
        </div>
      )}
    </>
  );
}
