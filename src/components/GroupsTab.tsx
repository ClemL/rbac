"use client";

import { useState } from "react";

import { isSensitive } from "@/lib/permissions";
import {
  effectiveMembers,
  findGroup,
  groupPermissions,
  wouldCreateCycle,
} from "@/lib/rbac";
import { useDirectory, useDispatch, useSelected } from "@/lib/store";
import type { Group } from "@/lib/types";
import { Button, Chip, EmptyState, Field, ListRow, Panel } from "./ui";

export function GroupsTab() {
  const { dir } = useDirectory();
  const dispatch = useDispatch();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const selected = useSelected("group", dir.groups);

  return (
    <div className="grid grid-cols-1 gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[280px_1fr]">
      <Panel
        title="Groups"
        subtitle={`${dir.groups.length} groups`}
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
              dispatch({ type: "group/create", name: name.trim(), description: "" });
              setName("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs outline-none focus:border-accent"
            />
            <Button type="submit" variant="primary">
              Add
            </Button>
          </form>
        )}
        <ul className="divide-y divide-line-soft">
          {dir.groups.map((group) => {
            const members = effectiveMembers(dir, group.id).length;
            return (
              <ListRow
                key={group.id}
                selected={group.id === selected?.id}
                onSelect={() => dispatch({ type: "select", kind: "group", id: group.id })}
              >
                <>
                  <div className="truncate text-[13px] font-medium">{group.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Chip tone="muted">
                      {members} member{members === 1 ? "" : "s"}
                    </Chip>
                    <Chip tone="muted">
                      {group.roleIds.length} role{group.roleIds.length === 1 ? "" : "s"}
                    </Chip>
                    {group.memberOf.length > 0 && <Chip tone="accent">nested</Chip>}
                  </div>
                </>
              </ListRow>
            );
          })}
        </ul>
      </Panel>

      {selected ? <GroupDetail group={selected} /> : <Panel><EmptyState>No groups.</EmptyState></Panel>}
    </div>
  );
}

function GroupDetail({ group }: { group: Group }) {
  const { dir } = useDirectory();
  const dispatch = useDispatch();

  const directMembers = dir.users.filter((u) => u.groupIds.includes(group.id));
  const allMembers = effectiveMembers(dir, group.id);
  const inheritedMembers = allMembers.filter((u) => !u.groupIds.includes(group.id));
  const conferred = [...groupPermissions(dir, group.id)].sort();
  const children = dir.groups.filter((g) => g.memberOf.includes(group.id));

  return (
    <Panel
      title={group.name}
      subtitle={group.description}
      actions={
        <Button variant="danger" onClick={() => dispatch({ type: "group/delete", groupId: group.id })}>
          Delete
        </Button>
      }
      bodyClassName="p-4 space-y-5"
      className="lg:min-h-0"
    >
      <Field label="Roles granted to members">
        <div className="flex flex-wrap gap-1">
          {dir.roles.map((role) => {
            const held = group.roleIds.includes(role.id);
            return (
              <Chip
                key={role.id}
                tone={held ? "accent" : "muted"}
                onClick={() =>
                  dispatch({
                    type: held ? "group/revoke-role" : "group/grant-role",
                    groupId: group.id,
                    roleId: role.id,
                  })
                }
              >
                {held ? "✓ " : "+ "}
                {role.name}
              </Chip>
            );
          })}
        </div>
      </Field>

      <Field label="This group is a member of">
        <div className="flex flex-wrap gap-1">
          {dir.groups
            .filter((g) => g.id !== group.id)
            .map((parent) => {
              const nested = group.memberOf.includes(parent.id);
              const blocked = !nested && wouldCreateCycle(dir, group.id, parent.id);
              return (
                <Chip
                  key={parent.id}
                  tone={nested ? "warn" : "muted"}
                  title={
                    blocked
                      ? "Blocked: this would create a membership loop"
                      : nested
                        ? `Members of ${group.name} inherit ${parent.name}'s roles`
                        : "Click to nest"
                  }
                  onClick={
                    blocked
                      ? undefined
                      : () =>
                          dispatch({
                            type: nested ? "group/unnest" : "group/nest",
                            childId: group.id,
                            parentId: parent.id,
                          })
                  }
                >
                  {nested ? "↑ " : blocked ? "⦸ " : "+ "}
                  {parent.name}
                </Chip>
              );
            })}
        </div>
        <p className="text-[11px] text-ink-faint">
          Nesting flows access downward: everyone in {group.name} inherits the roles of every group
          listed above.
        </p>
      </Field>

      {children.length > 0 && (
        <Field label="Groups nested inside this one">
          <div className="flex flex-wrap gap-1">
            {children.map((child) => (
              <Chip key={child.id} tone="warn">
                ↓ {child.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      <Field label={`Members — ${allMembers.length} effective, ${directMembers.length} direct`}>
        <div className="flex flex-wrap gap-1">
          {dir.users.map((user) => {
            const direct = user.groupIds.includes(group.id);
            const inherited = !direct && allMembers.some((m) => m.id === user.id);
            return (
              <Chip
                key={user.id}
                tone={direct ? "accent" : inherited ? "warn" : "muted"}
                title={inherited ? "Inherited through nesting — edit the nesting to change" : undefined}
                onClick={
                  inherited
                    ? undefined
                    : () =>
                        dispatch({
                          type: direct ? "user/leave-group" : "user/join-group",
                          userId: user.id,
                          groupId: group.id,
                        })
                }
              >
                {direct ? "✓ " : inherited ? "↳ " : "+ "}
                {user.name}
              </Chip>
            );
          })}
        </div>
        {inheritedMembers.length > 0 && (
          <p className="text-[11px] text-ink-faint">
            {inheritedMembers.map((u) => u.name).join(", ")} arrive through a nested group, not a
            direct membership.
          </p>
        )}
      </Field>

      <Field label={`Permissions conferred — ${conferred.length}`}>
        {conferred.length === 0 ? (
          <p className="text-xs text-ink-faint">This group grants nothing.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {conferred.map((p) => (
              <Chip key={p} mono tone={isSensitive(p) ? "warn" : "neutral"}>
                {p}
              </Chip>
            ))}
          </div>
        )}
        {group.memberOf.length > 0 && (
          <p className="text-[11px] text-ink-faint">
            Includes roles inherited from{" "}
            {group.memberOf.map((id) => findGroup(dir, id)?.name).join(", ")}.
          </p>
        )}
      </Field>
    </Panel>
  );
}
