import assert from "node:assert/strict";
import test from "node:test";

import { effectivePermissions, grantedPermissions } from "../src/lib/rbac";
import {
  directHolders,
  equivalentGroups,
  moveDirectToGroup,
  splitRole,
} from "../src/lib/redesign";
import { seedDirectory } from "../src/lib/seed";
import { evaluateMissions } from "../src/lib/tasks";
import type { Directory } from "../src/lib/types";

/** Every account's access on paper and in effect, keyed by account. */
const access = (dir: Directory) =>
  Object.fromEntries(
    dir.users.map((u) => [
      u.id,
      {
        granted: [...grantedPermissions(dir, u.id)].sort(),
        effective: [...effectivePermissions(dir, u.id)].sort(),
      },
    ]),
  );

const failing = (dir: Directory, id: string) =>
  evaluateMissions(dir)
    .find((r) => r.mission.id === id)!
    .checks.filter((c) => !c.pass)
    .map((c) => c.id);

test("splitting a role moves the picked permissions into a new role held by every holder", () => {
  const dir = seedDirectory();
  const split = splitRole(dir, "role-platform-admin", ["users:delete", "settings:update"], "Tenant Owner");
  assert.ok(split);
  assert.equal(split.role.id, "role-tenant-owner");
  assert.deepEqual(split.role.permissions, ["users:delete", "settings:update"]);
  assert.ok(!split.source.permissions.includes("users:delete"));
  assert.ok(!split.source.permissions.includes("settings:update"));
  assert.deepEqual(split.groups.map((g) => g.id), ["grp-platform-admins"]);
  // Marcus has Platform Admin pinned to his account, so the new half is pinned too.
  assert.deepEqual(split.users.map((u) => u.id), ["u-marcus"]);
  assert.ok(dir.users.find((u) => u.id === "u-marcus")!.roleIds.includes("role-tenant-owner"));
});

test("every legal single-permission split leaves everyone's access unchanged", () => {
  const seed = seedDirectory();
  for (const role of seed.roles.filter((r) => r.permissions.length >= 2)) {
    for (const permission of role.permissions) {
      const dir = seedDirectory();
      assert.ok(splitRole(dir, role.id, [permission], "Carved"), `${role.id} / ${permission}`);
      assert.deepEqual(access(dir), access(seed), `${role.id} / ${permission}`);
    }
  }
});

test("a split refuses empty, whole-role, foreign and unnamed picks without touching the directory", () => {
  const dir = seedDirectory();
  const all = dir.roles.find((r) => r.id === "role-billing-approver")!.permissions;
  assert.equal(splitRole(dir, "role-billing-approver", [], "X"), null);
  assert.equal(splitRole(dir, "role-billing-approver", [...all], "X"), null);
  assert.equal(splitRole(dir, "role-billing-approver", ["patients:read"], "X"), null);
  assert.equal(splitRole(dir, "role-billing-approver", ["invoices:approve"], "  "), null);
  assert.equal(splitRole(dir, "role-missing", ["invoices:approve"], "X"), null);
  assert.deepEqual(dir, seedDirectory());
});

test("review 3 is not closed by splitting the bad permission out and leaving it granted", () => {
  const dir = seedDirectory();
  const split = splitRole(dir, "role-billing-analyst", ["patients:delete"], "Patient Delete");
  assert.ok(split);
  assert.deepEqual(failing(dir, "m3-least-privilege"), ["billing-clean"]);

  // Revoking the carved-out half is the deliberate second step that closes it.
  const billing = dir.groups.find((g) => g.id === "grp-billing")!;
  billing.roleIds = billing.roleIds.filter((r) => r !== split.role.id);
  assert.deepEqual(failing(dir, "m3-least-privilege"), []);
});

test("equivalent groups confer exactly the role's permissions, including through nesting", () => {
  const dir = seedDirectory();
  const ids = (roleId: string) => equivalentGroups(dir, roleId).map((g) => g.id);

  // Physicians inherit Clinical Nurse but confer more, so only Clinical Staff qualifies.
  assert.deepEqual(ids("role-clinical-nurse"), ["grp-clinical-staff"]);
  assert.deepEqual(ids("role-helpdesk"), ["grp-helpdesk", "grp-all-staff"]);
  // Interns inherit Platform Admin and confer nothing else.
  assert.deepEqual(ids("role-platform-admin"), ["grp-platform-admins", "grp-interns"]);
  assert.deepEqual(ids("role-legacy-chart-viewer"), []);
});

test("moving direct assignments into a new group replaces the pins with a membership", () => {
  const seed = seedDirectory();
  const dir = seedDirectory();
  const moved = moveDirectToGroup(dir, "role-platform-admin", { name: "Pinned Admins" });
  assert.ok(moved);
  assert.equal(moved.created, true);
  assert.equal(moved.group.id, "grp-pinned-admins");
  assert.deepEqual(moved.group.roleIds, ["role-platform-admin"]);
  assert.deepEqual(directHolders(dir, "role-platform-admin"), []);
  assert.ok(dir.users.find((u) => u.id === "u-marcus")!.groupIds.includes("grp-pinned-admins"));
  assert.deepEqual(access(dir), access(seed));
});

test("moving Nora's pinned auditor role into Compliance closes review 10", () => {
  const seed = seedDirectory();
  const dir = seedDirectory();
  const moved = moveDirectToGroup(dir, "role-compliance-auditor", { groupId: "grp-compliance" });
  assert.ok(moved);
  assert.equal(moved.created, false);
  assert.deepEqual(access(dir), access(seed));
  assert.deepEqual(failing(dir, "m10-export"), []);
});

test("every legal move of direct assignments leaves everyone's access unchanged", () => {
  const seed = seedDirectory();
  for (const role of seed.roles.filter((r) => directHolders(seed, r.id).length > 0)) {
    const targets = [
      ...equivalentGroups(seed, role.id).map((g) => ({ groupId: g.id })),
      { name: "Fresh" },
    ];
    for (const target of targets) {
      const dir = seedDirectory();
      assert.ok(moveDirectToGroup(dir, role.id, target), `${role.id} → ${JSON.stringify(target)}`);
      assert.deepEqual(access(dir), access(seed), `${role.id} → ${JSON.stringify(target)}`);
    }
  }
});

test("a move refuses groups that confer more, roles with no pins, and blank names", () => {
  const dir = seedDirectory();
  // Help Desk confers users:update, which the auditor role does not carry.
  assert.equal(moveDirectToGroup(dir, "role-compliance-auditor", { groupId: "grp-helpdesk" }), null);
  assert.equal(moveDirectToGroup(dir, "role-physician", { name: "Physician holders" }), null);
  assert.equal(moveDirectToGroup(dir, "role-platform-admin", { name: " " }), null);
  assert.deepEqual(dir, seedDirectory());
});
