"use client";

import { useState } from "react";

import { useDirectory } from "@/lib/store";
import { Button, CheckMark, Chip, Panel } from "./ui";

const DIFFICULTY_TONE = {
  Starter: "ok",
  Core: "accent",
  Advanced: "warn",
} as const;

export function MissionPanel() {
  const { results, actions } = useDirectory();
  const [open, setOpen] = useState<string | null>(results.find((r) => !r.complete)?.mission.id ?? null);
  const [hints, setHints] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  const done = results.filter((r) => r.complete).length;
  const visible = results.filter((r) =>
    filter === "all" ? true : filter === "open" ? !r.complete : r.complete,
  );
  const totalChecks = results.reduce((n, r) => n + r.total, 0);
  const passedChecks = results.reduce((n, r) => n + r.passed, 0);

  return (
    <Panel
      title="Access reviews"
      subtitle={`${done} of ${results.length} closed · ${actions} change${actions === 1 ? "" : "s"} made`}
      className="h-full"
    >
      <div className="sticky top-0 z-10 border-b border-line-soft bg-surface px-4 py-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className="h-full rounded-full bg-ok transition-[width] duration-300"
            style={{ width: `${(done / results.length) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-ink-faint">
          {passedChecks} of {totalChecks} acceptance criteria met. Re-graded after every change.
        </p>
        <div className="mt-2 flex gap-1">
          {(["all", "open", "closed"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded px-2 py-0.5 text-[11px] capitalize transition-colors ${
                filter === option
                  ? "bg-surface-3 text-ink"
                  : "text-ink-faint hover:bg-surface-2 hover:text-ink-muted"
              }`}
            >
              {option}
              {option === "open" && ` (${results.length - done})`}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-line-soft">
        {visible.map((result) => {
          const isOpen = open === result.mission.id;
          const showHint = hints.includes(result.mission.id);
          return (
            <li key={result.mission.id} className={result.complete ? "bg-ok/[0.04]" : ""}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : result.mission.id)}
                className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-surface-2"
              >
                <CheckMark pass={result.complete} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-[13px] font-semibold ${
                        result.complete ? "text-ok" : "text-ink"
                      }`}
                    >
                      {result.mission.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-faint">
                      {result.passed}/{result.total}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Chip tone="muted">{result.mission.category}</Chip>
                    <Chip tone={DIFFICULTY_TONE[result.mission.difficulty]}>
                      {result.mission.difficulty}
                    </Chip>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="space-y-3 px-4 pb-4 pl-[42px]">
                  <p className="text-xs leading-relaxed text-ink-muted">{result.mission.brief}</p>

                  <ul className="space-y-1.5">
                    {result.checks.map((check) => (
                      <li key={check.id} className="flex items-start gap-2">
                        <CheckMark pass={check.pass} />
                        <span
                          className={`text-xs leading-4 ${
                            check.pass ? "text-ink-muted line-through decoration-ok/40" : "text-ink"
                          }`}
                        >
                          {check.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {showHint ? (
                    <p className="rounded-md border border-warn/25 bg-warn/8 px-2.5 py-2 text-xs leading-relaxed text-warn/90">
                      {result.mission.hint}
                    </p>
                  ) : (
                    !result.complete && (
                      <Button
                        onClick={() => setHints((h) => [...h, result.mission.id])}
                        variant="ghost"
                      >
                        Show hint
                      </Button>
                    )
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
