/** Act three: how real directories drift, then a guided tour of the sandbox console itself. */

import { MISSIONS } from "@/lib/tasks";

import { C, G, INK, clamp, ease, env, hash, k, lerp, pop, withAlpha, withTransform } from "../core";
import { arrow, check, ellipse, hatch, line, rect, stroke, zigzag } from "../ink";
import { pin, scrap, tape } from "../paper";
import { CAST, boxBack, boxFront, clickRing, cursor, envelopeBack, envelopeFront, key, person, stamp, ticket } from "../props";
import { label, write } from "../text";

// ---------------------------------------------------------------------------------------------
// 6 · Drift

const CARD_Y = 590;
const cardX = [330, 960, 1590];

function caseCard(i: number, title: string, t: number, reveal: number) {
  const x = cardX[i];
  const s = pop(t, 0.5 + i * 0.2);
  scrap({ key: `case${i}`, w: 540, h: 700, color: C.paper, edge: "torn", pattern: i === 1 ? "ruled" : "grid", patternColor: "rgba(58,103,201,0.12)" }, x, CARD_Y, {
    scale: s,
    rot: [-0.02, 0.012, -0.008][i],
    wiggle: 0.4,
  });
  if (s > 0.5) pin(x, CARD_Y - 330, [C.red, C.blue, C.green][i]);
  label(`CASE #${i + 1}`, x - 170, CARD_Y - 300, { kind: "print", size: 26, weight: 800, bg: C.ink, fg: C.white, rot: -0.06, scale: s });
  // Before the camera arrives, each card is just a big question mark.
  withAlpha(1 - k(t, reveal - 0.2, reveal + 0.2), () => write("?", x, CARD_Y + 20, { kind: "marker", size: 260, color: "rgba(38,35,46,0.25)", progress: s }));
  write(title, x + 40, CARD_Y - 250, { kind: "hand", size: 46, weight: 700, progress: ease.outCubic(k(t, reveal, reveal + 0.8)) });
}

export function drawDrift(t: number) {
  // Heading card.
  scrap({ key: "drifthead", w: 860, h: 130, color: C.white, edge: "torn" }, 960, 118, { scale: pop(t, 0.1), rot: -0.012 });
  if (t > 0.3) {
    tape(560, 70, 110, -0.3, "yellow", 51);
    tape(1370, 70, 110, 0.3, "yellow", 52);
  }
  write("When directories drift…", 960, 120, { kind: "marker", size: 66, progress: ease.outCubic(k(t, 0.5, 1.6)), color: C.redDeep });

  caseCard(0, "Ben, the intern", t, 5.2);
  caseCard(1, "Marcus, who left", t, 11.2);
  caseCard(2, "Aisha, doing both", t, 17.2);

  // Case 1 — a nested group quietly hands an intern admin rights.
  {
    const x = cardX[0];
    const a = pop(t, 5.6);
    withTransform(x, 450, 0, a, () => {
      boxBack(380, 170, 0, 0, C.lilac);
      person(CAST.lena, 60, 50, { scale: 0.42, name: false, look: -1 });
      boxFront("Platform Admins", 380, 170, 0, 0, C.lilac, { size: 28 });
    });
    const b = pop(t, 6.0);
    withTransform(x - 60, 770, 0, b, () => boxBack(250, 190, 0, 0, C.yellow));
    person(CAST.ben, x - 60, 810, { scale: 0.55 * pop(t, 6.3), mood: t > 8.4 ? "grin" : "happy", name: false, look: 1 });
    withTransform(x - 60, 770, 0, b, () => boxFront("Interns", 250, 190, 0, 0, C.yellow, { size: 28 }));
    arrow({ x: x - 60, y: 668 }, { x: x - 40, y: 540 }, { seed: 601, width: 6, color: C.red, progress: k(t, 6.9, 7.4), bend: 0.2 });
    write("nested inside!", x + 105, 610, { kind: "hand", size: 38, weight: 700, color: C.red, progress: k(t, 7.3, 8.0), rot: -0.08 });
    ticket("users:delete", x + 150, 735, { scale: 0.6 * pop(t, 8.2), rot: 0.08 });
    ticket("settings:update", x + 150, 800, { scale: 0.6 * pop(t, 8.5), rot: -0.06 });
    stamp("ESCALATED", x + 20, 895, t, 9.6, { rot: -0.08, scale: 0.72 });
  }

  // Case 2 — the leaver whose account still works.
  {
    const x = cardX[1];
    label("last day: Friday", x - 110, 390, { kind: "type", size: 28, bg: C.pink, rot: -0.08, scale: pop(t, 11.9), edge: "torn" });
    const swing = Math.sin(t * 3) * 0.25;
    person(CAST.marcus, x - 30, 790, { scale: 0.95 * pop(t, 11.5), mood: t > 13.2 ? "smirk" : "neutral", ghost: 0.45, look: 1 });
    if (t > 14.1) {
      stroke(
        [
          { x: x - 200, y: 520 },
          { x: x - 190, y: 600 },
        ],
        { seed: 610, width: 3, color: "#6f6a64", double: false },
      );
      key(x - 190, 630, 0.8 * pop(t, 14.1), 1.4 + swing, C.mustard, 611);
      key(x - 160, 650, 0.7 * pop(t, 14.3), 1.9 - swing, C.sky, 612);
    }
    const e = pop(t, 12.9);
    withTransform(x + 150, 560, 0.1, 0.45 * e, () => {
      envelopeBack(C.lilac, 0, 0, { open: 0 });
      envelopeFront("Platform Admin", C.lilac, 0, 0, { closed: 1 });
    });
    if (e > 0.6) pin(x + 150, 520, C.red);
    arrow({ x: x + 110, y: 620 }, { x: x + 10, y: 700 }, { seed: 620, width: 6, color: C.red, progress: k(t, 13.5, 13.9), bend: -0.2 });
    write("pinned straight on", x + 110, 460, { kind: "hand", size: 38, weight: 700, color: C.red, progress: k(t, 13.7, 14.5), rot: 0.06 });
    stamp("STILL ACTIVE", x, 895, t, 15.6, { rot: 0.06, scale: 0.72 });
  }

  // Case 3 — one person can both raise and release money.
  {
    const x = cardX[2];
    const worried = t > 19.6;
    person(CAST.aisha, x, 800, { scale: 0.95 * pop(t, 17.5), mood: worried ? "worried" : "happy", look: 0 });
    const squeeze = ease.inOutCubic(k(t, 19.0, 19.6));
    const jolt = t > 19.6 && t < 20.4 ? Math.sin(t * 50) * 4 : 0;
    ticket("invoices:create", lerp(x - 130, x - 105, squeeze) + jolt, 480, { scale: 0.62 * pop(t, 18.2), rot: 0.1 });
    ticket("invoices:approve", lerp(x + 130, x + 105, squeeze) - jolt, 545, { scale: 0.62 * pop(t, 18.5), rot: -0.08 });
    if (t > 19.6) {
      const flicker = hash(G.boil, 5) > 0.3 ? 1 : 0.4;
      withAlpha(flicker, () => {
        zigzag({ x: x - 10, y: 440 }, { x: x + 10, y: 590 }, { seed: 630, width: 7, color: C.mustard, size: 24 });
        zigzag({ x: x - 10, y: 440 }, { x: x + 10, y: 590 }, { seed: 631, width: 3, color: C.red, size: 24 });
      });
    }
    write("raise it + release it = ✗", x + 30, 400, { kind: "hand", size: 36, weight: 700, color: C.red, progress: k(t, 21.2, 22.2) });
    stamp("SoD CONFLICT", x, 895, t, 20.6, { rot: -0.06, scale: 0.72 });
  }

  // Zoom out: all three cases tied together with red yarn.
  if (t > 24.0) {
    const p = k(t, 24.0, 24.9);
    stroke(
      [
        { x: cardX[0], y: CARD_Y - 330 },
        { x: 645, y: CARD_Y - 250 },
        { x: cardX[1], y: CARD_Y - 330 },
        { x: 1275, y: CARD_Y - 245 },
        { x: cardX[2], y: CARD_Y - 330 },
      ],
      { seed: 640, width: 4, color: C.red, progress: p, double: false },
    );
  }
}

// ---------------------------------------------------------------------------------------------
// 7 · The sandbox console, sketched on a sheet of paper

const PANEL = { x: 150, y: 205, w: 600, h: 790 };
const CONTENT = { x: 790, y: 280, w: 980, h: 715 };
const TABS: [string, number, number][] = [
  ["Users", 800, 130],
  ["Groups", 950, 150],
  ["Roles", 1120, 130],
  ["Impersonate", 1270, 210],
];
const USERS = ["Dana Whitfield", "Marcus Reyes", "Aisha Rahman", "Tom Okafor", "Priya Nair", "Ben Castellanos", "Lena Fischer"];

/** Cursor keyframes: [time, x, y]. */
const PATH: [number, number, number][] = [
  [9.9, 1300, 1150],
  [10.8, 420, 370],
  [11.2, 420, 370],
  [12.0, 860, 250],
  [12.5, 860, 250],
  [13.0, 900, 340],
  [13.5, 900, 340],
  [14.1, 1590, 470],
  [14.5, 1590, 470],
  [14.9, 1560, 530],
  [15.6, 1560, 530],
  [16.4, 1850, 1150],
  [20.3, 1850, 1150],
  [21.0, 1370, 250],
  [21.8, 1370, 250],
  [22.7, 1040, 455],
  [23.4, 1040, 455],
  [25.2, 1040, 455],
  [25.9, 1040, 570],
  [29.5, 1040, 570],
  [30.5, 1900, 1200],
];
const CLICKS = [11.0, 12.4, 13.2, 14.3, 15.0, 21.1, 23.0, 26.0];

function cursorAt(t: number): { x: number; y: number } | null {
  if (t < PATH[0][0] || t > PATH[PATH.length - 1][0]) return null;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [t0, x0, y0] = PATH[i];
    const [t1, x1, y1] = PATH[i + 1];
    if (t <= t1) {
      const u = ease.inOutCubic((t - t0) / (t1 - t0 || 1));
      return { x: lerp(x0, x1, u), y: lerp(y0, y1, u) };
    }
  }
  return null;
}

function button(text: string, x: number, y: number, w: number, h: number, seed: number, progress: number, fill?: string) {
  if (fill) {
    hatch({ x, y, w, h }, (c) => c.rect(x + 4, y + 4, w - 8, h - 8), { seed: seed + 5, color: fill, gap: 12, progress: 1 });
  }
  rect(x, y, w, h, { seed, width: 4, progress });
  write(text, x + w / 2, y + h / 2 + 2, { kind: "hand", size: 32, weight: 700, progress: clamp(progress * 1.4 - 0.4) });
}

export function drawSandbox(t: number) {
  // The sheet slides up onto the desk.
  const up = ease.outCubic(k(t, 0.1, 1.0));
  withTransform(0, lerp(1100, 0, up), 0, 1, () => {
    scrap({ key: "console-sheet", w: 1720, h: 960, color: C.white, edge: "cut", pattern: "grid", patternColor: "rgba(58,103,201,0.06)" }, 960, 545, {
      rot: -0.004,
      wiggle: 0.3,
    });
    if (up > 0.9) {
      tape(140, 90, 140, -0.7, "blue", 71);
      tape(1780, 90, 140, 0.7, "blue", 72);
    }
    drawConsole(t);
  });

  // Sticky note: that's you.
  scrap(
    {
      key: "sticky-you",
      w: 250,
      h: 200,
      color: C.yellow,
      edge: "cut",
      shadow: 1.2,
      paint: (c, w, h) => {
        c.font = `700 40px ${G.fonts.hand}`;
        c.fillStyle = INK;
        c.textAlign = "center";
        c.fillText("you're the", w / 2, h / 2 - 10);
        c.fillText("new admin!", w / 2, h / 2 + 34);
      },
    },
    1720,
    170,
    { scale: pop(t, 2.2) * (1 - k(t, 5.0, 5.3)), rot: 0.08 },
  );

  const c = cursorAt(t);
  if (c) {
    const pressed = CLICKS.some((ct) => t >= ct && t < ct + 0.15) ? 1 : 0;
    CLICKS.forEach((ct) => clickRing(c.x + 4, c.y + 4, t, ct));
    cursor(c.x, c.y, pressed, 1.1);
  }
}

function drawConsole(t: number) {
  const draw = (at: number) => ease.outCubic(k(t, at, at + 0.9));
  const closed = t > 19.0 ? 1 : 0;

  // Header.
  write("Meridian Health Ops", 170, 135, { kind: "marker", size: 40, align: "left", progress: draw(1.0) });
  write("Identity & Access Administration", 610, 138, { kind: "hand", size: 32, align: "left", color: C.slate, progress: draw(1.2) });
  line(130, 180, 1790, 184, { seed: 700, width: 3, progress: draw(1.1) });
  rect(1270, 110, 250, 52, { seed: 701, width: 3.5, progress: draw(1.5), color: closed ? C.green : INK });
  write(`${closed}/13 reviews closed`, 1395, 137, { kind: "hand", size: 30, weight: 700, color: closed ? C.green : INK, progress: draw(1.6) });
  if (t > 19.0 && t < 20.5) ellipse(1395, 137, 150, 42, { seed: 702, width: 5, color: C.green, progress: k(t, 19.0, 19.4) });
  button("Reset tenant", 1560, 108, 200, 56, 703, draw(1.7));

  // Review queue.
  const P = PANEL;
  rect(P.x, P.y, P.w, P.h, { seed: 710, width: 4, progress: draw(1.4) });
  write("Access reviews", P.x + 25, P.y + 42, { kind: "hand", size: 42, weight: 700, align: "left", progress: draw(1.9) });
  rect(P.x + 25, P.y + 78, P.w - 50, 20, { seed: 711, width: 3, progress: draw(2.0) });
  const fill = (1 / 13) * ease.outCubic(k(t, 19.0, 19.6));
  if (fill > 0) {
    G.ctx.fillStyle = C.green;
    G.ctx.fillRect(P.x + 28, P.y + 81, (P.w - 56) * fill, 14);
  }
  const expand = ease.inOutCubic(k(t, 11.1, 11.6));
  const criteria = MISSIONS[0].checks.map((c) => c.label);
  const expandH = (criteria.length * 46 + 90) * expand;
  G.ctx.save();
  G.ctx.beginPath();
  G.ctx.rect(P.x + 4, P.y + 110, P.w - 8, P.h - 114);
  G.ctx.clip();
  MISSIONS.slice(0, 10).forEach((m, i) => {
    const at = 5.4 + i * 0.16;
    const y = P.y + 150 + i * 66 + (i > 0 ? expandH : 0);
    const cy = y;
    const done = i === 0 && t > 19.0;
    ellipse(P.x + 42, cy, 14, 14, { seed: 720 + i, width: 3.5, progress: k(t, at, at + 0.3), color: done ? C.green : INK });
    if (done) check(P.x + 44, cy, 30, { seed: 740, color: C.green, progress: k(t, 19.0, 19.3) });
    write(`${i + 1}. ${m.title}`, P.x + 72, cy + 2, {
      kind: "hand",
      size: 30,
      weight: 700,
      align: "left",
      color: done ? C.green : INK,
      progress: ease.outCubic(k(t, at, at + 0.6)),
    });
    const dc = m.difficulty === "Starter" ? C.green : m.difficulty === "Core" ? C.blue : C.orange;
    if (t > at + 0.3) {
      G.ctx.fillStyle = dc;
      G.ctx.beginPath();
      G.ctx.arc(P.x + P.w - 30, cy, 7, 0, Math.PI * 2);
      G.ctx.fill();
    }
    if (i === 0 && expand > 0) {
      withAlpha(expand, () => {
        write("Dana starts Monday with no access at all…", P.x + 72, cy + 48, { kind: "hand", size: 26, align: "left", color: C.slate });
        criteria.forEach((label, j) => {
          const ry = cy + 100 + j * 46;
          const tick = 16.6 + j * 0.5;
          const passed = t > tick;
          ellipse(P.x + 88, ry, 11, 11, { seed: 760 + j, width: 3, color: passed ? C.green : C.slate });
          if (passed) check(P.x + 90, ry, 24, { seed: 770 + j, color: C.green, progress: k(t, tick, tick + 0.25) });
          write(label, P.x + 112, ry + 2, { kind: "hand", size: 25, weight: 600, align: "left", color: passed ? C.green : INK, jitter: 0.5 });
          if (passed) line(P.x + 112, ry + 2, P.x + 112 + label.length * 9.4 * k(t, tick, tick + 0.3), ry + 2, { seed: 780 + j, width: 2.5, color: C.green, double: false });
        });
      });
    }
  });
  G.ctx.restore();

  // Margin notes during the close-up on the queue.
  withAlpha(env(t, 6.8, 10.2, 0.3), () => {
    write("13 reviews", 900, 360, { kind: "marker", size: 58, color: C.red, progress: k(t, 6.8, 7.4), rot: -0.05 });
    arrow({ x: 890, y: 400 }, { x: 760, y: 470 }, { seed: 790, width: 6, color: C.red, progress: k(t, 7.2, 7.6) });
    write("each one a planted defect", 960, 560, { kind: "hand", size: 46, weight: 700, color: C.red, progress: k(t, 7.8, 8.8), rot: -0.04 });
  });

  // Tabs.
  const imp = t > 21.1;
  TABS.forEach(([name, x, w], i) => {
    const active = imp ? i === 3 : t > 12.4 ? i === 0 : false;
    const p = draw(2.2 + i * 0.12);
    if (active) hatch({ x, y: 208, w, h: 48 }, (c) => c.rect(x + 3, 211, w - 6, 42), { seed: 800 + i, color: C.yellow, gap: 12, progress: 1 });
    rect(x, 208, w, 48, { seed: 810 + i, width: 3.5, progress: p });
    write(name, x + w / 2, 234, { kind: "hand", size: 32, weight: 700, progress: p });
  });
  rect(CONTENT.x, CONTENT.y, CONTENT.w, CONTENT.h, { seed: 820, width: 4, progress: draw(2.6) });

  if (!imp) drawUsersTab(t, draw);
  else drawImpersonateTab(t);

  if (t > 16.4 && t < 20.0) {
    write("re-graded instantly", 1200, 890, { kind: "marker", size: 50, color: C.green, progress: k(t, 16.5, 17.3), rot: -0.03 });
  }
}

function drawUsersTab(t: number, draw: (at: number) => number) {
  const X = CONTENT.x;
  USERS.forEach((u, i) => {
    const y = 330 + i * 58;
    if (i === 0 && t > 13.2) hatch({ x: X + 8, y: y - 24, w: 280, h: 48 }, (c) => c.rect(X + 10, y - 22, 276, 44), { seed: 830, color: C.sky, gap: 12, progress: 1 });
    write(u, X + 30, y, { kind: "hand", size: 30, weight: 600, align: "left", progress: draw(10.3 + i * 0.08) });
  });
  line(X + 300, CONTENT.y + 10, X + 300, CONTENT.y + CONTENT.h - 10, { seed: 831, width: 3, progress: draw(10.2) });
  if (t < 13.2) {
    write("select someone…", X + 640, 520, { kind: "hand", size: 36, color: C.slate, progress: draw(10.6) });
    return;
  }
  const D = X + 330;
  const show = (at: number) => ease.outCubic(k(t, at, at + 0.5));
  write("Dana Whitfield", D, 335, { kind: "marker", size: 44, align: "left", progress: show(13.3) });
  write("Clinical Nurse (new hire)", D, 385, { kind: "hand", size: 30, align: "left", color: C.slate, progress: show(13.4) });
  write("Groups", D, 470, { kind: "hand", size: 32, weight: 700, align: "left", progress: show(13.5) });
  button("+ Add to group", 1480, 440, 230, 56, 840, show(13.6));
  if (t > 15.0) label("Clinical Staff", D + 120, 530, { kind: "marker", size: 28, bg: C.kraft, edge: "torn", scale: pop(t, 15.0), rot: -0.03 });
  else write("(none)", D + 40, 530, { kind: "hand", size: 30, color: C.slate, progress: show(13.6) });
  write("Effective permissions", D, 620, { kind: "hand", size: 32, weight: 700, align: "left", progress: show(13.7) });
  if (t < 15.1) write("nothing yet", D + 110, 690, { kind: "hand", size: 30, color: C.slate, progress: show(13.8) });
  ["patients:read", "patients:update", "claims:read"].forEach((p, i) => {
    ticket(p, D + 140 + i * 280, 690, { scale: 0.78 * pop(t, 15.2 + i * 0.18), rot: (hash(i, 3) - 0.5) * 0.1 });
  });
  write("via Clinical Staff → Clinical Nurse", D + 330, 790, { kind: "hand", size: 34, weight: 700, color: C.green, progress: k(t, 15.8, 16.6) });

  // Group picker.
  const open = t > 14.35 && t < 15.05;
  if (open) {
    const g = ["Clinical Staff", "Physicians", "Billing", "Compliance"];
    G.ctx.fillStyle = C.white;
    G.ctx.fillRect(1470, 500, 260, g.length * 50 + 12);
    rect(1470, 500, 260, g.length * 50 + 12, { seed: 850, width: 3.5 });
    g.forEach((name, i) => {
      if (i === 0) hatch({ x: 1474, y: 506, w: 252, h: 48 }, (c) => c.rect(1476, 508, 248, 44), { seed: 851, color: C.sky, gap: 12, progress: 1 });
      write(name, 1490, 530 + i * 50, { kind: "hand", size: 30, weight: 600, align: "left" });
    });
  }
}

function drawImpersonateTab(t: number) {
  const X = CONTENT.x;
  const show = (at: number) => ease.outCubic(k(t, at, at + 0.5));
  write("Acting as:", X + 40, 340, { kind: "hand", size: 34, weight: 700, align: "left", progress: show(21.2) });
  rect(X + 200, 312, 340, 56, { seed: 860, width: 3.5, progress: show(21.3) });
  write("Dana Whitfield  ▾", X + 370, 341, { kind: "hand", size: 32, weight: 600, progress: show(21.4) });
  const btns: [string, number, number][] = [
    ["Read patients", 880, 420],
    ["Update patients", 1250, 420],
    ["Delete user", 880, 530],
    ["Approve invoice", 1250, 530],
  ];
  btns.forEach(([name, x, y], i) => {
    const hit = (i === 0 && t > 23.0 && t < 25.8) || (i === 2 && t > 26.0);
    button(name, x, y, 320, 72, 870 + i * 3, show(21.5 + i * 0.1), hit ? (i === 0 ? C.leaf : C.pink) : undefined);
  });
  if (t > 23.0 && t < 25.8) {
    stamp("200 ALLOWED", 1270, 760, t, 23.25, { color: C.green, rot: -0.06, scale: 0.9 });
    write("patients:read via Clinical Staff → Clinical Nurse", 1280, 900, { kind: "hand", size: 34, weight: 700, color: C.green, progress: k(t, 23.6, 24.6) });
  }
  if (t > 26.0) {
    stamp("403 DENIED", 1270, 760, t, 26.25, { color: C.red, rot: 0.06, scale: 0.9 });
    write("no role on Dana's account grants users:delete", 1280, 900, { kind: "hand", size: 34, weight: 700, color: C.red, progress: k(t, 26.6, 27.6) });
  }
}
