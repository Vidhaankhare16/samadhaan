"use client";

import { useEffect } from "react";

export default function Modal({
  title,
  eyebrow,
  onClose,
  children,
  wide,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} bg-card border-t sm:border border-line-strong rounded-t-2xl sm:rounded-xl max-h-[90vh] sm:max-h-[86vh] flex flex-col rise shadow-2xl`}
      >
        <div className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" />
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-line shrink-0">
          <div>
            {eyebrow && <div className="eyebrow text-saffron">{eyebrow}</div>}
            <h2 className="serif text-2xl leading-tight mt-0.5">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-soft hover:text-ink text-xl leading-none mt-1 shrink-0"
          >
            ✕
          </button>
        </header>
        <div className="overflow-y-auto thin-scroll px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
