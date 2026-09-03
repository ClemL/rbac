"use client";

import { useState } from "react";

import { isSensitive, SOD_CONFLICTS } from "@/lib/permissions";
import {
  describePath,
  effectivePermissions,
  expandedGroups,
  findGroup,
  grantsByPermission,
  sensitiveCount,
} from "@/lib/rbac";
import { useDirectory, useDispatch, useSelected } from "@/lib/store";
import type { User } from "@/lib/types";
import { Button, Chip, EmptyState, Field, ListRow, Panel, StatusDot } from "./ui";

export function UsersTab() {
  const { dir } = useDirectory();
  const dispatch = useDispatch();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const selected = useSelected("user", dir.users);

  return (
    <div className="grid grid-cols-1 gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[280px_1fr]">
      <Panel
        title="Accounts"
        subtitle={`${dir.users.length} users`}
        actions={
          <Button onClick={() => setAdding((a) => !a)} variant="subtle">
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
              if (!newName.trim()) return;
              dispatch({ type: "user/create", name: newName.trim(), title: "Unassigned" });
              setNewName("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name"
              className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs outline-none focus:border-accent"
            />
            <Button type="submit" variant="primary">
              Add
            </Button>
          </form>
        )}
        <ul className="divide-y divide-line-soft">
          {dir.users.map((user) => (
            <UserRow key={user.id} user={user} selected={user.id === selected?.id} />
          ))}
        </ul>
      </Panel>

      {selected ? <UserDetail user={selected} /> : <Panel><EmptyState>No accounts.</EmptyState></Panel>}
    </div>
  );
}

function UserRow({ user, selected }: { user: User; selected: boolean }) {
  const { dir } = useDirectory();
  const dispatch = useDispatch();
  const perms = effectivePermissions(dir, user.id);
  const sensitive = sensitiveCount(dir, user.id);
  const conflict = SOD_CONFLICTS.some((c) => perms.has(c.a) && perms.has(c.b));

  return (
    <ListRow
      selected={selected}
      onSelect={() => dispatch({ type: "select", kind: "user", id: user.id })}
    >
      <>
        <div className="flex items-center gap-1.5">
          <StatusDot active={user.status === "active"} />
          <span className="truncate text-[13px] font-medium">{user.name}</span>
          {conflict && <span title="Segregation-of-duties conflict">⚠️</span>}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-ink-faint">{user.title}</div>
        <div className="mt-1 flex gap-1">
          <Chip tone="muted">
            {perms.size} perm{perms.size === 1 ? "" : "s"}
          </Chip>
          {sensitive > 0 && <Chip tone="warn">{sensitive} sensitive</Chip>}
        </div>
      </>
    </ListRow>
  );
}

function UserDetail({ user }: { user: User }) {
  const { dir } = useDirectory();
  const dispatch = useDispatch();

  const expanded = expandedGroups(dir, user.id);
  const inherited = [...expanded.entries()].filter(([id]) => !user.groupIds.includes(id));
  const byPermission = grantsByPermission(dir, user.id);
  const effective = effectivePermissions(dir, user.id);
  const conflicts = SOD_CONFLICTS.filter((c) => effective.has(c.a) && effective.has(c.b));

  return (
    <Panel
      title={user.name}
      subtitle={`${user.title} · ${user.email}`}
      actions={
        <>
          <Button
            variant={user.status === "active" ? "ghost" : "subtle"}
            onClick={() =>
              dispatch({
                type: "user/status",
                userId: user.id,
                status: user.status === "active" ? "suspended" : "active",
              })
            }
          >
            {user.status === "active" ? "Suspend" : "Reactivate"}
          </Button>
          <Button variant="danger" onClick={() => dispatch({ type: "user/delete", userId: user.id })}>
            Delete
          </Button>
        </>
      }
      bodyClassName="p-4 space-y-5"
      className="lg:min-h-0"
    >
      {user.status === "suspended" && (
        <p className="rounded-md border border-warn/30 bg-warn/8 px-3 py-2 text-xs text-warn">
          Account suspended. The directory still grants {byPermission.size} permissions on paper —
          reactivating restores them all.
        </p>
      )}

      {conflicts.map((c) => (
        <p
          key={c.a + c.b}
          className="rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-xs text-danger"
        >
          Segregation-of-duties conflict: {c.label} ({c.a} + {c.b}).
        </p>
      ))}

      <Field label="Group membership">
        <div className="grid gap-1 sm:grid-cols-2">
          {dir.groups.map((group) => {
            const direct = user.groupIds.includes(group.id);
            return (
              <label
                key={group.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-line-soft bg-surface-2 px-2 py-1.5 text-xs hover:border-line"
              >
                <input
                  type="checkbox"
                  checked={direct}
                  onChange={() =>
                    dispatch({
                      type: direct ? "user/leave-group" : "user/join-group",
                      userId: user.id,
                      groupId: group.id,
                    })
                  }
                  className="accent-[var(--color-accent)]"
                />
                <span className="truncate">{group.name}</span>
              </label>
            );
          })}
        </div>
        {inherited.length > 0 && (
          <p className="pt-1 text-[11px] text-ink-faint">
            Also effectively in{" "}
            {inherited.map(([id], i) => (
              <span key={id}>
                {i > 0 && ", "}
                <span className="text-ink-muted">{findGroup(dir, id)?.name}</span>
              </span>
            ))}{" "}
            through nesting.
          </p>
        )}
      </Field>

      <Field label="Roles pinned directly to this account">
        <div className="flex flex-wrap gap-1">
          {dir.roles.map((role) => {
            const held = user.roleIds.includes(role.id);
            return (
              <Chip
                key={role.id}
                tone={held ? "accent" : "muted"}
                onClick={() =>
                  dispatch({
                    type: held ? "user/revoke-role" : "user/grant-role",
                    userId: user.id,
                    roleId: role.id,
                  })
                }
                title={held ? "Click to remove" : "Click to assign directly"}
              >
                {held ? "✓ " : "+ "}
                {role.name}
              </Chip>
            );
          })}
        </div>
        <p className="text-[11px] text-ink-faint">
          Direct assignments bypass group governance. Most tenants treat them as exceptions.
        </p>
      </Field>

      <Field label={`Effective access — ${effective.size} permission${effective.size === 1 ? "" : "s"}`}>
        {byPermission.size === 0 ? (
          <p className="text-xs text-ink-faint">No access. This account can do nothing.</p>
        ) : (
          <ul className="divide-y divide-line-soft overflow-hidden rounded-md border border-line-soft">
            {[...byPermission.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([permission, grants]) => (
                <li key={permission} className="flex items-start gap-3 bg-surface-2 px-2.5 py-1.5">
                  <span
                    className={`w-40 shrink-0 font-mono text-[11px] ${
                      user.status === "suspended"
                        ? "text-ink-faint line-through"
                        : isSensitive(permission)
                          ? "text-warn"
                          : "text-ink"
                    }`}
                  >
                    {permission}
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    {grants.map((grant, i) => (
                      <span key={i} className="block truncate text-[11px] text-ink-faint">
                        {describePath(dir, grant)}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Field>
    </Panel>
  );
}
