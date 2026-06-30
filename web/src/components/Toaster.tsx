"use client";

import { useEffect } from "react";

export interface Toast {
  id: string;
  emoji: string;
  title: string;
  body?: string;
  accent?: string; // border / accent color
  href?: string; // optional CTA target
  hrefLabel?: string;
}

export default function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed z-[80] inset-x-0 top-14 px-3 flex flex-col items-center gap-2 pointer-events-none sm:inset-x-auto sm:right-4 sm:items-end sm:px-0">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 6500);
    return () => clearTimeout(id);
  }, [onDismiss]);

  const accent = toast.accent ?? "#2f7d57";
  return (
    <div
      className="pointer-events-auto w-full max-w-sm bg-card border border-line-strong rounded-lg shadow-2xl overflow-hidden rise"
      style={{ borderLeft: `4px solid ${accent}` }}
      role="status"
    >
      <div className="flex items-start gap-2.5 p-3">
        <span className="text-xl leading-none mt-0.5">{toast.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold leading-snug">{toast.title}</div>
          {toast.body && <div className="text-[12px] text-ink-soft leading-snug mt-0.5">{toast.body}</div>}
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-ink-soft hover:text-ink text-sm leading-none shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
