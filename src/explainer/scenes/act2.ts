/** Act two: the three layers — permissions, roles, groups — built up piece by piece. */

import { C, arc, ease, env, hash, k, lerp, pop, unpop, withAlpha, withTransform, type Pt } from "../core";
import { arrow, check, ellipse, stroke } from "../ink";
import { scrap, tape } from "../paper";
import {
  CAST,
  ENV_H,
  RESOURCE_COLOR,
  boxBack,
  boxFront,
  envelopeBack,
  envelopeFront,
  icon,
  person,
  stamp,
  ticket,
  type PersonSpec,
  type ResourceKind,
} from "../props";
import { label, write } from "../text";
import { heading } from "./common";

// ---------------------------------------------------------------------------------------------
// 3 · Permissions

const RES: ResourceKind[] = ["patients", "claims", "invoices", "reports", "users", "settings"];
const ACTIONS = ["read", "create", "update", "delete", "approve", "export"];
const colX = (i: number) => 260 + i * 280;

export function drawPermissions(t: number) {
  heading("1", "Permissions", 150, 110, t, 0.2);

  RES.forEach((r, i) => {
    const at = 0.9 + i * 0.22;
    const s = pop(t, at);
    scrap({ key: "resbadge", w: 168, h: 168, color: C.white, shape: "circle", edge: "torn" }, colX(i), 320, {
      scale: s,
      rot: (hash(i, 1) - 0.5) * 0.2,
    });
    icon(r, colX(i), 316, 1.05 * s, { seed: 20 + i, progress: k(t, at + 0.1, at + 0.8) });
    label(r, colX(i), 432, { kind: "type", size: 30, bg: RESOURCE_COLOR[r], fg: C.white, scale: s, rot: (hash(i, 2) - 0.5) * 0.1 });
  });

  ACTIONS.forEach((a, i) => {
    const at = 2.6 + i * 0.14;
    const slide = ease.outBack(k(t, at, at + 0.45));
    label(a, lerp(colX(i) + 1400, colX(i), slide), 545, {
      kind: "type",
      size: 34,
      bg: C.paper,
      rot: (hash(i, 3) - 0.5) * 0.12,
      edge: "torn",
    });
  });

  write("resource  +  action  =  one permission", 960, 650, {
    kind: "hand",
    size: 56,
    weight: 700,
    progress: ease.outCubic(k(t, 3.8, 5.2)),
  });

  // Two worked examples, each circled then combined into a ticket.
  const examples: [number, number, string, number, number][] = [
    [0, 0, "patients:read", 5.0, 640],
    [2, 4, "invoices:approve", 7.2, 1280],
  ];
  examples.forEach(([ri, ai, keyName, at, tx]) => {
    const color = ri === 0 ? C.red : C.green;
    withAlpha(env(t, at, 10.6, 0.3), () => {
      ellipse(colX(ri), 330, 110, 112, { seed: 60 + ri, width: 6, color, progress: k(t, at, at + 0.4) });
      ellipse(colX(ai), 545, 90, 42, { seed: 70 + ai, width: 6, color, progress: k(t, at + 0.35, at + 0.7) });
      arrow({ x: colX(ri) + 40, y: 440 }, { x: tx - 60, y: 740 }, { seed: 80 + ri, width: 5, color, progress: k(t, at + 0.7, at + 1.1), bend: -0.15 });
      arrow({ x: colX(ai), y: 580 }, { x: tx + 50, y: 740 }, { seed: 90 + ai, width: 5, color, progress: k(t, at + 0.8, at + 1.2), bend: 0.12 });
    });
    const s = pop(t, at + 1.1, 0.5);
    const settle = ease.inOutCubic(k(t, 10.2, 10.8));
    ticket(keyName, tx, lerp(790, 760, settle), { size: 44, scale: s * lerp(1, 0.85, settle), rot: ri === 0 ? -0.05 : 0.04 });
  });

  // The sensitive ones.
  const hot = ["patients:delete", "patients:export", "users:delete", "settings:update"];
  hot.forEach((h, i) => {
    const at = 10.6 + i * 0.3;
    const x = 330 + i * 420;
    ticket(h, x, 905, { size: 36, scale: pop(t, at, 0.45), rot: (hash(i, 7) - 0.5) * 0.12 });
    withAlpha(k(t, at + 1.9, at + 2.0), () => {
      write("!", x + 175, 855, { kind: "marker", size: 70, color: C.red, rot: 0.2, progress: 1 });
    });
  });
  stamp("SENSITIVE", 1530, 1015, t, 12.3, { color: C.redDeep, rot: -0.06, scale: 0.8 });
  if (t > 13.2) {
    write("flagged red in the app →", 900, 1020, { kind: "hand", size: 46, weight: 700, color: C.redDeep, progress: k(t, 13.2, 14.4), rot: -0.02 });
  }
}

// ---------------------------------------------------------------------------------------------
// 4 · Roles

const NURSE_PERMS = ["patients:read", "patients:update", "claims:read"];

export function drawRoles(t: number) {
  heading("2", "Roles", 150, 110, t, 0.2, C.mint);

  // Main envelope moves up and shrinks once the other roles have been shown.
  const shift = ease.inOutCubic(k(t, 9.2, 10.2));
  const ex = lerp(560, 560, shift);
  const ey = lerp(600, 440, shift);
  const es = lerp(1.45, 1.15, shift) * pop(t, 0.6, 0.5);

  // Flap: open while filling, closed for the reveal, briefly reopened for the edit.
  const open = 1 - ease.inOutCubic(k(t, 4.9, 5.4)) + ease.inOutCubic(k(t, 11.6, 11.9)) - ease.inOutCubic(k(t, 12.6, 12.9));

  withTransform(ex, ey, -0.03, es, () => {
    envelopeBack(C.mint, 0, 0, { open });
    // Tickets fly in from the right on arcs and settle inside, peeking out of the top.
    NURSE_PERMS.forEach((p, i) => {
      const at = 1.7 + i * 0.9;
      const f = ease.inOutCubic(k(t, at, at + 0.75));
      const appear = pop(t, 0.9 + i * 0.15);
      if (appear <= 0) return;
      const start = { x: (1300 + (i % 2) * 120 - ex) / es, y: (360 + i * 170 - ey) / es };
      const end = { x: -60 + i * 50, y: -ENV_H / 2 + 14 - i * 6 };
      const p2 = arc(start, end, 180, f);
      ticket(p, p2.x, p2.y, { scale: lerp(1, 0.5, f) * appear, rot: lerp(0.2 - i * 0.15, -0.15 + i * 0.12, f) });
    });
    if (t > 11.6) {
      const f = ease.inOutCubic(k(t, 11.6, 12.4));
      const p2 = arc({ x: (1500 - ex) / es, y: (360 - ey) / es }, { x: 90, y: -ENV_H / 2 + 6 }, 160, f);
      ticket("claims:update", p2.x, p2.y, { scale: lerp(1, 0.5, f), rot: lerp(-0.2, 0.25, f) });
    }
    envelopeFront("Clinical Nurse", C.mint, 0, 0, { closed: 1 - Math.max(0, Math.min(1, open)) });
    const seal = pop(t, 5.5) * (1 - k(t, 11.5, 11.6)) + pop(t, 12.9) * k(t, 12.9, 12.95);
    scrap(
      {
        key: "seal",
        w: 64,
        h: 64,
        color: C.red,
        shape: "badge",
        edge: "cut",
        paint: (c) => {
          c.strokeStyle = C.white;
          c.lineWidth = 6;
          c.lineCap = "round";
          c.beginPath();
          c.moveTo(18, 33);
          c.lineTo(28, 43);
          c.lineTo(46, 22);
          c.stroke();
        },
      },
      0,
      -ENV_H / 2 + 60,
      { scale: seal },
    );
  });

  // Distractor tickets that don't belong to nurses wobble "no" and leave.
  const leave = ease.inBack(k(t, 6.4, 7.0));
  const shakeNo = Math.sin(t * 30) * 0.08 * env(t, 1.4, 3.2, 0.1);
  ticket("invoices:approve", 1600 + leave * 700, 250, { scale: pop(t, 1.0), rot: 0.1 + shakeNo });
  ticket("users:delete", 1650 + leave * 700, 880, { scale: pop(t, 1.15), rot: -0.08 - shakeNo });

  write("a role = a named bundle of permissions", 1260, 1000, {
    kind: "hand",
    size: 50,
    weight: 700,
    progress: ease.outCubic(k(t, 2.4, 4.0)),
    alpha: 1 - k(t, 8.8, 9.2),
  });

  // Other roles, closed and labelled.
  const others: [string, string, number][] = [
    ["Physician", C.sky, 7.0],
    ["Billing Analyst", C.yellow, 7.35],
  ];
  others.forEach(([name, color, at], i) => {
    const away = ease.inBack(k(t, 9.0, 9.6));
    const y = lerp(1500, 560 + i * 40, ease.outBack(k(t, at, at + 0.55))) + away * 900;
    withTransform(1150 + i * 470, y, (i ? 0.05 : -0.04), 1.05, () => {
      envelopeBack(color, 0, 0, { open: 0 });
      envelopeFront(name, color, 0, 0, { closed: 1 });
    });
  });

  // Everyone holding the role.
  const clones: PersonSpec[] = [
    { ...CAST.dana, id: "n1", name: "" },
    { ...CAST.dana, id: "n2", name: "", skin: "#8a5634", hair: "#2a221e", hairStyle: "curly" },
    { ...CAST.dana, id: "n3", name: "", skin: "#d9a47c", hair: "#6b4226", hairStyle: "short" },
    { ...CAST.dana, id: "n4", name: "", skin: "#f5d5b8", hair: "#e2b85c", hairStyle: "long" },
  ];
  clones.forEach((p, i) => {
    const at = 10.0 + i * 0.12;
    const x = 200 + i * 245;
    const up = ease.outBack(k(t, at, at + 0.45));
    person(p, x, lerp(1300, 1030, up), { scale: 0.7, name: false, mood: t > 13 + i * 0.18 ? "grin" : "happy", look: 0.5 });
    const from: Pt = { x: 560, y: 560 };
    stroke(
      [from, { x: (from.x + x) / 2 + 10, y: 700 }, { x, y: 790 }],
      { seed: 300 + i, width: 3.5, color: C.teal, progress: k(t, 10.6 + i * 0.1, 11.2 + i * 0.1), dash: [12, 12], double: false },
    );
    // After the edit, each holder receives the new permission at once.
    const gp = pop(t, 13.0 + i * 0.18);
    if (gp > 0) ticket("claims:update", x, 800, { scale: 0.66 * gp, rot: (hash(i, 9) - 0.5) * 0.3 });
  });

  if (t > 13.4) {
    write("edit it once…", 1330, 470, { kind: "marker", size: 64, progress: ease.outCubic(k(t, 13.4, 14.1)), rot: -0.03 });
    write("…everyone changes", 1360, 590, { kind: "marker", size: 64, progress: ease.outCubic(k(t, 14.0, 14.8)), rot: -0.03 });
    write("power  +  risk", 1370, 740, { kind: "hand", size: 64, weight: 700, color: C.red, progress: k(t, 14.9, 15.5), rot: 0.03 });
    ellipse(1370, 745, 230, 60, { seed: 41, width: 5, color: C.red, progress: k(t, 15.3, 15.8), turns: 1.1 });
  }
}

// ---------------------------------------------------------------------------------------------
// 5 · Groups

const BIG = { x: 640, y: 640, w: 700, h: 420 };
const SMALL = { x: 830, y: 548, w: 330, h: 230 };

export function drawGroups(t: number) {
  heading("3", "Groups", 150, 110, t, 0.2, C.orange);

  const bigIn = pop(t, 0.8, 0.5);
  withTransform(BIG.x, BIG.y, 0, bigIn, () => boxBack(BIG.w, BIG.h, 0, 0));

  // Dana hops in from the right and lands inside Clinical Staff.
  const hopDana = ease.inOutCubic(k(t, 4.4, 5.3));
  const danaStart = { x: 1560, y: 900 };
  const danaEnd = { x: 470, y: 760 };
  const dp = arc(danaStart, danaEnd, 260, hopDana);
  const danaIn = pop(t, 2.8);
  const danaInside = hopDana > 0.85;
  const drawDana = () =>
    person(CAST.dana, dp.x, dp.y, {
      scale: 0.8 * danaIn,
      rot: hopDana > 0 && hopDana < 1 ? Math.sin(hopDana * Math.PI) * -0.3 : 0,
      mood: hopDana >= 1 ? "grin" : "happy",
      look: -1,
    });
  if (danaInside) drawDana();

  // Raj's group, nested inside.
  const drop = ease.outBack(k(t, 8.4, 9.1));
  const sy = lerp(-300, SMALL.y, drop);
  const smallVisible = t > 8.4;
  if (smallVisible) withTransform(SMALL.x, sy, 0.02, 1, () => boxBack(SMALL.w, SMALL.h, 0, 0, C.sky));
  const hopRaj = ease.inOutCubic(k(t, 12.0, 12.9));
  const rp = arc({ x: 1600, y: 920 }, { x: SMALL.x, y: SMALL.y + 50 }, 260, hopRaj);
  const rajIn = pop(t, 11.0);
  const drawRaj = () =>
    person(CAST.raj, rp.x, rp.y, { scale: 0.62 * rajIn, rot: hopRaj > 0 && hopRaj < 1 ? Math.sin(hopRaj * Math.PI) * -0.3 : 0, mood: hopRaj >= 1 ? "grin" : "happy", look: -1 });
  if (hopRaj > 0.85) drawRaj();
  if (smallVisible) {
    withTransform(SMALL.x, sy, 0.02, 1, () => boxFront("Physicians", SMALL.w, SMALL.h, 0, 0, C.sky, { size: 30 }));
  }

  withTransform(BIG.x, BIG.y, 0, bigIn, () => boxFront("Clinical Staff", BIG.w, BIG.h, 0, 0));

  if (!danaInside) drawDana();
  if (hopRaj <= 0.85) drawRaj();

  // Role envelopes clipped onto each group.
  const envIn = pop(t, 1.8);
  withTransform(BIG.x - 300, BIG.y - 250, -0.12, 0.52 * envIn, () => {
    envelopeBack(C.mint, 0, 0, { open: 0 });
    envelopeFront("Clinical Nurse", C.mint, 0, 0, { closed: 1 });
  });
  if (envIn > 0.5) tape(BIG.x - 300, BIG.y - 300, 90, 0.2, "yellow", 21);
  if (t > 9.1) {
    const pe = pop(t, 9.2);
    withTransform(SMALL.x + 240, SMALL.y - 150, 0.12, 0.46 * pe, () => {
      envelopeBack(C.sky, 0, 0, { open: 0 });
      envelopeFront("Physician", C.sky, 0, 0, { closed: 1 });
    });
    if (pe > 0.5) tape(SMALL.x + 240, SMALL.y - 196, 80, -0.2, "pink", 22);
  }

  // Dana's permissions fan out above her.
  NURSE_PERMS.forEach((p, i) => {
    const s = pop(t, 5.6 + i * 0.25) * unpop(t, 8.0);
    ticket(p, 1000 + 20 * i, 830 + i * 70, { scale: 0.62 * s, rot: (i - 1) * 0.05 });
  });
  withAlpha(env(t, 6.3, 8.2, 0.2), () => {
    arrow({ x: 560, y: 860 }, { x: 860, y: 900 }, { seed: 120, width: 5, color: C.green, progress: k(t, 5.4, 5.9), bend: -0.2 });
    check(1330, 900, 70, { seed: 121, color: C.green, progress: k(t, 6.4, 6.8) });
    write("exactly a nurse's access", 1320, 1010, { kind: "hand", size: 46, weight: 700, color: C.green, progress: k(t, 6.5, 7.4) });
  });

  // Raj inherits from both groups.
  if (t > 13.2) {
    const a = k(t, 13.2, 13.7);
    const b = k(t, 13.9, 14.4);
    arrow({ x: SMALL.x + 240, y: SMALL.y - 100 }, { x: SMALL.x + 60, y: SMALL.y - 150 }, { seed: 130, width: 5, color: C.blue, progress: a, bend: 0.3 });
    arrow({ x: BIG.x - 260, y: BIG.y - 290 }, { x: SMALL.x - 50, y: SMALL.y - 170 }, { seed: 131, width: 5, color: C.teal, progress: b, bend: -0.25 });
    write("inherits both!", 1320, 330, { kind: "marker", size: 64, color: C.blue, progress: k(t, 14.6, 15.4), rot: -0.04 });
    const perms = ["patients:create", "claims:create", "patients:read", "patients:update", "claims:read"];
    perms.forEach((p, i) => {
      const s = pop(t, 15.0 + i * 0.16) * unpop(t, 17.0);
      ticket(p, 1320 + (i % 2) * 150 - 60, 440 + i * 62, { scale: 0.55 * s, rot: (hash(i, 5) - 0.5) * 0.12, plain: true });
    });
  }

  // The derivation path, laid out like the app shows it.
  const chain: [string, "person" | "group" | "role" | "perm"][] = [
    ["Raj", "person"],
    ["Physicians", "group"],
    ["Clinical Staff", "group"],
    ["Clinical Nurse", "role"],
    ["patients:read", "perm"],
  ];
  const widths = [120, 250, 300, 300, 290];
  const gap = 70;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chain.length - 1);
  let cx = 960 - total / 2;
  chain.forEach(([text, kind], i) => {
    const at = 17.5 + i * 0.55;
    const w = widths[i];
    const x = cx + w / 2;
    const s = pop(t, at);
    const y = 1040;
    if (kind === "perm") ticket(text, x, y, { size: 32, scale: s });
    else
      label(text, x, y, {
        kind: kind === "person" ? "hand" : "marker",
        weight: 700,
        size: kind === "person" ? 40 : 32,
        bg: kind === "group" ? C.kraft : kind === "role" ? C.mint : C.white,
        edge: "torn",
        scale: s,
        rot: (hash(i, 11) - 0.5) * 0.08,
      });
    if (i < chain.length - 1) {
      arrow({ x: x + w / 2 + 6, y }, { x: x + w / 2 + gap - 6, y }, { seed: 140 + i, width: 5, progress: k(t, at + 0.3, at + 0.55), bend: 0.25, head: 16 });
    }
    cx += w + gap;
  });
  if (t > 19) {
    write("every grant, with its path", 960, 950, { kind: "hand", size: 44, weight: 700, color: C.blue, progress: k(t, 20.3, 21.2) });
  }
}
