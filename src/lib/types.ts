export type ResourceId =
  | "patients"
  | "claims"
  | "invoices"
  | "reports"
  | "users"
  | "settings";

export type ActionId =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "export";

/** Permission key, always `${resource}:${action}` — e.g. "invoices:approve". */
export type PermissionKey = string;

export interface PermissionDef {
  key: PermissionKey;
  resource: ResourceId;
  action: ActionId;
  label: string;
  /** Sensitive permissions are highlighted and drive risk scoring. */
  sensitive: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  /** Seeded roles cannot be deleted, only edited. */
  builtIn: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  /** Roles granted to every effective member of this group. */
  roleIds: string[];
  /** Groups this group is a member of. Members inherit the parents' roles. */
  memberOf: string[];
  builtIn: boolean;
}

export type UserStatus = "active" | "suspended";

export interface User {
  id: string;
  name: string;
  title: string;
  email: string;
  status: UserStatus;
  groupIds: string[];
  /** Roles pinned straight onto the account, bypassing groups. */
  roleIds: string[];
  builtIn: boolean;
}

export interface Directory {
  users: User[];
  groups: Group[];
  roles: Role[];
}

export interface LogEntry {
  id: number;
  at: number;
  message: string;
  kind: "mutation" | "task" | "system";
}
