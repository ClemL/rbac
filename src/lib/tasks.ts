import {
  effectivePermissions,
  expandedGroups,
  findGroup,
  findRole,
  findUser,
  groupPermissions,
} from "./rbac";
import { SEED_GROUP_IDS } from "./seed";
import type { Directory, PermissionKey } from "./types";

export interface Check {
  id: string;
  label: string;
  test: (dir: Directory) => boolean;
}

export interface Mission {
  id: string;
  title: string;
  category: string;
  difficulty: "Starter" | "Core" | "Advanced";
  brief: string;
  hint: string;
  checks: Check[];
}

const can = (dir: Directory, userId: string, perm: PermissionKey) =>
  effectivePermissions(dir, userId).has(perm);

const permList = (dir: Directory, userId: string) => [...effectivePermissions(dir, userId)].sort();

const sameSet = (dir: Directory, userId: string, expected: PermissionKey[]) => {
  const actual = permList(dir, userId);
  return actual.length === expected.length && expected.slice().sort().every((p, i) => actual[i] === p);
};

const inGroup = (dir: Directory, userId: string, groupId: string) =>
  expandedGroups(dir, userId).has(groupId);

export const MISSIONS: Mission[] = [
  {
    id: "m1-onboard",
    title: "Onboard the new nurse",
    category: "Provisioning",
    difficulty: "Starter",
    brief:
      "Dana Whitfield starts on the med-surg floor Monday and has no access at all. Give her exactly what a Clinical Nurse needs — no more — and do it through group membership so her access is managed by her team, not pinned to her account.",
    hint: "Clinical Staff already carries the Clinical Nurse role. Adding Dana there grants all three permissions at once; a direct role assignment would pass the permission checks but fail the governance check.",
    checks: [
      {
        id: "reads",
        label: "Dana can read patients",
        test: (d) => can(d, "u-dana", "patients:read"),
      },
      {
        id: "updates",
        label: "Dana can update patients",
        test: (d) => can(d, "u-dana", "patients:update"),
      },
      {
        id: "claims",
        label: "Dana can read claims",
        test: (d) => can(d, "u-dana", "claims:read"),
      },
      {
        id: "no-direct",
        label: "Dana has no directly assigned roles",
        test: (d) => (findUser(d, "u-dana")?.roleIds.length ?? 1) === 0,
      },
      {
        id: "nothing-extra",
        label: "Dana holds nothing beyond the nurse permission set",
        test: (d) => sameSet(d, "u-dana", ["patients:read", "patients:update", "claims:read"]),
      },
    ],
  },
  {
    id: "m2-offboard",
    title: "Offboard a departed employee",
    category: "Deprovisioning",
    difficulty: "Starter",
    brief:
      "Marcus Reyes resigned on Friday. HR needs his account retained for the seven-year audit window, so it must not be deleted — but every path to access has to be closed, including the Platform Admin role somebody pinned directly to his account.",
    hint: "Suspending alone is reversible by any admin. Strip memberships and direct roles as well, then suspend, so reactivating the account grants nothing on its own.",
    checks: [
      {
        id: "exists",
        label: "Account still exists (audit retention)",
        test: (d) => !!findUser(d, "u-marcus"),
      },
      {
        id: "suspended",
        label: "Account is suspended",
        test: (d) => findUser(d, "u-marcus")?.status === "suspended",
      },
      {
        id: "no-groups",
        label: "No group memberships remain",
        test: (d) => (findUser(d, "u-marcus")?.groupIds.length ?? 1) === 0,
      },
      {
        id: "no-roles",
        label: "No direct role assignments remain",
        test: (d) => (findUser(d, "u-marcus")?.roleIds.length ?? 1) === 0,
      },
    ],
  },
  {
    id: "m3-least-privilege",
    title: "Trim an over-permissioned role",
    category: "Least privilege",
    difficulty: "Core",
    brief:
      "An access review flagged the Billing Analyst role: it carries the ability to delete patient records, which no one on revenue cycle has ever needed. Remove what does not belong without weakening the role's actual billing function or unassigning it from the Billing group.",
    hint: "Edit the role itself in the Roles tab. Billing analysts still need invoice, claim, and reporting access — remove only the patient permission.",
    checks: [
      {
        id: "role-exists",
        label: "Billing Analyst role still exists",
        test: (d) => !!findRole(d, "role-billing-analyst"),
      },
      {
        id: "no-patients",
        label: "Role carries no patient permissions",
        test: (d) =>
          !(findRole(d, "role-billing-analyst")?.permissions ?? []).some((p) =>
            p.startsWith("patients:"),
          ),
      },
      {
        id: "keeps-billing",
        label: "Role keeps its invoice, claim and reporting permissions",
        test: (d) => {
          const perms = new Set(findRole(d, "role-billing-analyst")?.permissions ?? []);
          return ["invoices:read", "invoices:create", "claims:read", "claims:update", "reports:read"].every(
            (p) => perms.has(p),
          );
        },
      },
      {
        id: "still-assigned",
        label: "Billing group still grants the role",
        test: (d) => !!findGroup(d, "grp-billing")?.roleIds.includes("role-billing-analyst"),
      },
    ],
  },
  {
    id: "m4-sod",
    title: "Resolve a segregation-of-duties conflict",
    category: "Segregation of duties",
    difficulty: "Core",
    brief:
      "Internal audit found that Aisha Rahman can both raise an invoice and approve it — a control failure worth a finding. Break the conflict without removing her from the revenue cycle entirely, and without disturbing Tom Okafor's approval authority or the Billing group's ability to raise invoices.",
    hint: "Aisha sits in two groups whose roles overlap on invoices. Pick the one that matches her job title and drop the other; she keeps a real function either way.",
    checks: [
      {
        id: "no-conflict",
        label: "No user can both create and approve invoices",
        test: (d) =>
          !d.users.some((u) => {
            const perms = effectivePermissions(d, u.id);
            return perms.has("invoices:create") && perms.has("invoices:approve");
          }),
      },
      {
        id: "aisha-keeps",
        label: "Aisha keeps one side of the invoice workflow",
        test: (d) => can(d, "u-aisha", "invoices:create") || can(d, "u-aisha", "invoices:approve"),
      },
      {
        id: "tom-keeps",
        label: "Tom still approves invoices",
        test: (d) => can(d, "u-tom", "invoices:approve"),
      },
      {
        id: "billing-keeps",
        label: "Billing group still confers invoice creation",
        test: (d) => groupPermissions(d, "grp-billing").has("invoices:create"),
      },
    ],
  },
  {
    id: "m5-contractor",
    title: "Scope an external contractor",
    category: "Provisioning",
    difficulty: "Core",
    brief:
      "Priya Nair is a contractor at Northwind Consulting, brought in for a six-week reporting engagement. She was dropped into Clinical Staff by mistake and can currently read patient charts. She needs read access to reports and nothing else. Build the contractor structures the tenant is missing rather than reusing an employee group.",
    hint: "Create a role holding only 'Read reports', create a contractor group that carries it, move Priya into that group, and take her out of Clinical Staff.",
    checks: [
      {
        id: "exact",
        label: "Priya holds exactly one permission: read reports",
        test: (d) => sameSet(d, "u-priya", ["reports:read"]),
      },
      {
        id: "active",
        label: "Priya's account is active",
        test: (d) => findUser(d, "u-priya")?.status === "active",
      },
      {
        id: "no-direct",
        label: "Access comes from a group, not a direct role assignment",
        test: (d) => (findUser(d, "u-priya")?.roleIds.length ?? 1) === 0,
      },
      {
        id: "own-group",
        label: "She sits in a purpose-built group, not an employee group",
        test: (d) => {
          const user = findUser(d, "u-priya");
          if (!user || user.groupIds.length === 0) return false;
          return ![...expandedGroups(d, "u-priya").keys()].some((g) => SEED_GROUP_IDS.includes(g));
        },
      },
    ],
  },
  {
    id: "m6-nesting",
    title: "Close a nested-group escalation",
    category: "Privilege escalation",
    difficulty: "Advanced",
    brief:
      "Ben Castellanos is a summer intern, yet he can change tenant settings and delete accounts. Nobody assigned him anything — the access arrives through group nesting. Fix the structure, not the symptom: Ben stays in Interns, and Lena Fischer keeps her admin access.",
    hint: "Open the Interns group and look at what it is a member of. Removing Ben from Interns hides the problem while leaving the escalation in place for the next intern.",
    checks: [
      {
        id: "no-nesting",
        label: "Interns no longer inherits from Platform Admins",
        test: (d) => !inGroupClosure(d, "grp-interns", "grp-platform-admins"),
      },
      {
        id: "ben-clean",
        label: "Ben cannot change settings or delete users",
        test: (d) => !can(d, "u-ben", "settings:update") && !can(d, "u-ben", "users:delete"),
      },
      {
        id: "ben-stays",
        label: "Ben is still a member of Interns",
        test: (d) => inGroup(d, "u-ben", "grp-interns"),
      },
      {
        id: "lena-keeps",
        label: "Lena keeps Platform Admin access",
        test: (d) => can(d, "u-lena", "settings:update"),
      },
    ],
  },
  {
    id: "m7-export",
    title: "Contain a sensitive export permission",
    category: "Data governance",
    difficulty: "Advanced",
    brief:
      "Policy states that patient export — bulk extraction of PHI — may only be held by Compliance. Nora Bell picked it up when someone pinned the Compliance Auditor role onto her help desk account. Bring the tenant back into policy without breaking Compliance's own workflow or Nora's help desk duties.",
    hint: "Two defensible fixes exist: remove the direct role from Nora, or move her into Compliance for real. Deleting the permission from the auditor role would break Sofia and is not one of them.",
    checks: [
      {
        id: "contained",
        label: "Everyone holding patient export is in Compliance",
        test: (d) =>
          d.users
            .filter((u) => effectivePermissions(d, u.id).has("patients:export"))
            .every((u) => inGroup(d, u.id, "grp-compliance")),
      },
      {
        id: "sofia-keeps",
        label: "Sofia can still export patient data",
        test: (d) => can(d, "u-sofia", "patients:export"),
      },
      {
        id: "compliance-intact",
        label: "Compliance group still confers report export",
        test: (d) => groupPermissions(d, "grp-compliance").has("reports:export"),
      },
      {
        id: "nora-works",
        label: "Nora keeps her help desk access",
        test: (d) => can(d, "u-nora", "users:update") && can(d, "u-nora", "users:read"),
      },
    ],
  },
];

function inGroupClosure(dir: Directory, childId: string, ancestorId: string): boolean {
  const seen = new Set<string>();
  const stack = [...(findGroup(dir, childId)?.memberOf ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === ancestorId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(findGroup(dir, id)?.memberOf ?? []));
  }
  return false;
}

export interface MissionResult {
  mission: Mission;
  checks: { id: string; label: string; pass: boolean }[];
  passed: number;
  total: number;
  complete: boolean;
}

export function evaluateMissions(dir: Directory): MissionResult[] {
  return MISSIONS.map((mission) => {
    const checks = mission.checks.map((c) => ({
      id: c.id,
      label: c.label,
      pass: safeTest(c, dir),
    }));
    const passed = checks.filter((c) => c.pass).length;
    return {
      mission,
      checks,
      passed,
      total: checks.length,
      complete: passed === checks.length,
    };
  });
}

function safeTest(check: Check, dir: Directory): boolean {
  try {
    return check.test(dir);
  } catch {
    return false;
  }
}
