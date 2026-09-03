"use client";

import { useState } from "react";

import { SYSTEM_NAME } from "@/lib/seed";
import { sodViolations } from "@/lib/rbac";
import { useDirectory, useDispatch } from "@/lib/store";
import { ActivityLog } from "./ActivityLog";
import { GroupsTab } from "./GroupsTab";
import { MissionPanel } from "./MissionPanel";
import { RolesTab } from "./RolesTab";
import { SimulateTab } from "./SimulateTab";
import { UsersTab } from "./UsersTab";
import { Button, Chip } from "./ui";

const TABS = [
  { id: "users", label: "Users" },
  { id: "groups", label: "Groups" },
  { id: "roles", label: "Roles" },
  { id: "simulate", label: "Impersonate" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Console() {
  const { dir, results, actions } = useDirectory();
  const dispatch = useDispatch();
  const [tab, setTab] = useState<TabId>("users");
  const [showLog, setShowLog] = useState(true);

  const done = results.filter((r) => r.complete).length;
  const conflicts = sodViolations(dir).length;

  return (
    <div className="flex min-h-dvh flex-col bg-bg lg:h-dvh lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-sm font-semibold tracking-tight">{SYSTEM_NAME}</h1>
          <span className="text-xs text-ink-faint">Identity &amp; Access Administration</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={done === results.length ? "ok" : "muted"}>
            {done}/{results.length} reviews closed
          </Chip>
          <Chip tone={conflicts > 0 ? "danger" : "muted"}>
            {conflicts} SoD conflict{conflicts === 1 ? "" : "s"}
          </Chip>
          <Chip tone="muted">{actions} changes</Chip>
          <Button variant="ghost" onClick={() => setShowLog((s) => !s)}>
            {showLog ? "Hide log" : "Show log"}
          </Button>
          <Button variant="subtle" onClick={() => dispatch({ type: "reset" })}>
            Reset tenant
          </Button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-3 p-3 lg:min-h-0 lg:grid-cols-[360px_1fr]">
        <div className="max-h-[65vh] lg:max-h-full lg:min-h-0">
          <MissionPanel />
        </div>

        <div className="grid gap-3 lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)]">
          <nav className="flex gap-1 rounded-lg border border-line bg-surface p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div
            className={`grid gap-3 lg:min-h-0 ${
              showLog ? "lg:grid-rows-[minmax(0,1fr)_150px]" : "lg:grid-rows-[minmax(0,1fr)]"
            }`}
          >
            <div className="lg:min-h-0">
              {tab === "users" && <UsersTab />}
              {tab === "groups" && <GroupsTab />}
              {tab === "roles" && <RolesTab />}
              {tab === "simulate" && <SimulateTab />}
            </div>
            {showLog && <ActivityLog />}
          </div>
        </div>
      </div>
    </div>
  );
}
