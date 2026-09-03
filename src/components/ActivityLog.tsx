"use client";

import { useSyncExternalStore } from "react";

import { useDirectory } from "@/lib/store";
import { Panel } from "./ui";

const KIND_STYLE = {
  mutation: "text-ink-muted",
  task: "text-ok",
  system: "text-ink-faint italic",
} as const;

const subscribeNoop = () => () => {};

export function ActivityLog() {
  const { log } = useDirectory();
  // Timestamps come from Date.now(), so they can only be rendered after hydration.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  return (
    <Panel title="Activity" subtitle="Every change, and every review it moved" className="max-h-[220px] lg:max-h-none lg:min-h-0">
      <ul className="divide-y divide-line-soft">
        {log.map((entry) => (
          <li key={entry.id} className="flex items-baseline gap-2 px-3 py-1.5 text-[11px]">
            <span className="shrink-0 font-mono text-ink-faint">
              {mounted
                ? new Date(entry.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "--:--:--"}
            </span>
            <span className={KIND_STYLE[entry.kind]}>{entry.message}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
