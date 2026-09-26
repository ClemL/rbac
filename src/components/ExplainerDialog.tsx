"use client";

import { useEffect, useRef } from "react";

import { ExplainerPlayer } from "./ExplainerPlayer";

/** Modal that hosts the explainer. Escape, the backdrop, or the close button dismiss it. */
export function ExplainerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("[tabindex='0']")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="explainer-title"
        className="animate-pop w-full max-w-[1120px] rounded-2xl border border-line bg-surface p-3 shadow-2xl sm:p-4"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="explainer-title" className="text-sm font-semibold text-ink">
              What is this sandbox?
            </h2>
            <p className="text-xs text-ink-faint">
              A three-minute, hand-drawn tour of role-based access control and how the reviews work.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-line px-2 py-1 text-xs text-ink-muted hover:bg-surface-3 hover:text-ink"
          >
            Close ✕
          </button>
        </div>
        <ExplainerPlayer onFinish={onClose} />
      </div>
    </div>
  );
}
