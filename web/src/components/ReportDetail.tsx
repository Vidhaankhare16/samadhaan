"use client";

import { useRef, useState } from "react";
import { AGENT_COLOR } from "@/lib/useLive";
import { STATUS_META, timeAgo, slaLabel } from "@/lib/format";
import { CATEGORY_META, SEVERITY_META, type Report } from "@/lib/types";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function ReportDetail({ report, onBack }: { report: Report; onBack: () => void }) {
  const [showLetter, setShowLetter] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [proof, setProof] = useState<{ resolved: boolean; confidence: number; explanation: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const meta = CATEGORY_META[report.category];
  const st = STATUS_META[report.status];
  const sev = SEVERITY_META[report.severity];
  const sla = slaLabel(report.slaDueAt);

  async function verifyFix(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setVerifying(true);
    setProof(null);
    try {
      const afterImageUrl = await fileToDataUrl(f);
      const res = await fetch(`/api/reports/${report.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afterImageUrl }),
      });
      setProof((await res.json()).result);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="px-4 py-3">
      <button onClick={onBack} className="mono text-[12px] text-ink-soft hover:text-ink flex items-center gap-1">
        ← Back to city pulse
      </button>

      <div className="flex items-center gap-2 flex-wrap mt-3">
        <span className="text-2xl">{meta.emoji}</span>
        <span className="eyebrow">{meta.label}</span>
        <span className="ml-auto stamp text-[10px] px-1.5 py-0.5" style={{ color: st.color }}>
          {st.label}
        </span>
      </div>
      <h2 className="serif text-2xl mt-2 leading-tight">{report.title}</h2>
      <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{report.description}</p>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <Stat label="Severity" value={sev.label} color={sev.color} />
        <Stat label="Backed by" value={`${report.upvotes}×`} />
        <Stat label="Source" value={report.source} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-soft">
        <span>📍 {report.address}</span>
        {sla && <span className={`ml-auto mono ${sla.urgent ? "text-urgent" : "text-amber"}`}>⏱ {sla.text}</span>}
      </div>

      {(report.imageUrl || report.afterImageUrl) && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Photo label="Before" src={report.imageUrl} />
          <Photo label="After" src={report.afterImageUrl} />
        </div>
      )}

      {report.department && (
        <div className="mt-4 card p-3">
          <div className="eyebrow">Filed with</div>
          <div className="text-sm font-medium mt-0.5">{report.department.name}</div>
          {report.draftedComplaint && (
            <>
              <button onClick={() => setShowLetter((v) => !v)} className="mt-2 text-[12px] mono text-saffron hover:underline">
                {showLetter ? "▾ Hide" : "▸ View"} the complaint the agent wrote
              </button>
              {showLetter && (
                <pre className="mt-2 text-[11.5px] leading-relaxed whitespace-pre-wrap font-sans text-ink-soft bg-paper-2 border border-line rounded-md p-3 rise">
                  {report.draftedComplaint}
                </pre>
              )}
            </>
          )}
        </div>
      )}

      {report.status !== "resolved" && (
        <div className="mt-4 card p-3">
          <div className="eyebrow text-verify">Already fixed?</div>
          <p className="text-[12px] text-ink-soft mt-1">
            Upload an after-photo — the agent checks it against the original and closes the case.
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

      <div className="mt-5">
        <div className="eyebrow mb-2">What the agents did</div>
        <ol className="relative border-l border-line ml-1.5 space-y-3 pl-4">
          {report.agentLog.map((l) => (
            <li key={l.id} className="relative">
              <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-card" style={{ background: AGENT_COLOR[l.agent] }} />
              <div className="flex items-center gap-2">
                <span className="mono text-[10px] font-semibold" style={{ color: AGENT_COLOR[l.agent] }}>{l.agent}</span>
                <span className="mono text-[10px] text-ink-soft ml-auto">{timeAgo(l.at)}</span>
              </div>
              <div className="text-[13px] font-medium">{l.action}</div>
              <div className="text-[11.5px] text-ink-soft leading-snug">{l.reasoning}</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-2 text-center">
      <div className="eyebrow text-[9px]">{label}</div>
      <div className="text-sm font-semibold capitalize mt-0.5" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
function Photo({ label, src }: { label: string; src?: string }) {
  return (
    <div>
      <div className="eyebrow text-[9px] mb-1">{label}</div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="w-full h-28 object-cover rounded-md border border-line" />
      ) : (
        <div className="w-full h-28 rounded-md border border-dashed border-line bg-paper-2 grid place-items-center text-[11px] text-ink-soft">
          — none —
        </div>
      )}
    </div>
  );
}
