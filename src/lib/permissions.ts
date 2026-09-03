import type { ActionId, PermissionDef, PermissionKey, ResourceId } from "./types";

export const RESOURCES: { id: ResourceId; label: string; blurb: string }[] = [
  { id: "patients", label: "Patients", blurb: "Patient demographics and clinical records" },
  { id: "claims", label: "Claims", blurb: "Payer claims and adjudication" },
  { id: "invoices", label: "Invoices", blurb: "Billing documents and payment runs" },
  { id: "reports", label: "Reports", blurb: "Operational and financial reporting" },
  { id: "users", label: "Users", blurb: "Accounts in the admin console" },
  { id: "settings", label: "Settings", blurb: "Tenant configuration and integrations" },
];

const RAW: [ResourceId, ActionId, boolean][] = [
  ["patients", "read", false],
  ["patients", "create", false],
  ["patients", "update", false],
  ["patients", "delete", true],
  ["patients", "export", true],
  ["claims", "read", false],
  ["claims", "create", false],
  ["claims", "update", false],
  ["claims", "approve", false],
  ["invoices", "read", false],
  ["invoices", "create", false],
  ["invoices", "update", false],
  ["invoices", "approve", false],
  ["invoices", "export", true],
  ["reports", "read", false],
  ["reports", "export", true],
  ["users", "read", false],
  ["users", "create", false],
  ["users", "update", false],
  ["users", "delete", true],
  ["settings", "read", false],
  ["settings", "update", true],
];

const ACTION_LABEL: Record<ActionId, string> = {
  read: "Read",
  create: "Create",
  update: "Update",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
};

export const PERMISSIONS: PermissionDef[] = RAW.map(([resource, action, sensitive]) => ({
  key: `${resource}:${action}`,
  resource,
  action,
  label: `${ACTION_LABEL[action]} ${resource}`,
  sensitive,
}));

export const PERMISSION_BY_KEY = new Map<PermissionKey, PermissionDef>(
  PERMISSIONS.map((p) => [p.key, p]),
);

export function permissionsForResource(resource: ResourceId): PermissionDef[] {
  return PERMISSIONS.filter((p) => p.resource === resource);
}

export function isSensitive(key: PermissionKey): boolean {
  return PERMISSION_BY_KEY.get(key)?.sensitive ?? false;
}

export function resourceOf(key: PermissionKey): ResourceId {
  return key.split(":")[0] as ResourceId;
}

/**
 * Pairs of permissions that must never land on the same person.
 * Classic segregation-of-duties: whoever raises the money can't also release it.
 */
export const SOD_CONFLICTS: { a: PermissionKey; b: PermissionKey; label: string }[] = [
  {
    a: "invoices:create",
    b: "invoices:approve",
    label: "Creating and approving invoices",
  },
];
