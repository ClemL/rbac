/** Act one: the question, the title, and why handing out access key-by-key falls apart. */

import { C, G, arc, ease, env, hash, k, lerp, pop, withAlpha, withTransform } from "../core";
import { ellipse, star, stroke } from "../ink";
import { scrap, tape } from "../paper";
import { CAST, RESOURCE_COLOR, icon, key, padlock, person, ticket, type ResourceKind } from "../props";
import { label, ransom, write } from "../text";

// ---------------------------------------------------------------------------------------------
// 1 · Who is allowed to do what?

export function drawIntro(t: number) {
  // The question, written large, then tucked up out of the way.
  const q = ease.inOutCubic(k(t, 7.9, 8.8));
  withTransform(960, lerp(470, 128, q), 0, lerp(1, 0.46, q), () => {
    write("Who is allowed", 0, -80, { kind: "marker", size: 132, progress: ease.outCubic(k(t, 0.4, 2.3)) });
    write("to do what?", 0, 70, { kind: "marker", size: 132, progress: ease.outCubic(k(t, 2.2, 3.9)) });
    stroke(
      [
        { x: -300, y: 150 },
        { x: 0, y: 160 },
        { x: 330, y: 146 },
      ],
      { seed: 5, width: 11, color: C.red, progress: ease.outCubic(k(t, 4.0, 4.6)) },
    );
  });

  // Key and lock doodles orbit the question, then get tossed away.
  const toss = ease.inBack(k(t, 7.6, 8.3));
  const bob = Math.sin(t * 2.2);
  key(lerp(330, -300, toss), 470 + bob * 12, 1.8 * pop(t, 4.4), -0.3 + bob * 0.05, C.mustard, 11);
  padlock(lerp(1600, 2300, toss), 470 - bob * 12, 1.6 * pop(t, 4.7), (Math.sin(t * 1.3) + 1) / 2, C.sky, 12);
  if (t < 8.3) {
    star(250, 250, 30, { seed: 1, progress: k(t, 5.0, 5.3), color: C.orange });
    star(1690, 760, 26, { seed: 2, progress: k(t, 5.2, 5.5), color: C.blue });
    star(1640, 230, 18, { seed: 3, progress: k(t, 5.4, 5.7), color: C.red });
  }

  // Title.
  ransom("RBAC", 960, 430, 190, t, 8.7, { stagger: 0.12, seed: 21 });
  write("sandbox", 960, 640, { kind: "marker", size: 120, progress: ease.outCubic(k(t, 9.5, 10.6)), color: C.blue });
  stroke(
    [
      { x: 740, y: 710 },
      { x: 960, y: 722 },
      { x: 1190, y: 706 },
    ],
    { seed: 8, width: 9, color: C.blue, progress: ease.outCubic(k(t, 10.5, 11.0)) },
  );
  label("a hands-on simulator for access control", 960, 810, {
    kind: "type",
    size: 36,
    bg: C.white,
    rot: -0.02,
    scale: pop(t, 11.2),
    edge: "torn",
  });
  if (t > 11.3) tape(575, 792, 90, -0.7, "pink", 4);

  // The cast peeks up from the bottom edge.
  const cast = [CAST.dana, CAST.raj, CAST.aisha, CAST.ben, CAST.marcus, CAST.lena];
  cast.forEach((p, i) => {
    const at = 12.2 + i * 0.14;
    const up = ease.outBack(k(t, at, at + 0.5));
    const x = 190 + i * 308 + (i >= 3 ? 0 : 0);
    const hop = Math.max(0, Math.sin((t - at) * 7 + i)) * 8 * k(t, at + 0.5, at + 0.8);
    person(p, x, lerp(1340, 1125, up) - hop, { scale: 0.95, rot: (hash(i, 4) - 0.5) * 0.14, mood: i === 3 ? "grin" : "happy", name: false, look: i < 3 ? 1 : -1 });
  });
}

// ---------------------------------------------------------------------------------------------
// 2 · Keys everywhere

const DOORS: ResourceKind[] = ["patients", "claims", "invoices", "reports", "users", "settings"];
const doorX = (i: number) => 585 + i * 150;
const DOOR_Y = 735;
const STAFF = [CAST.dana, CAST.raj, CAST.aisha, CAST.ben, CAST.lena, CAST.marcus];
const staffX = (i: number) => (i < 3 ? 190 + i * 150 : 1430 + (i - 3) * 150);
const STAFF_Y = 1030;

/** Tangle of strings, generated once: [person, door, colour, bend]. */
const TANGLE: [number, number, string, number][] = Array.from({ length: 34 }, (_, i) => [
  Math.floor(hash(i, 1) * 6),
  Math.floor(hash(i, 2) * 6),
  [C.red, C.blue, C.ink, C.teal][i % 4],
  (hash(i, 3) - 0.5) * 0.8,
]);

function yarn(pi: number, di: number, color: string, bend: number, progress: number, seed: number, px?: number) {
  const a = { x: (px ?? staffX(pi)) + 40, y: STAFF_Y - 95 };
  const b = { x: doorX(di) + 28, y: DOOR_Y + 12 };
  const mx = (a.x + b.x) / 2;
  const my = Math.max(a.y, b.y) + 40;
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const cx = mx + bend * 700;
    const cy = my + Math.abs(bend) * 260;
    pts.push({
      x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * cx + u * u * b.x,
      y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * cy + u * u * b.y,
    });
  }
  stroke(pts, { seed, width: 3.5, color, progress, double: false, amp: 1.5 });
}

export function drawKeys(t: number) {
  // Collage scenery.
  scrap({ key: "sky", w: 2300, h: 1150, color: C.sky, edge: "torn", pattern: "dots", patternColor: "rgba(255,255,255,0.35)" }, 960, 250, {
    rot: 0.012,
    wiggle: 0.3,
  });
  scrap({ key: "cloud1", w: 260, h: 120, color: C.white, shape: "cloud", edge: "cut" }, 250 + t * 6, 170, { wiggle: 0.5 });
  scrap({ key: "cloud2", w: 200, h: 90, color: C.white, shape: "cloud", edge: "cut" }, 1650 - t * 4, 120, { wiggle: 0.5 });
  scrap({ key: "grass", w: 2300, h: 380, color: C.leaf, edge: "torn", pattern: "stripes", patternColor: "rgba(60,140,70,0.18)" }, 960, 980, {
    rot: -0.01,
    wiggle: 0.3,
  });

  // The building.
  const bIn = pop(t, 0.1, 0.5);
  withTransform(960, 800, 0, bIn, () => {
    scrap({ key: "bldg", w: 1040, h: 520, color: "#f7f1e3", edge: "cut", pattern: "grid", patternColor: "rgba(120,90,50,0.08)" }, 0, -260, {
      wiggle: 0.3,
    });
    for (let i = 0; i < 7; i++) {
      scrap({ key: `win${i}`, w: 92, h: 70, color: C.sky, edge: "cut", shadow: 0.3 }, -420 + i * 140, -420, { wiggle: 0.5 });
    }
    scrap(
      {
        key: "redcross",
        w: 96,
        h: 96,
        color: C.white,
        shape: "circle",
        edge: "cut",
        paint: (c, w, h) => {
          c.fillStyle = C.red;
          c.fillRect(w / 2 - 12, 18, 24, h - 36);
          c.fillRect(18, h / 2 - 12, w - 36, 24);
        },
      },
      -560,
      -520,
      { rot: -0.1 },
    );
  });
  label("MERIDIAN HEALTH OPS", 960, 250, { kind: "marker", size: 52, bg: C.red, fg: C.white, rot: -0.015, scale: pop(t, 0.5), edge: "torn" });

  DOORS.forEach((d, i) => {
    const s = pop(t, 0.7 + i * 0.1);
    scrap({ key: `door:${d}`, w: 96, h: 150, color: RESOURCE_COLOR[d], shape: "arch", edge: "cut" }, doorX(i), DOOR_Y, {
      scale: s,
      wiggle: 0.5,
    });
    if (s > 0.1) {
      G.ctx.fillStyle = "#f4d58d";
      G.ctx.beginPath();
      G.ctx.arc(doorX(i) + 28, DOOR_Y + 12, 7 * s, 0, Math.PI * 2);
      G.ctx.fill();
    }
    scrap({ key: "badge", w: 104, h: 104, color: C.white, shape: "circle", edge: "cut", shadow: 0.6 }, doorX(i), 575, { scale: s });
    icon(d, doorX(i), 575, 0.72 * s, { seed: i, progress: k(t, 0.9 + i * 0.1, 1.6 + i * 0.1) });
  });

  // Staff pop up onto the grass.
  STAFF.forEach((p, i) => {
    const at = 1.8 + i * 0.12;
    const leaving = i === 5 ? ease.inOutCubic(k(t, 9.6, 11.2)) : 0;
    const mood = t > 8.2 ? (i % 2 ? "shock" : "worried") : "happy";
    person(p, lerp(staffX(i), 2150, leaving), STAFF_Y + (1 - ease.outBack(k(t, at, at + 0.45))) * 400, {
      scale: 0.82,
      mood: i === 5 && t > 9.6 ? "smirk" : mood,
      look: i < 3 ? 1 : -1,
      hop: leaving > 0 && leaving < 1 ? Math.abs(Math.sin(t * 12)) * 14 : 0,
    });
  });

  // First, three tidy hand-offs...
  const neat: [number, number, number][] = [
    [0, 0, 3.6],
    [1, 1, 4.6],
    [2, 2, 5.6],
  ];
  neat.forEach(([pi, di, at], n) => {
    yarn(pi, di, C.red, 0.02, ease.outCubic(k(t, at, at + 0.7)), 400 + n);
    const kp = ease.inOutCubic(k(t, at, at + 0.7));
    if (kp > 0 && kp < 1) {
      const p = arc({ x: staffX(pi), y: STAFF_Y - 230 }, { x: doorX(di), y: DOOR_Y }, 160, kp);
      key(p.x, p.y, 0.8, kp * 6, C.mustard, 30 + n);
    }
    if (t > at + 0.7 && t < 8.2) padlock(doorX(di), DOOR_Y - 20, 0.45, 1, C.mustard, 40 + n);
  });

  // ...then everyone joins, moves and leaves, and the strings multiply.
  TANGLE.forEach(([pi, di, color, bend], i) => {
    const at = 7.2 + i * 0.1;
    const mx = pi === 5 ? lerp(staffX(5), 2150, ease.inOutCubic(k(t, 9.6, 11.2))) : undefined;
    yarn(pi, di, color, bend, ease.outCubic(k(t, at, at + 0.4)), 500 + i, mx);
  });
  const count = t < 3.6 ? 0 : t < 7.2 ? Math.min(3, 1 + Math.floor((t - 3.6) / 1.0)) : Math.min(212, 3 + Math.floor((t - 7.2) ** 2 * 9));
  if (t > 3.5) {
    // One paper strip, with the changing number written live, so nothing is re-baked per frame.
    const s = pop(t, 3.5);
    scrap({ key: "keycount", w: 430, h: 64, color: C.yellow, edge: "cut" }, 1640, 440, { scale: s, rot: 0.04 });
    withTransform(1640, 440, 0.04, s, () => {
      write(`keys handed out: ${count}`, 0, 2, { kind: "type", size: 34, jitter: 0 });
    });
  }
  if (t > 11.3) {
    write("?!", 1330, 980, { kind: "marker", size: 120, color: C.red, progress: k(t, 11.3, 11.7), rot: 0.2 });
    write("who has what?", 380, 700, { kind: "hand", size: 56, weight: 700, color: C.red, progress: k(t, 11.6, 12.4), rot: -0.1 });
  }
  if (t > 10.9 && t < 13.8) {
    write("…still has keys", 1600, 740, { kind: "hand", size: 44, weight: 700, color: C.red, progress: k(t, 11.0, 11.8), rot: -0.05 });
  }

  // RBAC card slides over the mess.
  const card = ease.outCubic(k(t, 14.2, 15.0));
  if (card > 0) {
    withTransform(lerp(2600, 960, card), 540, -0.02, 1, () => {
      scrap({ key: "rbaccard", w: 1060, h: 640, color: C.white, edge: "torn", pattern: "ruled" }, 0, 0, { wiggle: 0.6 });
      tape(-470, -300, 160, -0.6, "mint", 7);
      tape(470, -300, 160, 0.6, "mint", 8);
      write("RBAC = three layers", 30, -215, { kind: "marker", size: 72, progress: k(t, 15.0, 16.0) });
      const rows: [string, string, () => void][] = [
        ["1", "permissions — what can be done", () => ticket("patients:read", 0, 0, { scale: 0.5, rot: -0.05 })],
        ["2", "roles — bundles of permissions", () => scrap({ key: "mini-env", w: 110, h: 70, color: C.mint, edge: "cut" }, 0, 0, { rot: 0.05 })],
        ["3", "groups — teams that hold roles", () => scrap({ key: "mini-box", w: 110, h: 76, color: C.kraft, edge: "torn" }, 0, 0, { rot: -0.04 })],
      ];
      rows.forEach(([n, text, glyph], i) => {
        const at = 16.1 + i * 0.9;
        const y = -80 + i * 130;
        withAlpha(k(t, at, at + 0.2), () => {
          withTransform(0, y, 0, 1, () => {
            withTransform(-300, 0, 0, pop(t, at), glyph);
          });
        });
        write(n, -455, y, { kind: "marker", size: 70, color: C.red, progress: k(t, at, at + 0.2) });
        write(text, -190, y, { kind: "hand", size: 52, weight: 700, align: "left", progress: ease.outCubic(k(t, at + 0.1, at + 0.9)) });
      });
    });
  }
  // Emphasis circle round the word RBAC.
  if (t > 16.0 && t < 20.5) {
    withAlpha(env(t, 16.0, 20.5, 0.2), () =>
      ellipse(715, 327, 125, 62, { seed: 9, width: 6, color: C.red, progress: k(t, 16.0, 16.6), turns: 1.15 }),
    );
  }
}
