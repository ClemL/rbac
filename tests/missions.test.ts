import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMissions, MISSIONS } from "../src/lib/tasks";
import { seedDirectory } from "../src/lib/seed";
import type { Directory } from "../src/lib/types";

const result = (dir: Directory, id: string) => {
  const r = evaluateMissions(dir).find((m) => m.mission.id === id);
  assert.ok(r, `mission ${id} not found`);
  return r;
};

const failing = (dir: Directory, id: string) =>
  result(dir, id).checks.filter((c) => !c.pass).map((c) => c.id);

test("every mission starts incomplete", () => {
  const dir = seedDirectory();
  for (const m of MISSIONS) {
    assert.equal(result(dir, m.id).complete, false, `${m.id} should start incomplete`);
  }
});

test("m1 solved by adding Dana to Clinical Staff", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-dana")!.groupIds.push("grp-clinical-staff");
  assert.deepEqual(failing(dir, "m1-onboard"), []);
});

test("m1 not solved by a direct role assignment", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-dana")!.roleIds.push("role-clinical-nurse");
  assert.deepEqual(failing(dir, "m1-onboard"), ["no-direct"]);
});

test("m2 solved by stripping access then suspending", () => {
  const dir = seedDirectory();
  const marcus = dir.users.find((u) => u.id === "u-marcus")!;
  marcus.groupIds = [];
  marcus.roleIds = [];
  marcus.status = "suspended";
  assert.deepEqual(failing(dir, "m2-offboard"), []);
});

test("m2 not solved by suspension alone", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-marcus")!.status = "suspended";
  assert.deepEqual(failing(dir, "m2-offboard"), ["no-groups", "no-roles"]);
});

test("m3 solved by removing the patient permission from Billing Analyst", () => {
  const dir = seedDirectory();
  const role = dir.roles.find((r) => r.id === "role-billing-analyst")!;
  role.permissions = role.permissions.filter((p) => p !== "patients:delete");
  assert.deepEqual(failing(dir, "m3-least-privilege"), []);
});

test("m3 not solved by unassigning the role from Billing", () => {
  const dir = seedDirectory();
  dir.groups.find((g) => g.id === "grp-billing")!.roleIds = [];
  assert.ok(failing(dir, "m3-least-privilege").includes("still-assigned"));
});

test("m4 solved by dropping Aisha from Billing Approvers", () => {
  const dir = seedDirectory();
  const aisha = dir.users.find((u) => u.id === "u-aisha")!;
  aisha.groupIds = aisha.groupIds.filter((g) => g !== "grp-billing-approvers");
  assert.deepEqual(failing(dir, "m4-sod"), []);
});

test("m4 also solved by dropping Aisha from Billing", () => {
  const dir = seedDirectory();
  const aisha = dir.users.find((u) => u.id === "u-aisha")!;
  aisha.groupIds = aisha.groupIds.filter((g) => g !== "grp-billing");
  assert.deepEqual(failing(dir, "m4-sod"), []);
});

test("m4 not solved by suspending Aisha", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-aisha")!.status = "suspended";
  assert.deepEqual(failing(dir, "m4-sod"), ["aisha-keeps"]);
});

test("m5 solved with a purpose-built contractor role and group", () => {
  const dir = seedDirectory();
  dir.roles.push({
    id: "role-x",
    name: "Report Viewer",
    description: "",
    permissions: ["reports:read"],
    builtIn: false,
  });
  dir.groups.push({
    id: "grp-x",
    name: "Contractors",
    description: "",
    roleIds: ["role-x"],
    memberOf: [],
    builtIn: false,
  });
  dir.users.find((u) => u.id === "u-priya")!.groupIds = ["grp-x"];
  assert.deepEqual(failing(dir, "m5-contractor"), []);
});

test("m5 not solved by reusing a seeded group", () => {
  const dir = seedDirectory();
  dir.groups.find((g) => g.id === "grp-interns")!.roleIds = ["role-compliance-auditor"];
  dir.users.find((u) => u.id === "u-priya")!.groupIds = ["grp-interns"];
  assert.ok(failing(dir, "m5-contractor").includes("own-group"));
});

test("m6 solved by removing the nesting", () => {
  const dir = seedDirectory();
  dir.groups.find((g) => g.id === "grp-interns")!.memberOf = [];
  assert.deepEqual(failing(dir, "m9-nesting"), []);
});

test("m6 not solved by removing Ben from Interns", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-ben")!.groupIds = [];
  assert.deepEqual(failing(dir, "m9-nesting").sort(), ["ben-stays", "no-nesting"]);
});

test("m7 solved by unpinning the auditor role from Nora", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-nora")!.roleIds = [];
  assert.deepEqual(failing(dir, "m10-export"), []);
});

test("m7 also solved by moving Nora into Compliance", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-nora")!.groupIds.push("grp-compliance");
  assert.deepEqual(failing(dir, "m10-export"), []);
});

test("m7 not solved by gutting the auditor role", () => {
  const dir = seedDirectory();
  const role = dir.roles.find((r) => r.id === "role-compliance-auditor")!;
  role.permissions = role.permissions.filter((p) => p !== "patients:export");
  assert.ok(failing(dir, "m10-export").includes("sofia-keeps"));
});

/** The reference solution to every review, used to prove they are mutually satisfiable. */
function solveAll(dir: Directory): Directory {
  const user = (id: string) => dir.users.find((u) => u.id === id)!;
  const group = (id: string) => dir.groups.find((g) => g.id === id)!;
  const role = (id: string) => dir.roles.find((r) => r.id === id)!;

  // 1 onboard
  user("u-dana").groupIds.push("grp-clinical-staff");
  // 2 offboard
  Object.assign(user("u-marcus"), { groupIds: [], roleIds: [], status: "suspended" });
  // 3 least privilege
  role("role-billing-analyst").permissions = role("role-billing-analyst").permissions.filter(
    (p) => !p.startsWith("patients:"),
  );
  // 4 segregation of duties
  user("u-aisha").groupIds = ["grp-billing", "grp-all-staff"];
  // 5 contractor
  dir.roles.push({
    id: "role-report-viewer",
    name: "Report Viewer",
    description: "",
    permissions: ["reports:read"],
    builtIn: false,
  });
  dir.groups.push({
    id: "grp-contractors",
    name: "Contractors",
    description: "",
    roleIds: ["role-report-viewer"],
    memberOf: [],
    builtIn: false,
  });
  user("u-priya").groupIds = ["grp-contractors"];
  // 6 transfer
  user("u-raj").groupIds = ["grp-compliance", "grp-all-staff"];
  // 7 over-broad group
  group("grp-all-staff").roleIds = [];
  // 8 service account
  dir.roles.push({
    id: "role-claims-import",
    name: "Claims Import",
    description: "",
    permissions: ["claims:create", "claims:update", "invoices:create"],
    builtIn: false,
  });
  Object.assign(user("u-svc-import"), { groupIds: [], roleIds: ["role-claims-import"] });
  // 9 nesting escalation
  group("grp-interns").memberOf = [];
  // 10 export containment
  user("u-nora").roleIds = [];
  // 11 shared entitlement
  dir.groups.push({
    id: "grp-revenue-cycle",
    name: "Revenue Cycle",
    description: "",
    roleIds: ["role-report-viewer"],
    memberOf: [],
    builtIn: false,
  });
  group("grp-billing").memberOf = ["grp-revenue-cycle"];
  group("grp-billing-approvers").memberOf = ["grp-revenue-cycle"];
  // 12 break glass
  dir.groups.push({
    id: "grp-emergency-admins",
    name: "Emergency Admins",
    description: "",
    roleIds: ["role-platform-admin"],
    memberOf: [],
    builtIn: false,
  });
  dir.users.push({
    id: "u-breakglass",
    name: "breakglass-admin",
    title: "Emergency access",
    email: "breakglass@meridian.example",
    status: "suspended",
    groupIds: ["grp-emergency-admins"],
    roleIds: [],
    builtIn: false,
  });
  // 13 recertification
  dir.roles = dir.roles.filter((r) => r.id !== "role-legacy-chart-viewer");
  dir.groups = dir.groups.filter((g) => g.id !== "grp-telehealth-pilot");
  return dir;
}

test("m6 solved by joining Compliance and leaving the clinical groups", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-raj")!.groupIds = ["grp-compliance", "grp-all-staff"];
  assert.deepEqual(failing(dir, "m6-transfer"), []);
});

test("m6 not solved by adding the new access alone", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-raj")!.groupIds.push("grp-compliance");
  assert.deepEqual(failing(dir, "m6-transfer").sort(), ["left", "old-access"]);
});

test("m7 solved by revoking the role from All Staff", () => {
  const dir = seedDirectory();
  dir.groups.find((g) => g.id === "grp-all-staff")!.roleIds = [];
  assert.deepEqual(failing(dir, "m7-broad-group"), []);
});

test("m7 not solved by deleting the group's membership", () => {
  const dir = seedDirectory();
  for (const u of dir.users) u.groupIds = u.groupIds.filter((g) => g !== "grp-all-staff");
  assert.ok(failing(dir, "m7-broad-group").includes("intact"));
});

test("m8 solved by a purpose-built role and leaving Platform Admins", () => {
  const dir = seedDirectory();
  dir.roles.push({
    id: "role-claims-import",
    name: "Claims Import",
    description: "",
    permissions: ["claims:create", "claims:update", "invoices:create"],
    builtIn: false,
  });
  Object.assign(dir.users.find((u) => u.id === "u-svc-import")!, {
    groupIds: [],
    roleIds: ["role-claims-import"],
  });
  assert.deepEqual(failing(dir, "m8-service-account"), []);
});

test("m8 not solved by suspending the service account", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-svc-import")!.status = "suspended";
  assert.ok(failing(dir, "m8-service-account").includes("running"));
});

test("m11 solved by one shared parent group", () => {
  const dir = seedDirectory();
  dir.roles.push({
    id: "role-report-viewer",
    name: "Report Viewer",
    description: "",
    permissions: ["reports:read"],
    builtIn: false,
  });
  dir.groups.push({
    id: "grp-revenue-cycle",
    name: "Revenue Cycle",
    description: "",
    roleIds: ["role-report-viewer"],
    memberOf: [],
    builtIn: false,
  });
  dir.groups.find((g) => g.id === "grp-billing")!.memberOf = ["grp-revenue-cycle"];
  dir.groups.find((g) => g.id === "grp-billing-approvers")!.memberOf = ["grp-revenue-cycle"];
  assert.deepEqual(failing(dir, "m11-shared-entitlement"), []);
});

test("m11 not solved by copying the permission into the approver role", () => {
  const dir = seedDirectory();
  dir.roles.find((r) => r.id === "role-billing-approver")!.permissions.push("reports:read");
  const stuck = failing(dir, "m11-shared-entitlement");
  assert.ok(stuck.includes("no-copy"));
  assert.ok(stuck.includes("single-source"));
});

test("m12 solved by a suspended group-entitled account", () => {
  const dir = seedDirectory();
  dir.groups.push({
    id: "grp-emergency-admins",
    name: "Emergency Admins",
    description: "",
    roleIds: ["role-platform-admin"],
    memberOf: [],
    builtIn: false,
  });
  dir.users.push({
    id: "u-breakglass",
    name: "breakglass-admin",
    title: "Emergency access",
    email: "bg@meridian.example",
    status: "suspended",
    groupIds: ["grp-emergency-admins"],
    roleIds: [],
    builtIn: false,
  });
  assert.deepEqual(failing(dir, "m12-break-glass"), []);
});

test("m12 not satisfied by a seeded account that happens to be suspended", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-lena")!.status = "suspended";
  assert.equal(failing(dir, "m12-break-glass").length, 4);
});

test("m13 requires clearing the player's own unwired objects too", () => {
  const dir = seedDirectory();
  dir.roles = dir.roles.filter((r) => r.id !== "role-legacy-chart-viewer");
  dir.groups = dir.groups.filter((g) => g.id !== "grp-telehealth-pilot");
  assert.deepEqual(failing(dir, "m13-recertification"), []);

  dir.roles.push({
    id: "role-draft",
    name: "Draft",
    description: "",
    permissions: [],
    builtIn: false,
  });
  assert.deepEqual(failing(dir, "m13-recertification"), ["no-orphan-roles"]);
});

test("all reviews can be closed at the same time", () => {
  const dir = solveAll(seedDirectory());
  const stuck = evaluateMissions(dir)
    .filter((r) => !r.complete)
    .map((r) => `${r.mission.id}: ${r.checks.filter((c) => !c.pass).map((c) => c.id).join(",")}`);
  assert.deepEqual(stuck, []);
});

test("the reference solution leaves no policy violations", () => {
  const dir = solveAll(seedDirectory());
  assert.equal(evaluateMissions(dir).every((r) => r.complete), true);
});
