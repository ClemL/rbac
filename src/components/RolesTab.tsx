"use client";

import { useState } from "react";

import { permissionsForResource, RESOURCES } from "@/lib/permissions";
import { effectiveMembers } from "@/lib/rbac";
import { useDirectory, useDispatch, useSelected } from "@/lib/store";
import type { Role } from "@/lib/types";
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

      {selected ? <RoleDetail role={selected} /> : <Panel><EmptyState>No roles.</EmptyState></Panel>}
    </div>
  );
}

function RoleDetail({ role }: { role: Role }) {
  const { dir } = useDirectory();
  const dispatch = useDispatch();

  const groups = dir.groups.filter((g) => g.roleIds.includes(role.id));
  const directUsers = dir.users.filter((u) => u.roleIds.includes(role.id));
  const reached = new Set<string>(directUsers.map((u) => u.id));
  for (const g of groups) for (const m of effectiveMembers(dir, g.id)) reached.add(m.id);

  return (
    <Panel
      title={role.name}
      subtitle={role.description}
      actions={
        <Button variant="danger" onClick={() => dispatch({ type: "role/delete", roleId: role.id })}>
          Delete
        </Button>
      }
      bodyClassName="p-4 space-y-5"
      className="lg:min-h-0"
    >
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
          <div className="flex flex-wrap gap-1">
            {directUsers.map((u) => (
              <Chip key={u.id} tone="warn">
                {u.name}
              </Chip>
            ))}
          </div>
        )}
      </Field>
    </Panel>
  );
}
