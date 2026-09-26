/** Act four: why shortcuts fail, the full set of reviews, and the hand-off to the viewer. */

import { MISSIONS } from "@/lib/tasks";

import { C, G, INK, arc, ease, env, font, hash, k, lerp, pop, withAlpha, withTransform, type Pt } from "../core";
import { arrow, burst, cross, ellipse, hatch, rect, scribble, star, stroke, check } from "../ink";
import { pin, scrap, tape } from "../paper";
import { CAST, clickRing, cursor, envelopeBack, envelopeFront, bulb, person, stamp, ticket } from "../props";
import { label, ransom, write } from "../text";

// ---------------------------------------------------------------------------------------------
// 8 · No shortcuts

function verdict(text: string, x: number, y: number, t: number, at: number, seed: number) {
  const s = pop(t, at);
  scrap({ key: `verdict:${seed}`, w: 420, h: 130, color: C.white, edge: "torn", pattern: "ruled" }, x, y, { scale: s, rot: (hash(seed, 1) - 0.5) * 0.06 });
  if (s > 0.6) {
    cross(x - 160, y, 46, { seed, color: C.red, progress: k(t, at + 0.2, at + 0.5) });
    write(text, x + 30, y, { kind: "hand", size: 32, weight: 700, color: C.redDeep, progress: k(t, at + 0.3, at + 1.1) });
  }
}

export function drawShortcuts(t: number) {
  write("No shortcuts", 960, 105, { kind: "marker", size: 92, progress: ease.outCubic(k(t, 0.1, 0.9)) });
  stroke(
    [
      { x: 700, y: 165 },
      { x: 960, y: 172 },
      { x: 1225, y: 160 },
    ],
    { seed: 900, width: 9, color: C.red, progress: k(t, 0.8, 1.2) },
  );

  const cards: [number, string, number][] = [
    [380, C.pink, 0.2],
    [960, C.sky, 5.2],
    [1540, C.mint, 10.2],
  ];
  cards.forEach(([x, color, at], i) => {
    scrap({ key: `sc-card${i}`, w: 500, h: 650, color: shadeLight(color), edge: "torn" }, x, 570, {
      scale: pop(t, at),
      rot: [-0.015, 0.01, -0.01][i],
      wiggle: 0.4,
    });
    if (t > at + 0.3) tape(x, 250, 130, (i - 1) * 0.1, ["pink", "blue", "mint"][i], 910 + i);
  });

  // Left: the tempting delete button.
  {
    const x = 380;
    const pressed = t > 1.6 && t < 1.9 ? 1 : 0;
    withAlpha(k(t, 0.3, 0.5), () => {
      scrap({ key: "btn-base", w: 280, h: 110, color: "#3b3640", shape: "circle", edge: "cut" }, x, 500);
      scrap(
        { key: "btn-top", w: 240, h: 120, color: C.red, shape: "circle", edge: "cut", shadow: 0.5 },
        x,
        468 + pressed * 16,
      );
    });
    label("DELETE ACCOUNT", x, 610, { kind: "print", size: 30, weight: 800, bg: C.white, scale: pop(t, 0.6) });
    write("Marcus Reyes", x, 340, { kind: "hand", size: 40, weight: 700, progress: k(t, 0.7, 1.4) });
    const c = t > 0.8 && t < 4.6 ? arc({ x: 700, y: 900 }, { x: x + 10, y: 470 }, 80, ease.inOutCubic(k(t, 0.8, 1.5))) : null;
    if (c) {
      clickRing(c.x, c.y, t, 1.6);
      cursor(c.x, c.y, pressed, 1.1);
    }
    verdict("Account still exists\n(audit retention)", x, 760, t, 2.3, 920);
    stamp("REJECTED", x, 470, t, 3.0, { rot: -0.14, scale: 0.8 });
  }

  // Centre: gutting a shared role.
  {
    const x = 960;
    const open = t > 5.8 ? 1 : 0;
    withTransform(x, 480, 0.02, 1.05 * pop(t, 5.4), () => {
      envelopeBack(C.yellow, 0, 0, { open });
      envelopeFront("Billing Analyst", C.yellow, 0, 0, { closed: 1 - open });
    });
    const spill = ["invoices:read", "invoices:create", "claims:read", "claims:update", "reports:read"];
    spill.forEach((p, i) => {
      const at = 6.0 + i * 0.12;
      const f = k(t, at, at + 1.2);
      if (f <= 0 || f >= 1) return;
      const dir = i % 2 ? 1 : -1;
      const px = x + dir * (60 + i * 50) * f;
      const py = 380 - 260 * Math.sin(f * Math.PI * 0.7) + 900 * f * f;
      ticket(p, px, py, { scale: 0.62, rot: dir * f * 3 });
    });
    write("delete every permission?", x, 340, { kind: "hand", size: 40, weight: 700, progress: k(t, 5.6, 6.4), alpha: 1 - k(t, 7.0, 7.2) });
    verdict("Billing still needs\ninvoice access", x, 760, t, 7.2, 930);
    stamp("REJECTED", x, 625, t, 7.6, { rot: 0.1, scale: 0.8 });
  }

  // Right: more than one honest fix.
  {
    const x = 1540;
    const a: Pt = { x: x - 170, y: 560 };
    const b: Pt = { x: x + 170, y: 560 };
    scrap({ key: "defect-dot", w: 90, h: 90, color: C.red, shape: "circle", edge: "cut" }, a.x, a.y, { scale: pop(t, 10.5) });
    write("!", a.x, a.y + 2, { kind: "marker", size: 60, color: C.white, progress: k(t, 10.6, 10.7) });
    scrap({ key: "fixed-dot", w: 90, h: 90, color: C.green, shape: "circle", edge: "cut" }, b.x, b.y, { scale: pop(t, 10.7) });
    if (t > 10.8) check(b.x + 2, b.y, 44, { seed: 940, color: C.white, width: 8 });
    arrow({ x: a.x + 40, y: a.y - 30 }, { x: b.x - 40, y: b.y - 30 }, { seed: 941, width: 6, color: C.blue, progress: k(t, 11.0, 11.8), bend: 0.75 });
    arrow({ x: a.x + 40, y: a.y + 30 }, { x: b.x - 40, y: b.y + 30 }, { seed: 942, width: 6, color: C.teal, progress: k(t, 11.8, 12.6), bend: -0.75 });
    write("fix A", x, 425, { kind: "hand", size: 38, weight: 700, color: C.blue, progress: k(t, 11.4, 11.9) });
    write("fix B", x, 705, { kind: "hand", size: 38, weight: 700, color: C.teal, progress: k(t, 12.2, 12.7) });
    bulb(x, 340, 0.9 * pop(t, 12.6), k(t, 12.8, 13.0), 943);
    if (t > 12.9) burst(x, 330, 55, { seed: 944, color: C.mustard, progress: k(t, 12.9, 13.6), rays: 10 });
    write("both pass ✓", x, 800, { kind: "marker", size: 48, color: C.green, progress: k(t, 12.9, 13.6) });
  }

  write("Think like an auditor, not a janitor.", 960, 1000, { kind: "marker", size: 58, progress: ease.outCubic(k(t, 13.3, 14.8)), color: C.ink });
}

function shadeLight(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(v + (255 - v) * 0.72);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

// ---------------------------------------------------------------------------------------------
// 9 · Thirteen reviews

const DIFF_COLOR = { Starter: C.green, Core: C.blue, Advanced: C.orange } as const;

function cardPos(i: number): Pt {
  if (i < 5) return { x: 220 + i * 370, y: 300 };
  if (i < 9) return { x: 405 + (i - 5) * 370, y: 560 };
  return { x: 405 + (i - 9) * 370, y: 820 };
}

function wrap(c: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (c.measureText(next).width > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function drawMontage(t: number) {
  write("Thirteen access reviews", 960, 95, { kind: "marker", size: 76, progress: ease.outCubic(k(t, 0.1, 1.1)), color: C.white, outline: INK, outlineWidth: 12 });

  MISSIONS.forEach((m, i) => {
    const p = cardPos(i);
    const at = 0.5 + i * 0.26;
    const drop = ease.outBack(k(t, at, at + 0.45));
    if (drop <= 0) return;
    const rot = (hash(i, 31) - 0.5) * 0.09;
    scrap(
      {
        key: `review-card:${m.id}`,
        w: 330,
        h: 200,
        color: C.white,
        edge: "cut",
        pattern: "ruled",
        patternColor: "rgba(58,103,201,0.18)",
        paint: (c, w) => {
          c.fillStyle = C.red;
          c.font = font("marker", 44);
          c.textBaseline = "top";
          c.fillText(String(i + 1), 58, 20);
          c.fillStyle = INK;
          c.font = font("hand", m.title.length > 34 ? 28 : 31, 700);
          wrap(c, m.title, w - 120).forEach((ln, li) => c.fillText(ln, 100, 22 + li * 34));
          c.fillStyle = "#6a6f7a";
          c.font = font("type", 18);
          c.fillText(m.category, 58, 160);
        },
      },
      p.x,
      lerp(p.y - 500, p.y, drop),
      { rot, alpha: Math.min(1, drop * 2) },
    );
    if (drop > 0.95) {
      pin(p.x, p.y - 92, DIFF_COLOR[m.difficulty]);
    }
  });

  // Legend.
  const legend: [string, string][] = [
    ["Starter", C.green],
    ["Core", C.blue],
    ["Advanced", C.orange],
  ];
  legend.forEach(([name, color], i) => {
    const x = 640 + i * 300;
    const s = pop(t, 4.4 + i * 0.15);
    if (s <= 0) return;
    withTransform(x, 1005, 0, s, () => {
      pin(-70, 0, color);
      label(name, 20, 0, { kind: "hand", size: 36, weight: 700, bg: C.white, rot: -0.03 });
    });
  });

  // Reviews 6 and 13 chain together: moving Raj leaves objects for the clean-up review.
  if (t > 8.6) {
    const a = cardPos(5);
    const b = cardPos(12);
    stroke(
      [
        { x: a.x, y: a.y - 92 },
        { x: a.x + 300, y: a.y + 140 },
        { x: b.x - 200, y: b.y - 40 },
        { x: b.x, y: b.y - 92 },
      ],
      { seed: 960, width: 5, color: C.red, progress: ease.inOutCubic(k(t, 8.6, 9.8)), double: false, amp: 3 },
    );
    write("chained!", 1010, 700, { kind: "marker", size: 50, color: C.red, progress: k(t, 9.8, 10.4), rot: -0.1, outline: C.white, outlineWidth: 10 });
  }
  if (t > 10.8) {
    ellipse(cardPos(0).x, cardPos(0).y, 205, 135, { seed: 961, width: 7, color: C.yellow, progress: k(t, 10.8, 11.5), turns: 1.15 });
    write("start here", cardPos(0).x + 40, cardPos(0).y + 160, { kind: "marker", size: 44, color: C.yellow, progress: k(t, 11.3, 12.0), rot: -0.06, outline: INK, outlineWidth: 10 });
  }
}

// ---------------------------------------------------------------------------------------------
// 10 · Your turn

const MESS: [number, number, number][] = [
  [260, 330, 60],
  [1650, 300, 70],
  [340, 820, 80],
  [1580, 850, 64],
  [1020, 940, 50],
  [700, 780, 46],
];

export function drawOutro(t: number) {
  const out = ease.inBack(k(t, 5.0, 5.6));
  withTransform(0, -out * 1300, 0, 1, () => {
    write("Nothing is saved.", 960, 190, { kind: "marker", size: 104, progress: ease.outCubic(k(t, 0.2, 1.2)) });
    write("Break things. Reset. Try again.", 960, 330, { kind: "hand", size: 66, weight: 700, color: C.blue, progress: ease.outCubic(k(t, 1.2, 2.4)) });

    // Mess that the reset cleans up.
    const cleaned = t > 3.6;
    MESS.forEach(([x, y, r], i) => {
      if (!cleaned) {
        scribble(x, y, r, { seed: 980 + i, color: [C.red, C.ink, C.blue][i % 3], progress: k(t, 0.4 + i * 0.25, 1.0 + i * 0.25), loops: 4 });
      } else if (t < 4.3) {
        burst(x, y, r * 0.6, { seed: 990 + i, color: C.mustard, progress: k(t, 3.6, 4.3), rays: 8 });
      } else if (t < 5.0) {
        star(x, y, 22, { seed: 995 + i, color: C.mustard, progress: 1 });
      }
    });
    if (!cleaned) {
      ticket("users:delete", 1500, 560, { scale: pop(t, 1.5), rot: 0.3 });
      ticket("settings:update", 420, 580, { scale: pop(t, 1.9), rot: -0.25 });
    }

    const bx = 960;
    const by = 600;
    const pressed = t > 3.5 && t < 3.7 ? 1 : 0;
    withTransform(bx, by + pressed * 8, 0, pop(t, 2.2) * (1 - pressed * 0.04), () => {
      hatch({ x: -230, y: -70, w: 460, h: 140 }, (c) => c.roundRect(-226, -66, 452, 132, 18), { seed: 970, color: C.mustard, gap: 16, progress: 1 });
      rect(-230, -70, 460, 140, { seed: 971, width: 6 });
      write("Reset tenant", 0, 4, { kind: "marker", size: 60 });
    });
    const c = t > 2.4 && t < 5.0 ? arc({ x: 1500, y: 1150 }, { x: bx + 60, y: by + 10 }, 60, ease.inOutCubic(k(t, 2.4, 3.3))) : null;
    if (c) {
      clickRing(c.x, c.y, t, 3.5);
      cursor(c.x, c.y, pressed, 1.2);
    }
  });

  // Part two: Dana is waiting.
  const inn = ease.outCubic(k(t, 5.2, 5.9));
  withTransform(0, (1 - inn) * 1300, 0, 1, () => {
    const hop = Math.max(0, Math.sin(t * 5)) * 10 * env(t, 7.8, 9.4, 0.2);
    person(CAST.dana, 430, 1050 - hop, { scale: 2.0, mood: t > 11 ? "grin" : "happy", look: 1, name: false, rot: Math.sin(t * 1.7) * 0.02 });
    label("Dana Whitfield · new nurse", 430, 1030, { kind: "type", size: 30, bg: C.white, rot: -0.03, edge: "torn" });

    const bub = pop(t, 6.0, 0.5);
    scrap({ key: "bubble", w: 760, h: 330, color: C.white, shape: "cloud", edge: "cut" }, 1010, 290, { scale: bub, rot: 0.01 });
    if (bub > 0.8) {
      const tail = [
        { x: 780, y: 400 },
        { x: 640, y: 520 },
        { x: 710, y: 400 },
      ];
      G.ctx.fillStyle = C.white;
      G.ctx.beginPath();
      tail.forEach((q, i) => (i ? G.ctx.lineTo(q.x, q.y) : G.ctx.moveTo(q.x, q.y)));
      G.ctx.fill();
      stroke([tail[0], tail[1], tail[2]], { seed: 1000, width: 4 });
      write("Hi! I start Monday.\nCan you set up my access?", 1010, 290, { kind: "hand", size: 54, weight: 700, progress: ease.outCubic(k(t, 6.3, 7.9)), lineHeight: 64 });
    }

    const card = pop(t, 9.4);
    scrap(
      {
        key: "review1-card",
        w: 620,
        h: 170,
        color: C.kraft,
        edge: "torn",
        paint: (c) => {
          c.fillStyle = INK;
          c.font = font("print", 24, 800);
          c.fillText("REVIEW #1 · STARTER", 34, 52);
          c.font = font("marker", 44);
          c.fillText("Onboard the new nurse", 34, 118);
        },
      },
      1330,
      600,
      { scale: card, rot: -0.03 },
    );
    if (card > 0.8) tape(1030, 540, 110, -0.6, "yellow", 1001);

    ransom("YOUR", 1070, 860, 104, t, 10.4, { seed: 71 });
    ransom("TURN", 1620, 870, 104, t, 10.9, { seed: 72 });
    if (t > 11.8) {
      star(1860, 760, 28, { seed: 1002, color: C.orange, progress: k(t, 11.8, 12.1) });
      star(900, 960, 22, { seed: 1003, color: C.blue, progress: k(t, 12.0, 12.3) });
      burst(1620, 870, 190, { seed: 1004, color: C.red, progress: k(t, 11.4, 12.2), rays: 12 });
    }
  });
}
