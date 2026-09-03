"use client";

import { useState } from "react";

import { permissionsForResource, RESOURCES } from "@/lib/permissions";
import { describePath, effectivePermissions, grantsByPermission } from "@/lib/rbac";
import { useDirectory } from "@/lib/store";
import type { ResourceId } from "@/lib/types";
import { Chip, Panel } from "./ui";

/** Just enough fake data to make the modules feel like a real console. */
const RECORDS: Record<ResourceId, { id: string; primary: string; secondary: string }[]> = {
  patients: [
    { id: "PT-10482", primary: "Alvarez, R.", secondary: "MRN 10482 · Med-Surg 4W" },
    { id: "PT-10517", primary: "Nguyen, T.", secondary: "MRN 10517 · Cardiology" },
    { id: "PT-10603", primary: "Okonkwo, A.", secondary: "MRN 10603 · Oncology" },
  ],
  claims: [
    { id: "CLM-88213", primary: "$4,120.00", secondary: "Aetna · pending adjudication" },
    { id: "CLM-88240", primary: "$918.55", secondary: "BCBS · denied, resubmit" },
  ],
  invoices: [
    { id: "INV-2291", primary: "$12,400.00", secondary: "Draft · awaiting approval" },
    { id: "INV-2288", primary: "$3,905.00", secondary: "Approved · sent 3 days ago" },
  ],
  reports: [
    { id: "RPT-DSO", primary: "Days sales outstanding", secondary: "Refreshed nightly" },
    { id: "RPT-DENY", primary: "Denial rate by payer", secondary: "Refreshed weekly" },
  ],
  users: [
    { id: "ACC-114", primary: "Provisioning queue", secondary: "2 pending onboarding" },
    { id: "ACC-115", primary: "Stale accounts", secondary: "1 flagged for review" },
  ],
  settings: [
    { id: "CFG-SSO", primary: "Identity provider", secondary: "SAML · Okta" },
    { id: "CFG-RET", primary: "Retention policy", secondary: "7 years" },
  ],
};

interface Attempt {
  permission: string;
  allowed: boolean;
  detail: string;
}

export function SimulateTab() {
  const { dir } = useDirectory();
  const [userId, setUserId] = useState(dir.users[0]?.id ?? "");
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const user = dir.users.find((u) => u.id === userId) ?? dir.users[0];
  if (!user) return <Panel><div className="p-4 text-xs text-ink-faint">No accounts.</div></Panel>;

  const perms = effectivePermissions(dir, user.id);
  const grants = grantsByPermission(dir, user.id);
  const suspended = user.status === "suspended";

  const attemptAction = (permission: string) => {
    if (suspended) {
      setAttempt({
        permission,
        allowed: false,
        detail: "Account is suspended. Authentication rejected before authorization runs.",
      });
      return;
    }
    const allowed = perms.has(permission);
    setAttempt({
      permission,
      allowed,
      detail: allowed
        ? (grants.get(permission) ?? []).map((g) => describePath(dir, g)).join("  ·  ")
        : "403 — no role reachable from this account carries the permission.",
    });
  };

  return (
    <Panel
      title="Impersonate"
      subtitle="Open the managed system as any account and see what the directory actually allows."
      actions={
        <select
          value={user.id}
          onChange={(e) => {
            setUserId(e.target.value);
            setAttempt(null);
          }}
          className="rounded-md border border-line bg-surface-2 px-2 py-1 text-xs outline-none focus:border-accent"
        >
          {dir.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      }
      bodyClassName="p-4 space-y-4"
      className="lg:min-h-0"
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-soft bg-surface-2 px-3 py-2">
        <span className="text-xs text-ink-muted">
          Signed in as <span className="font-semibold text-ink">{user.name}</span> — {user.title}
        </span>
        <Chip tone={suspended ? "danger" : "ok"}>{suspended ? "Suspended" : "Active"}</Chip>
        <Chip tone="muted">{perms.size} permissions</Chip>
      </div>

      {attempt && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            attempt.allowed
              ? "border-ok/30 bg-ok/8 text-ok"
              : "border-danger/30 bg-danger/8 text-danger"
          }`}
        >
          <div className="font-mono font-semibold">
            {attempt.allowed ? "200 ALLOWED" : "403 DENIED"} — {attempt.permission}
          </div>
          <div className="mt-0.5 opacity-80">{attempt.detail}</div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {RESOURCES.map((resource) => {
          const canRead = !suspended && perms.has(`${resource.id}:read`);
          return (
            <div
              key={resource.id}
              className={`rounded-lg border p-3 transition-opacity ${
                canRead ? "border-line bg-surface-2" : "border-line-soft bg-surface-2/40"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">{resource.label}</h3>
                {!canRead && <span className="text-[10px] text-ink-faint">no read access</span>}
              </div>

              <ul className="my-2 space-y-1">
                {RECORDS[resource.id].map((record) => (
                  <li
                    key={record.id}
                    className="flex items-baseline justify-between gap-2 rounded border border-line-soft bg-surface px-2 py-1 text-[11px]"
                  >
                    {canRead ? (
                      <>
                        <span className="truncate text-ink">{record.primary}</span>
                        <span className="shrink-0 font-mono text-ink-faint">{record.id}</span>
                      </>
                    ) : (
                      <span className="select-none font-mono text-ink-faint">
                        ██████████ · redacted
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-1">
                {permissionsForResource(resource.id).map((permission) => {
                  const allowed = !suspended && perms.has(permission.key);
                  return (
                    <button
                      key={permission.key}
                      type="button"
                      onClick={() => attemptAction(permission.key)}
                      className={`rounded border px-1.5 py-0.5 text-[11px] capitalize transition-colors ${
                        allowed
                          ? "border-accent/40 bg-accent/12 text-accent hover:bg-accent/20"
                          : "border-line-soft bg-surface text-ink-faint hover:border-danger/40 hover:text-danger"
                      }`}
                    >
                      {permission.action}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
