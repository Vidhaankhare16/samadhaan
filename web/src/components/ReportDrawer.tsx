"use client";

import { useRef, useState } from "react";
import { AGENT_COLOR } from "@/lib/useLive";
import { STATUS_META, timeAgo, slaLabel } from "@/lib/format";
import { CATEGORY_META, SEVERITY_META, type Report } from "@/lib/types";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ReportDrawer({
  report,
  onClose,
}: {
  report: Report | null;
  onClose: () => void;
}) {
  const [showLetter, setShowLetter] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [proof, setProof] = useState<{ resolved: boolean; confidence: number; explanation: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!report) return null;
  const meta = CATEGORY_META[report.category];
  const st = STATUS_META[report.status];
  const sev = SEVERITY_META[report.severity];
  const sla = slaLabel(report.slaDueAt);

  async function verifyFix(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !report) return;
    setVerifying(true);
    setProof(null);
    try {
      const afterImageUrl = await fileToDataUrl(f);
      const res = await fetch(`/api/reports/${report.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afterImageUrl }),
      });
      const { result } = await res.json();
      setProof(result);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-card border-l border-line-strong overflow-y-auto thin-scroll rise shadow-2xl">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-line px-5 py-3 flex items-center justify-between z-10">
          <span className="mono text-xs text-ink-soft">{report.shortId}</span>
          <button onClick={onClose} className="text-ink-soft hover:text-ink text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl">{meta.emoji}</span>
            <span className="eyebrow">{meta.label}</span>
            <span
              className="ml-auto stamp text-[10px] px-1.5 py-0.5"
              style={{ color: st.color }}
            >
              {st.label}
            </span>
          </div>
          <h2 className="serif text-2xl mt-2 leading-tight">{report.title}</h2>
          <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{report.description}</p>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <Stat label="Severity" value={sev.label} color={sev.color} />
            <Stat label="Corroborated" value={`${report.upvotes}×`} />
            <Stat label="Source" value={report.source} />
          </div>

          <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-soft">
            <span>📍 {report.address}</span>
            {sla && (
              <span className={`ml-auto mono ${sla.urgent ? "text-urgent" : "text-amber"}`}>⏱ {sla.text}</span>
            )}
          </div>

          {(report.imageUrl || report.afterImageUrl) && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Photo label="Before" src={report.imageUrl} />
              <Photo label="After" src={report.afterImageUrl} />
            </div>
          )}

          {report.department && (
            <div className="mt-4 card p-3">
              <div className="eyebrow">Routed to</div>
              <div className="text-sm font-medium mt-0.5">{report.department.name}</div>
              {report.draftedComplaint && (
                <>
                  <button
                    onClick={() => setShowLetter((v) => !v)}
                    className="mt-2 text-[12px] mono text-saffron hover:underline"
                  >
                    {showLetter ? "▾ Hide" : "▸ View"} the complaint the agent drafted
                  </button>
                  {showLetter && (
                    <pre className="mt-2 text-[11.5px] leading-relaxed whitespace-pre-wrap font-sans text-ink-soft bg-paper-2 border border-line rounded-sm p-3 rise">
                      {report.draftedComplaint}
                    </pre>
                  )}
                </>
              )}
            </div>
          )}

          {/* Proof of fix */}
          {report.status !== "resolved" && (
            <div className="mt-4 card p-3">
              <div className="eyebrow text-verify">Close the loop</div>
              <p className="text-[12px] text-ink-soft mt-1">
                Fixed already? Upload an after-photo — the ProofOfFix agent verifies it against the
                original and auto-resolves.
              </p>
              <button onClick={() => fileRef.current?.click()} disabled={verifying} className="btn-saffron mt-2 w-full">
                {verifying ? "Verifying with AI…" : "📸 Submit proof of fix"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={verifyFix} />
            </div>
          )}

          {proof && (
            <div className={`mt-3 card p-3 rise ${proof.resolved ? "border-verify" : "border-urgent"}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{proof.resolved ? "✅" : "⚠️"}</span>
                <span className="font-medium text-sm" style={{ color: proof.resolved ? "#236646" : "#9c2f24" }}>
                  {proof.resolved ? "Fix verified" : "Not verified"} · {Math.round(proof.confidence * 100)}%
                </span>
              </div>
              <p className="text-[12px] text-ink-soft mt-1">{proof.explanation}</p>
            </div>
          )}

          {/* Case timeline */}
          <div className="mt-5">
            <div className="eyebrow mb-2">Case timeline — what the agents did</div>
            <ol className="relative border-l border-line ml-1.5 space-y-3 pl-4">
              {report.agentLog.map((l) => (
                <li key={l.id} className="relative">
                  <span
                    className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-card"
                    style={{ background: AGENT_COLOR[l.agent] }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="mono text-[10px] font-semibold" style={{ color: AGENT_COLOR[l.agent] }}>
                      {l.agent}
                    </span>
                    <span className="mono text-[10px] text-ink-soft ml-auto">{timeAgo(l.at)}</span>
                  </div>
                  <div className="text-[13px] font-medium">{l.action}</div>
                  <div className="text-[11.5px] text-ink-soft leading-snug">{l.reasoning}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-2 text-center">
      <div className="eyebrow text-[9px]">{label}</div>
      <div className="text-sm font-semibold capitalize mt-0.5" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

function Photo({ label, src }: { label: string; src?: string }) {
  return (
    <div>
      <div className="eyebrow text-[9px] mb-1">{label}</div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="w-full h-28 object-cover rounded-sm border border-line" />
      ) : (
        <div className="w-full h-28 rounded-sm border border-dashed border-line bg-paper-2 flex items-center justify-center text-[11px] text-ink-soft">
          — none —
        </div>
      )}
    </div>
  );
}
