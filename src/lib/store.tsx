"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";

import { findGroup, findRole, findUser, wouldCreateCycle } from "./rbac";
import { seedDirectory } from "./seed";
import { evaluateMissions, MISSIONS, type MissionResult } from "./tasks";
import type { Directory, LogEntry, PermissionKey, UserStatus } from "./types";

export type Action =
  | { type: "reset" }
  | { type: "user/create"; name: string; title: string }
  | { type: "user/delete"; userId: string }
  | { type: "user/status"; userId: string; status: UserStatus }
  | { type: "user/join-group"; userId: string; groupId: string }
  | { type: "user/leave-group"; userId: string; groupId: string }
  | { type: "user/grant-role"; userId: string; roleId: string }
  | { type: "user/revoke-role"; userId: string; roleId: string }
  | { type: "group/create"; name: string; description: string }
  | { type: "group/delete"; groupId: string }
  | { type: "group/grant-role"; groupId: string; roleId: string }
  | { type: "group/revoke-role"; groupId: string; roleId: string }
  | { type: "group/nest"; childId: string; parentId: string }
  | { type: "group/unnest"; childId: string; parentId: string }
  | { type: "role/create"; name: string; description: string }
  | { type: "role/delete"; roleId: string }
  | { type: "role/toggle-permission"; roleId: string; permission: PermissionKey }
  | { type: "select"; kind: SelectionKind; id: string };

export type SelectionKind = "user" | "group" | "role";

export interface Selection {
  user: string | null;
  group: string | null;
  role: string | null;
}

export interface State {
  dir: Directory;
  /** Lives here rather than in the tabs so it survives tab switches and unmounts. */
  selection: Selection;
  log: LogEntry[];
  logId: number;
  actions: number;
  completed: string[];
  results: MissionResult[];
}

function slug(prefix: string, name: string, taken: Set<string>): string {
  const base = `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  let id = base || `${prefix}-new`;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

interface Mutation {
  /** Sentence for the activity log. */
  message: string;
  /** Newly created object to bring into focus. */
  select?: { kind: SelectionKind; id: string };
}

/** Applies a mutation to the directory and describes what changed. */
function apply(dir: Directory, action: Action): Mutation | null {
  switch (action.type) {
    case "user/create": {
      const id = slug("u", action.name, new Set(dir.users.map((u) => u.id)));
      dir.users.push({
        id,
        name: action.name,
        title: action.title || "Unassigned",
        email: `${action.name.toLowerCase().replace(/\s+/g, ".")}@meridian.example`,
        status: "active",
        groupIds: [],
        roleIds: [],
        builtIn: false,
      });
      return { message: `Created user ${action.name}`, select: { kind: "user", id } };
    }
    case "user/delete": {
      const user = findUser(dir, action.userId);
      if (!user) return null;
      dir.users = dir.users.filter((u) => u.id !== action.userId);
      return { message: `Deleted user ${user.name}` };
    }
    case "user/status": {
      const user = findUser(dir, action.userId);
      if (!user || user.status === action.status) return null;
      user.status = action.status;
      return { message: `${action.status === "suspended" ? "Suspended" : "Reactivated"} ${user.name}` };
    }
    case "user/join-group": {
      const user = findUser(dir, action.userId);
      const group = findGroup(dir, action.groupId);
      if (!user || !group || user.groupIds.includes(group.id)) return null;
      user.groupIds.push(group.id);
      return { message: `Added ${user.name} to ${group.name}` };
    }
    case "user/leave-group": {
      const user = findUser(dir, action.userId);
      const group = findGroup(dir, action.groupId);
      if (!user || !group || !user.groupIds.includes(group.id)) return null;
      user.groupIds = user.groupIds.filter((g) => g !== group.id);
      return { message: `Removed ${user.name} from ${group.name}` };
    }
    case "user/grant-role": {
      const user = findUser(dir, action.userId);
      const role = findRole(dir, action.roleId);
      if (!user || !role || user.roleIds.includes(role.id)) return null;
      user.roleIds.push(role.id);
      return { message: `Assigned ${role.name} directly to ${user.name}` };
    }
    case "user/revoke-role": {
      const user = findUser(dir, action.userId);
      const role = findRole(dir, action.roleId);
      if (!user || !role || !user.roleIds.includes(role.id)) return null;
      user.roleIds = user.roleIds.filter((r) => r !== role.id);
      return { message: `Removed direct role ${role.name} from ${user.name}` };
    }
    case "group/create": {
      const id = slug("grp", action.name, new Set(dir.groups.map((g) => g.id)));
      dir.groups.push({
        id,
        name: action.name,
        description: action.description || "Created by administrator.",
        roleIds: [],
        memberOf: [],
        builtIn: false,
      });
      return { message: `Created group ${action.name}`, select: { kind: "group", id } };
    }
    case "group/delete": {
      const group = findGroup(dir, action.groupId);
      if (!group) return null;
      dir.groups = dir.groups.filter((g) => g.id !== group.id);
      for (const g of dir.groups) g.memberOf = g.memberOf.filter((m) => m !== group.id);
      for (const u of dir.users) u.groupIds = u.groupIds.filter((g) => g !== group.id);
      return { message: `Deleted group ${group.name}` };
    }
    case "group/grant-role": {
      const group = findGroup(dir, action.groupId);
      const role = findRole(dir, action.roleId);
      if (!group || !role || group.roleIds.includes(role.id)) return null;
      group.roleIds.push(role.id);
      return { message: `Granted ${role.name} to ${group.name}` };
    }
    case "group/revoke-role": {
      const group = findGroup(dir, action.groupId);
      const role = findRole(dir, action.roleId);
      if (!group || !role || !group.roleIds.includes(role.id)) return null;
      group.roleIds = group.roleIds.filter((r) => r !== role.id);
      return { message: `Revoked ${role.name} from ${group.name}` };
    }
    case "group/nest": {
      const child = findGroup(dir, action.childId);
      const parent = findGroup(dir, action.parentId);
      if (!child || !parent) return null;
      if (child.memberOf.includes(parent.id)) return null;
      if (wouldCreateCycle(dir, child.id, parent.id)) return null;
      child.memberOf.push(parent.id);
      return { message: `Nested ${child.name} inside ${parent.name}` };
    }
    case "group/unnest": {
      const child = findGroup(dir, action.childId);
      const parent = findGroup(dir, action.parentId);
      if (!child || !parent || !child.memberOf.includes(parent.id)) return null;
      child.memberOf = child.memberOf.filter((m) => m !== parent.id);
      return { message: `Removed ${child.name} from ${parent.name}` };
    }
    case "role/create": {
      const id = slug("role", action.name, new Set(dir.roles.map((r) => r.id)));
      dir.roles.push({
        id,
        name: action.name,
        description: action.description || "Created by administrator.",
        permissions: [],
        builtIn: false,
      });
      return { message: `Created role ${action.name}`, select: { kind: "role", id } };
    }
    case "role/delete": {
      const role = findRole(dir, action.roleId);
      if (!role) return null;
      dir.roles = dir.roles.filter((r) => r.id !== role.id);
      for (const g of dir.groups) g.roleIds = g.roleIds.filter((r) => r !== role.id);
      for (const u of dir.users) u.roleIds = u.roleIds.filter((r) => r !== role.id);
      return { message: `Deleted role ${role.name}` };
    }
    case "role/toggle-permission": {
      const role = findRole(dir, action.roleId);
      if (!role) return null;
      const held = role.permissions.includes(action.permission);
      role.permissions = held
        ? role.permissions.filter((p) => p !== action.permission)
        : [...role.permissions, action.permission];
      return {
        message: `${held ? "Removed" : "Added"} ${action.permission} ${held ? "from" : "to"} ${role.name}`,
      };
    }
    default:
      return null;
  }
}

export function initialState(): State {
  const dir = seedDirectory();
  const results = evaluateMissions(dir);
  return {
    dir,
    selection: {
      user: dir.users[0]?.id ?? null,
      group: dir.groups[0]?.id ?? null,
      role: dir.roles[0]?.id ?? null,
    },
    log: [
      {
        id: 1,
        at: Date.now(),
        kind: "system",
        message: `Directory loaded. ${MISSIONS.length} access reviews are open.`,
      },
    ],
    logId: 2,
    actions: 0,
    completed: results.filter((r) => r.complete).map((r) => r.mission.id),
    results,
  };
}

function reducer(state: State, action: Action): State {
  if (action.type === "reset") return initialState();

  if (action.type === "select") {
    if (state.selection[action.kind] === action.id) return state;
    return { ...state, selection: { ...state.selection, [action.kind]: action.id } };
  }

  const dir = structuredClone(state.dir);
  const mutation = apply(dir, action);
  if (mutation === null) return state;
  const { message } = mutation;

  // A newly created object becomes the focused one, so the detail pane is ready to edit.
  const selection: Selection = mutation.select
    ? { ...state.selection, [mutation.select.kind]: mutation.select.id }
    : state.selection;

  // The whole point of the simulator: re-grade every open review after each change.
  const results = evaluateMissions(dir);
  const completed = results.filter((r) => r.complete).map((r) => r.mission.id);

  const entries: LogEntry[] = [];
  let logId = state.logId;
  const at = Date.now();
  entries.push({ id: logId++, at, kind: "mutation", message });

  for (const id of completed) {
    if (!state.completed.includes(id)) {
      const title = MISSIONS.find((m) => m.id === id)?.title ?? id;
      entries.push({ id: logId++, at, kind: "task", message: `Review passed — ${title}` });
    }
  }
  for (const id of state.completed) {
    if (!completed.includes(id)) {
      const title = MISSIONS.find((m) => m.id === id)?.title ?? id;
      entries.push({ id: logId++, at, kind: "task", message: `Review regressed — ${title}` });
    }
  }

  return {
    dir,
    selection,
    log: [...entries.reverse(), ...state.log].slice(0, 200),
    logId,
    actions: state.actions + 1,
    completed,
    results,
  };
}

const StateContext = createContext<State | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const value = useMemo(() => state, [state]);
  return (
    <StateContext.Provider value={value}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useDirectory(): State {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useDirectory must be used inside DirectoryProvider");
  return ctx;
}

/**
 * Resolves the focused object of a kind, falling back to the first row when the
 * selection was deleted or has not been set yet.
 */
export function useSelected<T extends { id: string }>(
  kind: SelectionKind,
  rows: T[],
): T | undefined {
  const { selection } = useDirectory();
  return rows.find((row) => row.id === selection[kind]) ?? rows[0];
}

export function useDispatch(): Dispatch<Action> {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error("useDispatch must be used inside DirectoryProvider");
  return ctx;
}
