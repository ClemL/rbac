import { ancestorGroups, findGroup, findRole, groupPermissions, slug } from "./rbac";
import type { Directory, Group, PermissionKey, Role, User } from "./types";

/*
 * Redesign operations restructure the directory without changing what anyone can do. Each one
 * leaves every account's granted and effective permissions exactly as it found them, so the
 * access decision that usually follows — revoking a split-off role where it does not belong —
 * stays a separate, deliberate step that the reviews can grade.
 */

/** Accounts that hold a role by direct assignment rather than through a group. */
export function directHolders(dir: Directory, roleId: string): User[] {
  return dir.users.filter((u) => u.roleIds.includes(roleId));
}

/** Why a split cannot go ahead, or null when it can. */
export function splitBlocker(role: Role, permissions: PermissionKey[], name: string): string | null {
  const moving = new Set(permissions);
  if (moving.size === 0) return "Pick the permissions to move into the new role.";
  if ([...moving].some((p) => !role.permissions.includes(p))) {
    return `${role.name} does not hold every permission picked.`;
  }
  if (moving.size >= new Set(role.permissions).size) {
    return `Leave at least one permission in ${role.name}.`;
  }
  if (!name.trim()) return "Name the new role.";
  return null;
}

export interface SplitResult {
  source: Role;
  role: Role;
  /** Groups and accounts that held the source role and now hold both halves. */
  groups: Group[];
  users: User[];
}

/**
 * Moves some of a role's permissions into a new role and grants the new role everywhere the
 * original was granted. Nobody gains or loses anything; the two halves can now be revoked
 * independently.
 */
export function splitRole(
  dir: Directory,
  roleId: string,
  permissions: PermissionKey[],
  name: string,
): SplitResult | null {
  const source = findRole(dir, roleId);
  if (!source || splitBlocker(source, permissions, name) !== null) return null;

  const moving = new Set(permissions);
  const role: Role = {
    id: slug("role", name.trim(), new Set(dir.roles.map((r) => r.id))),
    name: name.trim(),
    description: `Split from ${source.name}.`,
    permissions: source.permissions.filter((p) => moving.has(p)),
    builtIn: false,
  };
  source.permissions = source.permissions.filter((p) => !moving.has(p));
  dir.roles.push(role);

  const groups = dir.groups.filter((g) => g.roleIds.includes(source.id));
  const users = directHolders(dir, source.id);
  for (const holder of [...groups, ...users]) holder.roleIds.push(role.id);
  return { source, role, groups, users };
}

/**
 * Groups that confer a role — held directly or inherited from a parent — and nothing beyond its
 * permissions. Joining one is a like-for-like replacement for a direct assignment of the role.
 */
export function equivalentGroups(dir: Directory, roleId: string): Group[] {
  const role = findRole(dir, roleId);
  if (!role) return [];
  const wanted = new Set(role.permissions);
  return dir.groups.filter((group) => {
    const carriers = [group.id, ...ancestorGroups(dir, group.id)];
    if (!carriers.some((id) => findGroup(dir, id)?.roleIds.includes(role.id))) return false;
    const conferred = groupPermissions(dir, group.id);
    return conferred.size === wanted.size && [...conferred].every((p) => wanted.has(p));
  });
}

/** An existing equivalent group, or a new group to create for the role. */
export type RegroupTarget = { groupId: string } | { name: string };

export interface RegroupResult {
  role: Role;
  group: Group;
  created: boolean;
  /** Accounts whose direct assignment became a membership. */
  users: User[];
}

/**
 * Replaces every direct assignment of a role with membership of a group conferring the same
 * access, turning the exception path into the governed one. The target is either an existing
 * equivalent group or a new group created to carry the role.
 */
export function moveDirectToGroup(
  dir: Directory,
  roleId: string,
  target: RegroupTarget,
): RegroupResult | null {
  const role = findRole(dir, roleId);
  const users = directHolders(dir, roleId);
  if (!role || users.length === 0) return null;

  let group: Group;
  let created = false;
  if ("groupId" in target) {
    const existing = equivalentGroups(dir, role.id).find((g) => g.id === target.groupId);
    if (!existing) return null;
    group = existing;
  } else {
    const name = target.name.trim();
    if (!name) return null;
    group = {
      id: slug("grp", name, new Set(dir.groups.map((g) => g.id))),
      name,
      description: `Carries ${role.name} for accounts that held it directly.`,
      roleIds: [role.id],
      memberOf: [],
      builtIn: false,
    };
    dir.groups.push(group);
    created = true;
  }

  for (const user of users) {
    user.roleIds = user.roleIds.filter((r) => r !== role.id);
    if (!user.groupIds.includes(group.id)) user.groupIds.push(group.id);
  }
  return { role, group, created, users };
}
