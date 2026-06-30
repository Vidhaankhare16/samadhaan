"use client";

export default function StarterGuide({
  onSpeak,
  onPhoto,
  onNeeds,
  onClose,
}: {
  onSpeak: () => void;
  onPhoto: () => void;
  onNeeds: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-ink/55 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl my-auto bg-card border border-line-strong rounded-2xl shadow-2xl rise overflow-hidden">
        <div className="px-6 sm:px-8 pt-7 pb-5 text-center border-b border-line">
          <div className="eyebrow text-saffron">Welcome to</div>
          <h1
            className="serif text-4xl sm:text-5xl mt-1 leading-none"
            style={{ fontFamily: "system-ui, 'Noto Sans Devanagari', serif" }}
          >
            समाधान
          </h1>
          <p className="serif text-2xl sm:text-3xl mt-1">Samadhaan</p>
          <p className="text-ink-soft text-sm sm:text-[15px] mt-3 max-w-md mx-auto leading-relaxed">
            Spot a problem in the city? You do one thing — <b>report it</b>. Our AI agents handle the
            rest: they pin it on the map and file it with the right authority for you.
          </p>
        </div>

        <div className="p-5 sm:p-6 grid sm:grid-cols-2 gap-3">
          <GuideCard
            badge="1"
            emoji="🎙️"
            title="Speak it"
            body="Tell us the problem and where it is. Just talk — like calling a helpline."
            cta="Report by voice"
            onClick={onSpeak}
            accent="#d2602e"
          />
          <GuideCard
            badge="2"
            emoji="📷"
            title="Snap it"
            body="Take a photo of the issue. AI identifies it and files it automatically."
            cta="Report with a photo"
            onClick={onPhoto}
            accent="#173a2f"
          />
        </div>

        <button
          onClick={onNeeds}
          className="mx-5 sm:mx-6 mb-4 w-[calc(100%-2.5rem)] sm:w-[calc(100%-3rem)] text-left rounded-xl border border-line bg-paper-2 hover:border-civic-blue transition-colors px-4 py-3 flex items-center gap-3"
        >
          <span className="text-2xl">♿</span>
          <div className="flex-1">
            <div className="font-semibold text-[14px]">Have a disability or special need?</div>
            <div className="text-[12.5px] text-ink-soft leading-snug">
              Wheelchair user, pet parent, low vision, senior? Get places nearby that actually work
              for you.
            </div>
          </div>
          <span className="text-civic-blue mono text-sm">→</span>
        </button>

        <div className="px-5 sm:px-6 pb-6">
          <button onClick={onClose} className="btn-primary w-full">
            Explore the live map
          </button>
        </div>
      </div>
    </div>
  );
}

function GuideCard({
  badge,
  emoji,
  title,
  body,
  cta,
  onClick,
  accent,
}: {
  badge: string;
  emoji: string;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-line bg-paper-2 hover:bg-card transition-colors p-4 flex flex-col group"
      style={{ borderColor: accent + "33" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid place-items-center w-9 h-9 rounded-full text-lg"
          style={{ background: accent + "18" }}
        >
          {emoji}
        </span>
        <span className="mono text-[11px] text-ink-soft">STEP {badge}</span>
      </div>
      <div className="serif text-2xl mt-2">{title}</div>
      <div className="text-[13px] text-ink-soft leading-snug mt-1 flex-1">{body}</div>
      <span
        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold"
        style={{ color: accent }}
      >
        {cta} <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </span>
    </button>
  );
}
