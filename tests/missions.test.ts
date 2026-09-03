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
  assert.deepEqual(failing(dir, "m6-nesting"), []);
});

test("m6 not solved by removing Ben from Interns", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-ben")!.groupIds = [];
  assert.deepEqual(failing(dir, "m6-nesting").sort(), ["ben-stays", "no-nesting"]);
});

test("m7 solved by unpinning the auditor role from Nora", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-nora")!.roleIds = [];
  assert.deepEqual(failing(dir, "m7-export"), []);
});

test("m7 also solved by moving Nora into Compliance", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-nora")!.groupIds.push("grp-compliance");
  assert.deepEqual(failing(dir, "m7-export"), []);
});

test("m7 not solved by gutting the auditor role", () => {
  const dir = seedDirectory();
  const role = dir.roles.find((r) => r.id === "role-compliance-auditor")!;
  role.permissions = role.permissions.filter((p) => p !== "patients:export");
  assert.ok(failing(dir, "m7-export").includes("sofia-keeps"));
});

test("all missions can be complete at the same time", () => {
  const dir = seedDirectory();
  dir.users.find((u) => u.id === "u-dana")!.groupIds.push("grp-clinical-staff");
  const marcus = dir.users.find((u) => u.id === "u-marcus")!;
  marcus.groupIds = [];
  marcus.roleIds = [];
  marcus.status = "suspended";
  const analyst = dir.roles.find((r) => r.id === "role-billing-analyst")!;
  analyst.permissions = analyst.permissions.filter((p) => !p.startsWith("patients:"));
  const aisha = dir.users.find((u) => u.id === "u-aisha")!;
  aisha.groupIds = ["grp-billing"];
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
  dir.groups.find((g) => g.id === "grp-interns")!.memberOf = [];
  dir.users.find((u) => u.id === "u-nora")!.roleIds = [];

  const results = evaluateMissions(dir);
  const stuck = results.filter((r) => !r.complete).map((r) => r.mission.id);
  assert.deepEqual(stuck, []);
});
