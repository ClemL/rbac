import { isSensitive, SOD_CONFLICTS } from "./permissions";
import type { Directory, Group, PermissionKey, Role, User } from "./types";

export interface Grant {
  permission: PermissionKey;
  roleId: string;
  /** Chain of groups from the one the user sits in up to the one holding the role. Null = direct assignment. */
  groupPath: string[] | null;
}

export function findUser(dir: Directory, id: string): User | undefined {
  return dir.users.find((u) => u.id === id);
}
export function findGroup(dir: Directory, id: string): Group | undefined {
  return dir.groups.find((g) => g.id === id);
}
export function findRole(dir: Directory, id: string): Role | undefined {
  return dir.roles.find((r) => r.id === id);
}

/**
 * Every group a user is effectively in, mapped to the shortest membership chain
 * that gets them there. Direct memberships map to a single-element path.
 */
export function expandedGroups(dir: Directory, userId: string): Map<string, string[]> {
  const user = findUser(dir, userId);
  const out = new Map<string, string[]>();
  if (!user) return out;

  const queue: string[][] = user.groupIds.map((id) => [id]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (out.has(current)) continue;
    const group = findGroup(dir, current);
    if (!group) continue;
    out.set(current, path);
    for (const parent of group.memberOf) {
      if (!path.includes(parent)) queue.push([...path, parent]);
    }
  }
  return out;
}

/** Groups reachable upward from a group, i.e. whose roles it inherits. */
export function ancestorGroups(dir: Directory, groupId: string): Set<string> {
  const seen = new Set<string>();
  const stack = [...(findGroup(dir, groupId)?.memberOf ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(findGroup(dir, id)?.memberOf ?? []));
  }
  return seen;
}

/** True when making `childId` a member of `parentId` would close a loop. */
export function wouldCreateCycle(dir: Directory, childId: string, parentId: string): boolean {
  if (childId === parentId) return true;
  return ancestorGroups(dir, parentId).has(childId) || parentId === childId;
}

/** Users who land in a group either directly or through nesting. */
export function effectiveMembers(dir: Directory, groupId: string): User[] {
  return dir.users.filter((u) => expandedGroups(dir, u.id).has(groupId));
}

/** Every grant behind a user's access, with the path that produced it. */
export function grantsForUser(dir: Directory, userId: string): Grant[] {
  const user = findUser(dir, userId);
  if (!user) return [];
  const grants: Grant[] = [];

  for (const roleId of user.roleIds) {
    for (const permission of findRole(dir, roleId)?.permissions ?? []) {
      grants.push({ permission, roleId, groupPath: null });
    }
  }
  for (const [groupId, path] of expandedGroups(dir, userId)) {
    for (const roleId of findGroup(dir, groupId)?.roleIds ?? []) {
      for (const permission of findRole(dir, roleId)?.permissions ?? []) {
        grants.push({ permission, roleId, groupPath: path });
      }
    }
  }
  return grants;
}

/** What the directory grants on paper, ignoring account status. */
export function grantedPermissions(dir: Directory, userId: string): Set<PermissionKey> {
  return new Set(grantsForUser(dir, userId).map((g) => g.permission));
}

/** What the user can actually do right now. A suspended account can do nothing. */
export function effectivePermissions(dir: Directory, userId: string): Set<PermissionKey> {
  const user = findUser(dir, userId);
  if (!user || user.status === "suspended") return new Set();
  return grantedPermissions(dir, userId);
}

export function grantsByPermission(dir: Directory, userId: string): Map<PermissionKey, Grant[]> {
  const map = new Map<PermissionKey, Grant[]>();
  for (const grant of grantsForUser(dir, userId)) {
    const list = map.get(grant.permission);
    if (list) list.push(grant);
    else map.set(grant.permission, [grant]);
  }
  return map;
}

export function sensitiveCount(dir: Directory, userId: string): number {
  return [...effectivePermissions(dir, userId)].filter(isSensitive).length;
}

export interface SodViolation {
  userId: string;
  label: string;
  a: PermissionKey;
  b: PermissionKey;
}

export function sodViolations(dir: Directory): SodViolation[] {
  const out: SodViolation[] = [];
  for (const user of dir.users) {
    const perms = effectivePermissions(dir, user.id);
    for (const conflict of SOD_CONFLICTS) {
      if (perms.has(conflict.a) && perms.has(conflict.b)) {
        out.push({ userId: user.id, label: conflict.label, a: conflict.a, b: conflict.b });
      }
    }
  }
  return out;
}

/** Roles that no user or group references. Dead weight in a real directory. */
export function orphanRoles(dir: Directory): Role[] {
  return dir.roles.filter(
    (role) =>
      !dir.users.some((u) => u.roleIds.includes(role.id)) &&
      !dir.groups.some((g) => g.roleIds.includes(role.id)),
  );
}

export function describePath(dir: Directory, grant: Grant): string {
  const role = findRole(dir, grant.roleId)?.name ?? grant.roleId;
  if (!grant.groupPath) return `Direct assignment → ${role}`;
  const names = grant.groupPath.map((id) => findGroup(dir, id)?.name ?? id);
  return `${names.join(" → ")} → ${role}`;
}

/** Everything a group confers on its members, including roles inherited from parent groups. */
export function groupPermissions(dir: Directory, groupId: string): Set<PermissionKey> {
  const out = new Set<PermissionKey>();
  const ids = [groupId, ...ancestorGroups(dir, groupId)];
  for (const id of ids) {
    for (const roleId of findGroup(dir, id)?.roleIds ?? []) {
      for (const permission of findRole(dir, roleId)?.permissions ?? []) out.add(permission);
    }
  }
  return out;
}
