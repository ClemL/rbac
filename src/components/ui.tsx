"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "muted";

const CHIP_TONE: Record<Tone, string> = {
  neutral: "bg-surface-3 text-ink border-line",
  accent: "bg-accent/12 text-accent border-accent/35",
  ok: "bg-ok/12 text-ok border-ok/35",
  warn: "bg-warn/12 text-warn border-warn/35",
  danger: "bg-danger/12 text-danger border-danger/35",
  muted: "bg-surface-2 text-ink-faint border-line-soft",
};

export function Chip({
  children,
  tone = "neutral",
  title,
  onClick,
  mono,
}: {
  children: ReactNode;
  tone?: Tone;
  title?: string;
  onClick?: () => void;
  mono?: boolean;
}) {
  const cls = `inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-4 ${
    CHIP_TONE[tone]
  } ${mono ? "font-mono" : ""} ${onClick ? "cursor-pointer hover:brightness-125" : ""}`;
  if (onClick) {
    return (
      <button type="button" className={cls} title={title} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md";
};

const BUTTON_VARIANT = {
  primary: "bg-accent text-white hover:bg-accent/85 border-transparent",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-surface-3 border-line",
  subtle: "bg-surface-3 text-ink hover:bg-line border-line",
  danger: "bg-transparent text-danger hover:bg-danger/12 border-danger/40",
};

export function Button({ variant = "ghost", size = "sm", className = "", ...rest }: ButtonProps) {
  const sizing = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <button
      {...rest}
      className={`rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${sizing} ${BUTTON_VARIANT[variant]} ${className}`}
    />
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface ${className}`}
    >
      {(title || actions) && (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="truncate text-xs text-ink-faint">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={`min-h-0 flex-1 overflow-auto ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-4 py-6 text-center text-xs text-ink-faint">{children}</div>;
}

export function CheckMark({ pass }: { pass: boolean }) {
  return (
    <span
      className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
        pass ? "border-ok/50 bg-ok/15 text-ok animate-pop" : "border-line bg-surface-2 text-ink-faint"
      }`}
    >
      {pass ? "✓" : ""}
    </span>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block size-1.5 rounded-full ${active ? "bg-ok" : "bg-ink-faint"}`}
      title={active ? "Active" : "Suspended"}
    />
  );
}

/** Keeps the focused row visible when selection moves from elsewhere — e.g. a newly created object. */
function useScrollIntoView<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return ref;
}

export function ListRow({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const ref = useScrollIntoView<HTMLLIElement>(selected);
  return (
    <li ref={ref}>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={`w-full px-3 py-2 text-left transition-colors ${
          selected ? "bg-accent-soft" : "hover:bg-surface-2"
        }`}
      >
        {children}
      </button>
    </li>
  );
}
