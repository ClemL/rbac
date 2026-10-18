"use client";

import { useState } from "react";

import { isSensitive, permissionsForResource, RESOURCES } from "@/lib/permissions";
import { effectiveMembers } from "@/lib/rbac";
import { directHolders, equivalentGroups, splitBlocker } from "@/lib/redesign";
import { useDirectory, useDispatch, useSelected } from "@/lib/store";
import type { PermissionKey, Role, User } from "@/lib/types";
import { Button, Chip, EmptyState, Field, ListRow, Panel } from "./ui";

export function RolesTab() {
  const { dir } = useDirectory();
  const dispatch = useDispatch();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const selected = useSelected("role", dir.roles);

  return (
    <div className="grid grid-cols-1 gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[280px_1fr]">
      <Panel
        title="Roles"
        subtitle={`${dir.roles.length} roles`}
        actions={
          <Button variant="subtle" onClick={() => setAdding((a) => !a)}>
            {adding ? "Cancel" : "New"}
          </Button>
        }
        className="max-h-[50vh] lg:max-h-full lg:min-h-0"
      >
        {adding && (
          <form
            className="flex gap-1.5 border-b border-line-soft p-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              dispatch({ type: "role/create", name: name.trim(), description: "" });
              setName("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Role name"
              className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs outline-none focus:border-accent"
            />
            <Button type="submit" variant="primary">
              Add
            </Button>
          </form>
        )}
        <ul className="divide-y divide-line-soft">
          {dir.roles.map((role) => {
            const groups = dir.groups.filter((g) => g.roleIds.includes(role.id));
            const directUsers = dir.users.filter((u) => u.roleIds.includes(role.id));
            const reach = new Set<string>(directUsers.map((u) => u.id));
            for (const g of groups) for (const m of effectiveMembers(dir, g.id)) reach.add(m.id);
            return (
              <ListRow
                key={role.id}
                selected={role.id === selected?.id}
                onSelect={() => dispatch({ type: "select", kind: "role", id: role.id })}
              >
                <>
                  <div className="truncate text-[13px] font-medium">{role.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Chip tone="muted">
                      {role.permissions.length} perm{role.permissions.length === 1 ? "" : "s"}
                    </Chip>
                    <Chip tone={reach.size === 0 ? "warn" : "muted"}>
                      {reach.size === 0 ? "unused" : `${reach.size} reached`}
                    </Chip>
                  </div>
                </>
              </ListRow>
            );
          })}
        </ul>
      </Panel>

      {selected ? <RoleDetail key={selected.id} role={selected} /> : <Panel><EmptyState>No roles.</EmptyState></Panel>}
    </div>
  );
}

const INPUT =
  "min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs outline-none focus:border-accent";

function RoleDetail({ role }: { role: Role }) {
  const { dir } = useDirectory();
  const dispatch = useDispatch();
  const [splitting, setSplitting] = useState(false);

  const groups = dir.groups.filter((g) => g.roleIds.includes(role.id));
  const directUsers = dir.users.filter((u) => u.roleIds.includes(role.id));
  const reached = new Set<string>(directUsers.map((u) => u.id));
  for (const g of groups) for (const m of effectiveMembers(dir, g.id)) reached.add(m.id);

  return (
    <Panel
      title={role.name}
      subtitle={role.description}
      actions={
        <>
          <Button
            variant={splitting ? "subtle" : "ghost"}
            disabled={!splitting && role.permissions.length < 2}
            title={role.permissions.length < 2 ? "A role needs two or more permissions to split" : undefined}
            onClick={() => setSplitting((s) => !s)}
          >
            {splitting ? "Cancel split" : "Split…"}
          </Button>
          <Button variant="danger" onClick={() => dispatch({ type: "role/delete", roleId: role.id })}>
            Delete
          </Button>
        </>
      }
      bodyClassName="p-4 space-y-5"
      className="lg:min-h-0"
    >
      {splitting && <SplitRoleForm role={role} onDone={() => setSplitting(false)} />}

      <Field label="Permissions">
        <div className="space-y-2">
          {RESOURCES.map((resource) => (
            <div key={resource.id} className="rounded-md border border-line-soft bg-surface-2 p-2">
              <div className="mb-1.5 flex items-baseline gap-2">
                <span className="text-xs font-semibold">{resource.label}</span>
                <span className="truncate text-[11px] text-ink-faint">{resource.blurb}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {permissionsForResource(resource.id).map((permission) => {
                  const held = role.permissions.includes(permission.key);
                  return (
                    <Chip
                      key={permission.key}
                      mono
                      tone={held ? (permission.sensitive ? "warn" : "accent") : "muted"}
                      title={permission.sensitive ? "Sensitive permission" : undefined}
                      onClick={() =>
                        dispatch({
                          type: "role/toggle-permission",
                          roleId: role.id,
                          permission: permission.key,
                        })
                      }
                    >
                      {held ? "✓ " : "+ "}
                      {permission.action}
                      {permission.sensitive && " •"}
                    </Chip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-faint">
          A dot marks a sensitive permission. Changing a role changes access for everyone it reaches
          — {reached.size} account{reached.size === 1 ? "" : "s"} right now.
        </p>
      </Field>

      <Field label="Assigned through groups">
        {groups.length === 0 ? (
          <p className="text-xs text-ink-faint">No group carries this role.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {groups.map((g) => (
              <Chip key={g.id} tone="accent">
                {g.name}
              </Chip>
            ))}
          </div>
        )}
      </Field>

      <Field label="Pinned directly to accounts">
        {directUsers.length === 0 ? (
          <p className="text-xs text-ink-faint">No direct assignments. This is the healthy state.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1">
              {directUsers.map((u) => (
                <Chip key={u.id} tone="warn">
                  {u.name}
                </Chip>
              ))}
            </div>
            <RegroupForm role={role} users={directUsers} />
          </>
        )}
      </Field>
    </Panel>
  );
}

/** Redesign: carve some permissions out of a role into a new one granted everywhere it is. */
function SplitRoleForm({ role, onDone }: { role: Role; onDone: () => void }) {
  const { dir } = useDirectory();
  const dispatch = useDispatch();
  const [picked, setPicked] = useState<PermissionKey[]>([]);
  const [name, setName] = useState("");

  // The matrix above stays live, so drop picks the role no longer holds.
  const chosen = picked.filter((p) => role.permissions.includes(p));
  const blocker = splitBlocker(role, chosen, name);
  const holders = [
    ...dir.groups.filter((g) => g.roleIds.includes(role.id)),
    ...directHolders(dir, role.id),
  ].map((h) => h.name);

  return (
    <form
      className="space-y-2 rounded-md border border-accent/35 bg-accent/8 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (blocker) return;
        dispatch({ type: "role/split", roleId: role.id, permissions: chosen, name: name.trim() });
        onDone();
      }}
    >
      <div className="text-xs font-semibold">Split {role.name}</div>
      <p className="text-[11px] text-ink-faint">
        The permissions you pick move into a new role, granted everywhere {role.name} is
        {holders.length > 0 ? ` (${holders.join(", ")})` : ""}. Nobody&apos;s access changes until
        you revoke the new role where it does not belong.
      </p>
      <div className="flex flex-wrap gap-1">
        {role.permissions.map((permission) => {
          const on = chosen.includes(permission);
          return (
            <Chip
              key={permission}
              mono
              tone={on ? (isSensitive(permission) ? "warn" : "accent") : "muted"}
              onClick={() =>
                setPicked(on ? picked.filter((p) => p !== permission) : [...picked, permission])
              }
            >
              {on ? "→ " : ""}
              {permission}
            </Chip>
          );
        })}
      </div>
      <div className="flex gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New role name"
          className={INPUT}
        />
        <Button type="submit" variant="primary" disabled={blocker !== null}>
          Split
        </Button>
      </div>
      {blocker && <p className="text-[11px] text-ink-faint">{blocker}</p>}
    </form>
  );
}

const NEW_GROUP = "";

/** Redesign: replace every direct assignment of a role with a group that confers the same access. */
function RegroupForm({ role, users }: { role: Role; users: User[] }) {
  const { dir } = useDirectory();
  const dispatch = useDispatch();
  const targets = equivalentGroups(dir, role.id);
  const [choice, setChoice] = useState<string | null>(null);
  const [name, setName] = useState(`${role.name} holders`);

  // Default to reusing an existing group; fall back if the choice stopped qualifying.
  const valid = choice === NEW_GROUP || targets.some((g) => g.id === choice);
  const groupId = valid && choice !== null ? choice : (targets[0]?.id ?? NEW_GROUP);
  const isNew = groupId === NEW_GROUP;

  return (
    <form
      className="space-y-1.5 pt-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (isNew && !name.trim()) return;
        dispatch({
          type: "role/move-direct-to-group",
          roleId: role.id,
          target: isNew ? { name: name.trim() } : { groupId },
        });
      }}
    >
      <div className="flex flex-wrap gap-1.5">
        <select value={groupId} onChange={(e) => setChoice(e.target.value)} className={INPUT}>
          {targets.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
          <option value={NEW_GROUP}>New group…</option>
        </select>
        {isNew && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New group name"
            className={INPUT}
          />
        )}
        <Button type="submit" variant="primary" disabled={isNew && !name.trim()}>
          Move {users.length} into group
        </Button>
      </div>
      <p className="text-[11px] text-ink-faint">
        Replaces each pin with membership of a group that confers exactly {role.name}&apos;s
        permissions, so nobody&apos;s access changes. Groups that would confer more are not offered.
      </p>
    </form>
  );
}
