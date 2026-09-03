import {
  ancestorGroups,
  effectivePermissions,
  expandedGroups,
  findGroup,
  findRole,
  findUser,
  grantedPermissions,
  groupPermissions,
  orphanRoles,
} from "./rbac";
import { SEED_GROUP_IDS, SEED_USER_IDS } from "./seed";
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


const isDormant = (user: { status: string }) => user.status === "suspended";

const isEntitled = (dir: Directory, userId: string) => {
  const granted = grantedPermissions(dir, userId);
  return granted.has("settings:update") && granted.has("users:delete");
};

const viaGroup = (user: { roleIds: string[]; groupIds: string[] }) =>
  user.roleIds.length === 0 && user.groupIds.length > 0;

/** Accounts the player created; the seeded ten are never break-glass candidates. */
const breakGlassCandidates = (dir: Directory) =>
  dir.users.filter((u) => !SEED_USER_IDS.includes(u.id));

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
    id: "m6-transfer",
    title: "Move a transfer without privilege creep",
    category: "Lifecycle",
    difficulty: "Core",
    brief:
      "Raj Patel transferred out of the physician pool and into Compliance last month. His new access was never provisioned and his old access was never removed — the classic mover problem. Give him what Compliance holds and take back what the clinical floor gave him.",
    hint: "A transfer is a leaver and a joiner in one action: add the new group, then remove the old one. Physicians is nested inside Clinical Staff, so dropping Physicians drops both.",
    checks: [
      {
        id: "joined",
        label: "Raj is a member of Compliance",
        test: (d) => inGroup(d, "u-raj", "grp-compliance"),
      },
      {
        id: "left",
        label: "Raj is out of Physicians and Clinical Staff",
        test: (d) =>
          !inGroup(d, "u-raj", "grp-physicians") && !inGroup(d, "u-raj", "grp-clinical-staff"),
      },
      {
        id: "new-access",
        label: "Raj can export regulatory reports",
        test: (d) => can(d, "u-raj", "reports:export"),
      },
      {
        id: "old-access",
        label: "Raj can no longer author charts or submit claims",
        test: (d) => !can(d, "u-raj", "patients:create") && !can(d, "u-raj", "claims:create"),
      },
      {
        id: "no-direct",
        label: "No roles pinned directly to his account",
        test: (d) => (findUser(d, "u-raj")?.roleIds.length ?? 1) === 0,
      },
    ],
  },
  {
    id: "m7-broad-group",
    title: "Defuse an over-broad group",
    category: "Least privilege",
    difficulty: "Core",
    brief:
      "All Staff contains every employee, and somebody attached the Help Desk role to it. The entire company can therefore edit accounts. Take the entitlement away from All Staff without dissolving the group and without costing the actual help desk their tooling.",
    hint: "The group is fine; what it carries is not. Revoke the role from All Staff — the Help Desk group carries the same role for the people who should have it.",
    checks: [
      {
        id: "narrowed",
        label: "All Staff no longer confers account editing",
        test: (d) => !groupPermissions(d, "grp-all-staff").has("users:update"),
      },
      {
        id: "intact",
        label: "All Staff still exists with its membership",
        test: (d) =>
          !!findGroup(d, "grp-all-staff") &&
          d.users.filter((u) => u.groupIds.includes("grp-all-staff")).length >= 5,
      },
      {
        id: "helpdesk-keeps",
        label: "Nora, on the help desk, can still edit accounts",
        test: (d) => can(d, "u-nora", "users:update"),
      },
      {
        id: "others-lose",
        label: "Sofia, in Compliance, cannot edit accounts",
        test: (d) => !can(d, "u-sofia", "users:update"),
      },
    ],
  },
  {
    id: "m8-service-account",
    title: "Scope a service account",
    category: "Non-human identity",
    difficulty: "Advanced",
    brief:
      "The nightly claims import runs as svc-nightly-import, which was made a Platform Admin because that was quickest. The job only writes claims and raises invoices. Cut it down to precisely those three permissions — it is a shared credential, so whatever it holds is what an attacker holds.",
    hint: "Build a role carrying create claims, update claims and create invoices, attach it to the account, and take the account out of Platform Admins.",
    checks: [
      {
        id: "exact",
        label: "Holds exactly claims:create, claims:update and invoices:create",
        test: (d) => sameSet(d, "u-svc-import", ["claims:create", "claims:update", "invoices:create"]),
      },
      {
        id: "not-admin",
        label: "No longer a Platform Admin",
        test: (d) => !inGroup(d, "u-svc-import", "grp-platform-admins"),
      },
      {
        id: "running",
        label: "Account is still active so the job keeps running",
        test: (d) => findUser(d, "u-svc-import")?.status === "active",
      },
    ],
  },
  {
    id: "m9-nesting",
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
    id: "m10-export",
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
  {
    id: "m11-shared-entitlement",
    title: "Grant a shared entitlement once",
    category: "Directory structure",
    difficulty: "Advanced",
    brief:
      "Finance decided the whole revenue cycle needs operational reporting. Billing analysts already have it through their role; billing approvers do not. Do not copy the permission into a second role and do not pin anything to individuals — put it in one place and have both groups inherit it, so the next revenue-cycle group inherits it too.",
    hint: "Create a role carrying report reading, create a group that holds that role, then make Billing and Billing Approvers members of it. Nesting is how a directory avoids duplicating an entitlement.",
    checks: [
      {
        id: "billing",
        label: "Billing confers report reading",
        test: (d) => groupPermissions(d, "grp-billing").has("reports:read"),
      },
      {
        id: "approvers",
        label: "Billing Approvers confers report reading",
        test: (d) => groupPermissions(d, "grp-billing-approvers").has("reports:read"),
      },
      {
        id: "no-copy",
        label: "The Billing Approver role itself was not edited",
        test: (d) =>
          !(findRole(d, "role-billing-approver")?.permissions ?? []).includes("reports:read"),
      },
      {
        id: "single-source",
        label: "Both groups inherit it from one shared parent group",
        test: (d) => {
          const a = ancestorGroups(d, "grp-billing");
          const b = ancestorGroups(d, "grp-billing-approvers");
          return [...a].some((id) => b.has(id) && groupPermissions(d, id).has("reports:read"));
        },
      },
    ],
  },
  {
    id: "m12-break-glass",
    title: "Stand up a break-glass account",
    category: "Resilience",
    difficulty: "Advanced",
    brief:
      "Audit wants a documented emergency path: a separate administrator account that is fully entitled on paper but cannot be used until someone deliberately activates it. Create a new account, entitle it through a group, and leave it suspended. Its permission list should read long while its effective access reads zero.",
    hint: "Create the account, create or reuse a group carrying Platform Admin, add the account to it, then suspend it. The user detail view shows the gap between what is granted and what is effective.",
    checks: [
      {
        id: "suspended",
        label: "A newly created account exists and is suspended",
        test: (d) => breakGlassCandidates(d).some(isDormant),
      },
      {
        id: "entitled",
        label: "It is granted settings and account administration on paper",
        test: (d) => breakGlassCandidates(d).some((u) => isEntitled(d, u.id)),
      },
      {
        id: "via-group",
        label: "Its entitlements come from a group, not a pinned role",
        test: (d) => breakGlassCandidates(d).some(viaGroup),
      },
      {
        id: "complete",
        label: "One account meets all three and holds nothing in effect",
        test: (d) =>
          breakGlassCandidates(d).some(
            (u) =>
              isDormant(u) &&
              isEntitled(d, u.id) &&
              viaGroup(u) &&
              effectivePermissions(d, u.id).size === 0,
          ),
      },
    ],
  },
  {
    id: "m13-recertification",
    title: "Retire what nothing uses",
    category: "Directory hygiene",
    difficulty: "Advanced",
    brief:
      "Quarterly recertification: a dormant role that still carries patient export, a pilot group abandoned in 2019, and anything else in the directory that no longer reaches a person. Dead objects are what attackers reactivate. Clear them out and leave nothing unreferenced behind.",
    hint: "Delete the Legacy Chart Viewer role and the Telehealth Pilot group. Then check the rest: any role carried by no group and no account, and any group with neither members nor roles, has to go too — including anything you created and never wired up.",
    checks: [
      {
        id: "legacy-role",
        label: "The Legacy Chart Viewer role is retired",
        test: (d) => !findRole(d, "role-legacy-chart-viewer"),
      },
      {
        id: "pilot-group",
        label: "The Telehealth Pilot group is retired",
        test: (d) => !findGroup(d, "grp-telehealth-pilot"),
      },
      {
        id: "no-orphan-roles",
        label: "Every role is carried by a group or an account",
        test: (d) => orphanRoles(d).length === 0,
      },
      {
        id: "no-empty-groups",
        label: "Every group has members or confers something",
        test: (d) =>
          !d.groups.some(
            (g) =>
              g.roleIds.length === 0 &&
              !d.users.some((u) => u.groupIds.includes(g.id)) &&
              !d.groups.some((child) => child.memberOf.includes(g.id)),
          ),
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
