/**
 * The cast and the props: paper-doll people, resource icons, permission tickets, role envelopes,
 * group boxes, rubber stamps, keys, a cursor. Paper parts are baked scraps; faces, icons and
 * annotations are live marker so they keep boiling.
 */

import { isSensitive } from "@/lib/permissions";

import { C, G, INK, clamp, ease, font, hash, jit, k, makeCanvas, rng, strSeed, type Pt } from "./core";
import { check, ellipse, line, rect, stroke, type InkOpts } from "./ink";
import { bakeScrap, place, scrap, tape, type PlaceOpts } from "./paper";
import { label, measure, write } from "./text";

// ---------------------------------------------------------------------------------------------
// People

export type HairStyle = "short" | "long" | "bun" | "curly" | "bald" | "scarf" | "spiky" | "bob";
export type Extra = "nurse" | "doctor" | "glasses" | "intern" | "tie" | "headset" | "none";
export type Mood = "happy" | "neutral" | "worried" | "shock" | "sleep" | "smirk" | "grin";

export interface PersonSpec {
  id: string;
  name: string;
  shirt: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  extra?: Extra;
}

export const SKIN = ["#f1c7a3", "#d9a47c", "#b87b52", "#8a5634", "#f5d5b8", "#6b3f24"];
export const HAIR = { black: "#2a221e", brown: "#6b4226", blonde: "#e2b85c", red: "#b5502b", gray: "#a9a39a" };

export const CAST: Record<string, PersonSpec> = {
  dana: { id: "dana", name: "Dana", shirt: C.mint, skin: SKIN[0], hair: HAIR.red, hairStyle: "bun", extra: "nurse" },
  raj: { id: "raj", name: "Raj", shirt: C.white, skin: SKIN[2], hair: HAIR.black, hairStyle: "short", extra: "doctor" },
  ben: { id: "ben", name: "Ben", shirt: C.yellow, skin: SKIN[4], hair: HAIR.blonde, hairStyle: "spiky", extra: "intern" },
  marcus: { id: "marcus", name: "Marcus", shirt: C.sky, skin: SKIN[3], hair: HAIR.black, hairStyle: "curly", extra: "tie" },
  aisha: { id: "aisha", name: "Aisha", shirt: C.lilac, skin: SKIN[1], hair: C.teal, hairStyle: "scarf", extra: "glasses" },
  lena: { id: "lena", name: "Lena", shirt: C.orange, skin: SKIN[4], hair: HAIR.brown, hairStyle: "bob", extra: "headset" },
  sofia: { id: "sofia", name: "Sofia", shirt: C.pink, skin: SKIN[1], hair: HAIR.brown, hairStyle: "long", extra: "glasses" },
  nora: { id: "nora", name: "Nora", shirt: C.teal, skin: SKIN[5], hair: HAIR.black, hairStyle: "curly" },
  priya: { id: "priya", name: "Priya", shirt: C.red, skin: SKIN[2], hair: HAIR.black, hairStyle: "long" },
  tom: { id: "tom", name: "Tom", shirt: C.blue, skin: SKIN[0], hair: HAIR.gray, hairStyle: "short", extra: "glasses" },
  you: { id: "you", name: "You", shirt: C.mustard, skin: SKIN[1], hair: HAIR.brown, hairStyle: "short", extra: "none" },
};

export interface PersonOpts {
  scale?: number;
  rot?: number;
  mood?: Mood;
  alpha?: number;
  /** Eye direction, -1..1 horizontally. */
  look?: number;
  name?: boolean;
  /** Vertical hop in px (for little stop-motion bounces). */
  hop?: number;
  /** 0..1 desaturated "ghost" look for someone who left. */
  ghost?: number;
}

/** Draws a paper-doll person standing with the bottom of the torso at (x, y). */
export function person(spec: PersonSpec, x: number, y: number, o: PersonOpts = {}) {
  const ctx = G.ctx;
  // Canvas filters are very slow, so a "ghost" is a desaturated copy of the spec instead.
  const p = o.ghost
    ? {
        ...spec,
        id: `${spec.id}~ghost`,
        shirt: desaturate(spec.shirt, o.ghost),
        skin: desaturate(spec.skin, o.ghost * 0.6),
        hair: desaturate(spec.hair, o.ghost),
      }
    : spec;
  const s = o.scale ?? 1;
  if (s <= 0.01) return;
  const seed = strSeed(p.id);
  const tw = 128;
  const th = 150;
  const hd = 100;
  ctx.save();
  ctx.globalAlpha *= (o.alpha ?? 1) * (1 - (o.ghost ?? 0) * 0.3);
  ctx.translate(x, y - (o.hop ?? 0));
  ctx.rotate(o.rot ?? 0);
  ctx.scale(s, s);

  const headY = -th - hd * 0.32 + jit(seed, 11) * 0.8;
  const headTilt = jit(seed, 12) * 0.02;

  // Hair behind the head.
  const hairBack = (style: HairStyle): { w: number; h: number; dx: number; dy: number; shape: "circle" | "cloud" | "arch" } | null => {
    switch (style) {
      case "long":
        return { w: hd * 1.2, h: hd * 1.45, dx: 0, dy: hd * 0.22, shape: "arch" };
      case "bob":
        return { w: hd * 1.22, h: hd * 1.1, dx: 0, dy: hd * 0.04, shape: "arch" };
      case "curly":
        return { w: hd * 1.3, h: hd * 1.2, dx: 0, dy: -hd * 0.08, shape: "cloud" };
      case "scarf":
        return { w: hd * 1.3, h: hd * 1.55, dx: 0, dy: hd * 0.26, shape: "arch" };
      case "bun":
      case "short":
      case "spiky":
        return { w: hd * 1.08, h: hd * 1.02, dx: 0, dy: -hd * 0.08, shape: "circle" };
      default:
        return null;
    }
  };
  const hb = hairBack(p.hairStyle);
  if (hb) {
    scrap(
      { key: `hair:${p.id}`, w: hb.w, h: hb.h, color: p.hair, shape: hb.shape, edge: "cut", shadow: 0.7 },
      hb.dx,
      headY + hb.dy,
      { rot: headTilt, wiggle: 0.6 },
    );
  }
  if (p.hairStyle === "bun") {
    scrap({ key: `bun:${p.id}`, w: 52, h: 48, color: p.hair, shape: "circle", edge: "cut", shadow: 0.6 }, 0, headY - hd * 0.58, {
      wiggle: 0.6,
    });
  }

  // Torso.
  scrap(
    {
      key: `torso:${p.id}`,
      w: tw,
      h: th,
      color: p.shirt,
      shape: "torso",
      edge: "torn",
      paint: (c, w, h) => {
        c.strokeStyle = "rgba(0,0,0,0.18)";
        c.lineWidth = 3;
        if (p.extra === "doctor") {
          c.fillStyle = C.sky;
          c.beginPath();
          c.moveTo(w * 0.36, 8);
          c.lineTo(w / 2, h * 0.55);
          c.lineTo(w * 0.64, 8);
          c.closePath();
          c.fill();
          c.beginPath();
          c.moveTo(w / 2, h * 0.55);
          c.lineTo(w / 2, h);
          c.stroke();
        }
        if (p.extra === "tie") {
          c.fillStyle = C.red;
          c.beginPath();
          c.moveTo(w * 0.46, 10);
          c.lineTo(w * 0.54, 10);
          c.lineTo(w * 0.57, h * 0.62);
          c.lineTo(w / 2, h * 0.72);
          c.lineTo(w * 0.43, h * 0.62);
          c.closePath();
          c.fill();
        }
        if (p.extra === "nurse") {
          c.fillStyle = C.white;
          c.fillRect(w * 0.62, h * 0.4, 26, 18);
          c.fillStyle = C.red;
          c.fillRect(w * 0.62 + 10, h * 0.4 + 3, 6, 12);
          c.fillRect(w * 0.62 + 7, h * 0.4 + 6, 12, 6);
        }
        if (p.extra === "intern") {
          c.fillStyle = C.white;
          c.fillRect(w * 0.18, h * 0.42, 50, 24);
          c.fillStyle = C.red;
          c.font = `700 13px ${G.fonts.print}`;
          c.fillText("INTERN", w * 0.18 + 3, h * 0.42 + 17);
        }
        // Collar shadow.
        c.fillStyle = "rgba(0,0,0,0.1)";
        c.beginPath();
        c.ellipse(w / 2, 4, 24, 12, 0, 0, Math.PI);
        c.fill();
      },
    },
    0,
    -th / 2,
    { wiggle: 0.8 },
  );

  // Head.
  scrap({ key: `head:${p.id}`, w: hd, h: hd, color: p.skin, shape: "circle", edge: "cut", shadow: 0.6 }, 0, headY, {
    rot: headTilt,
    wiggle: 0.6,
  });

  ctx.save();
  ctx.translate(0, headY);
  ctx.rotate(headTilt);
  // Fringe / front hair.
  ctx.fillStyle = p.hair;
  if (p.hairStyle === "short" || p.hairStyle === "bun" || p.hairStyle === "bob" || p.hairStyle === "long") {
    ctx.beginPath();
    ctx.ellipse(0, -hd * 0.36, hd * 0.5, hd * 0.22, 0, Math.PI, 0);
    ctx.quadraticCurveTo(hd * 0.2, -hd * 0.22, -hd * 0.1, -hd * 0.28);
    ctx.quadraticCurveTo(-hd * 0.35, -hd * 0.2, -hd * 0.5, -hd * 0.36);
    ctx.fill();
  } else if (p.hairStyle === "spiky") {
    ctx.beginPath();
    ctx.moveTo(-hd * 0.52, -hd * 0.25);
    for (let i = 0; i <= 6; i++) {
      const xx = -hd * 0.52 + (i / 6) * hd * 1.04;
      ctx.lineTo(xx, i % 2 === 0 ? -hd * 0.28 : -hd * 0.62 - hash(seed, i) * 10);
    }
    ctx.lineTo(hd * 0.52, -hd * 0.1);
    ctx.lineTo(-hd * 0.52, -hd * 0.1);
    ctx.fill();
  } else if (p.hairStyle === "curly") {
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(-hd * 0.4 + i * hd * 0.13, -hd * 0.38 + Math.sin(i * 1.7) * 4, hd * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.hairStyle === "scarf") {
    ctx.beginPath();
    ctx.ellipse(0, -hd * 0.18, hd * 0.56, hd * 0.44, 0, Math.PI, 0);
    ctx.fill();
  }
  if (p.extra === "nurse") {
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.moveTo(-hd * 0.3, -hd * 0.46);
    ctx.lineTo(hd * 0.3, -hd * 0.46);
    ctx.lineTo(hd * 0.22, -hd * 0.72);
    ctx.lineTo(-hd * 0.22, -hd * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.red;
    ctx.fillRect(-4, -hd * 0.68, 8, 16);
    ctx.fillRect(-8, -hd * 0.64, 16, 8);
  }

  face(o.mood ?? "happy", hd, seed, o.look ?? 0, p);
  ctx.restore();

  if (p.extra === "doctor") {
    // Stethoscope.
    stroke(
      [
        { x: -30, y: -th + 8 },
        { x: -36, y: -th + 60 },
        { x: -14, y: -th + 88 },
        { x: 10, y: -th + 70 },
        { x: 14, y: -th + 10 },
      ],
      { seed: seed + 5, width: 4, color: "#4a4a55", double: false },
    );
    ctx.fillStyle = "#8b8f99";
    ctx.beginPath();
    ctx.arc(10, -th + 76, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.extra === "headset") {
    stroke(
      [
        { x: hd * 0.5, y: headY },
        { x: hd * 0.42, y: headY + hd * 0.34 },
        { x: hd * 0.12, y: headY + hd * 0.4 },
      ],
      { seed: seed + 6, width: 4, double: false },
    );
  }

  if (o.name !== false) {
    label(p.name, 0, 34, { kind: "hand", size: 36, weight: 700, bg: C.white, rot: (hash(seed, 1) - 0.5) * 0.12, padY: 4 });
  }
  ctx.restore();
}

function face(mood: Mood, hd: number, seed: number, look: number, p: PersonSpec) {
  const ctx = G.ctx;
  const ex = hd * 0.18;
  const ey = -hd * 0.02;
  const lx = look * 5;
  // Blink roughly every couple of seconds.
  const blinking = !G.reduced && hash(seed, Math.floor(G.T * 3)) < 0.06;
  ctx.fillStyle = INK;
  if (mood === "sleep" || blinking) {
    for (const sx of [-1, 1]) {
      line(sx * ex - 8 + lx, ey, sx * ex + 8 + lx, ey, { seed: seed + sx, width: 3.5, double: false });
    }
  } else {
    const r = mood === "shock" ? 8 : 5.5;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * ex + lx + jit(seed, sx + 3) * 0.6, ey, r * 0.85, r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      if (mood === "shock") {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(sx * ex + lx - 2, ey - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK;
      }
    }
  }
  if (p.extra === "glasses") {
    for (const sx of [-1, 1]) {
      ellipse(sx * ex + lx * 0.3, ey, 17, 14, { seed: seed + 20 + sx, width: 3, double: false, turns: 1.02 });
    }
    line(-ex + 16, ey - 2, ex - 16, ey - 2, { seed: seed + 23, width: 3, double: false });
  }
  // Cheeks.
  ctx.fillStyle = "rgba(231,112,112,0.28)";
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * hd * 0.3, hd * 0.14, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const my = hd * 0.2;
  const o: InkOpts = { seed: seed + 40, width: 4, double: false };
  switch (mood) {
    case "happy":
      stroke(arcPts(0, my - 8, 16, 0.25, Math.PI - 0.25), o);
      break;
    case "grin":
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(0, my - 6, 17, 0.1, Math.PI - 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e86a6a";
      ctx.beginPath();
      ctx.arc(0, my + 5, 8, Math.PI + 0.3, -0.3, false);
      ctx.fill();
      break;
    case "neutral":
      line(-12, my, 12, my, o);
      break;
    case "smirk":
      stroke(arcPts(6, my - 12, 14, 0.4, Math.PI - 0.9), o);
      break;
    case "worried":
      stroke(arcPts(0, my + 12, 14, Math.PI + 0.5, Math.PI * 2 - 0.5), o);
      line(-ex - 10, ey - 22, -ex + 8, ey - 16, { ...o, seed: seed + 41 });
      line(ex + 10, ey - 22, ex - 8, ey - 16, { ...o, seed: seed + 42 });
      break;
    case "shock":
      ellipse(0, my + 4, 9, 12, { ...o, turns: 1.05 });
      break;
    case "sleep":
      line(-8, my, 8, my, o);
      break;
  }
}

function arcPts(cx: number, cy: number, r: number, a0: number, a1: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = a0 + ((a1 - a0) * i) / 10;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

// ---------------------------------------------------------------------------------------------
// Resource icons (live marker)

export type ResourceKind = "patients" | "claims" | "invoices" | "reports" | "users" | "settings";

export const RESOURCE_COLOR: Record<ResourceKind, string> = {
  patients: C.red,
  claims: C.blue,
  invoices: C.green,
  reports: C.orange,
  users: C.lilac,
  settings: C.slate,
};

export function icon(kind: ResourceKind, x: number, y: number, s: number, o: Partial<InkOpts> = {}) {
  const ctx = G.ctx;
  const seed = (o.seed ?? 0) + strSeed(kind);
  const base: InkOpts = { seed, width: 5 * s, color: o.color ?? INK, progress: o.progress, alpha: o.alpha };
  const p = o.progress ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const b = { ...base, width: 5 };
  switch (kind) {
    case "patients": {
      const pts: Pt[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        pts.push({
          x: 2.3 * 16 * Math.sin(t) ** 3,
          y: -2.3 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 4,
        });
      }
      stroke(pts, { ...b, amp: 1.2 });
      stroke(
        [
          { x: -44, y: 0 },
          { x: -16, y: 0 },
          { x: -8, y: -16 },
          { x: 2, y: 18 },
          { x: 10, y: -6 },
          { x: 16, y: 0 },
          { x: 44, y: 0 },
        ],
        { ...b, seed: seed + 1, color: C.red, width: 4, progress: clamp(p * 1.4 - 0.4) },
      );
      break;
    }
    case "claims":
      stroke(
        [
          { x: -28, y: -38 },
          { x: 14, y: -38 },
          { x: 30, y: -22 },
          { x: 30, y: 40 },
          { x: -28, y: 40 },
          { x: -28, y: -38 },
        ],
        { ...b, amp: 1.2 },
      );
      for (let i = 0; i < 3; i++) line(-16, -14 + i * 14, 18, -14 + i * 14, { ...b, seed: seed + 3 + i, width: 3.5, progress: clamp(p * 2 - 1) });
      check(0, 30, 22, { ...b, seed: seed + 9, color: C.blue, progress: clamp(p * 2 - 1) });
      break;
    case "invoices": {
      const pts: Pt[] = [
        { x: -28, y: -40 },
        { x: 28, y: -40 },
        { x: 28, y: 36 },
      ];
      for (let i = 0; i <= 6; i++) pts.push({ x: 28 - (i * 56) / 6, y: i % 2 ? 44 : 34 });
      pts.push({ x: -28, y: -40 });
      stroke(pts, { ...b, amp: 1.2 });
      ctx.save();
      write("$", 0, -2, { kind: "marker", size: 44, color: C.green, progress: clamp(p * 2 - 1), jitter: 0.5 });
      ctx.restore();
      break;
    }
    case "reports":
      stroke(
        [
          { x: -36, y: -40 },
          { x: -36, y: 36 },
          { x: 40, y: 36 },
        ],
        { ...b, amp: 1.2 },
      );
      [18, 44, 30].forEach((hgt, i) => {
        const bx = -22 + i * 22;
        rect(bx, 30 - hgt, 14, hgt, { ...b, seed: seed + 10 + i, width: 4, progress: clamp(p * 2 - 1 - i * 0.1) });
      });
      break;
    case "users":
      ellipse(-14, -18, 13, 13, { ...b, turns: 1.05 });
      stroke(arcPts(-14, 24, 26, Math.PI, Math.PI * 2), { ...b, seed: seed + 2 });
      ellipse(20, -10, 11, 11, { ...b, seed: seed + 3, turns: 1.05, progress: clamp(p * 2 - 1) });
      stroke(arcPts(20, 26, 20, Math.PI + 0.2, Math.PI * 2), { ...b, seed: seed + 4, progress: clamp(p * 2 - 1) });
      break;
    case "settings": {
      const pts: Pt[] = [];
      const teeth = 8;
      for (let i = 0; i <= teeth * 4; i++) {
        const a = (i / (teeth * 4)) * Math.PI * 2;
        const r = i % 4 < 2 ? 38 : 28;
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      stroke(pts, { ...b, amp: 1 });
      ellipse(0, 0, 12, 12, { ...b, seed: seed + 5, turns: 1.05 });
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Permission tickets, role envelopes, group boxes


export function ticket(key: string, x: number, y: number, o: PlaceOpts & { size?: number; plain?: boolean } = {}) {
  const hot = !o.plain && isSensitive(key);
  return label(key, x, y, {
    ...o,
    kind: "type",
    size: o.size ?? 30,
    bg: hot ? C.red : "#fff4cf",
    fg: hot ? C.white : INK,
    shape: "ticket",
    edge: "cut",
    padX: 30,
    padY: 12,
  });
}

export const ENV_W = 300;
export const ENV_H = 190;

/** Back of an open envelope (with the flap folded up). Draw contents, then `envelopeFront`. */
export function envelopeBack(color: string, x: number, y: number, o: PlaceOpts & { open?: number } = {}) {
  const open = o.open ?? 1;
  // Flap: a triangle hinged on the top edge, shrinking as it closes.
  const flapH = ENV_H * 0.62;
  if (open > 0.02) {
    scrap(
      { key: `envflap:${color}`, w: ENV_W, h: flapH, color: shade(color, -0.12), shape: "tri", edge: "cut", shadow: 0.4 },
      x,
      y - ENV_H / 2,
      { ...o, ay: 0, sy: -open, wiggle: 0.5 },
    );
  }
  scrap({ key: `envback:${color}`, w: ENV_W, h: ENV_H, color: shade(color, -0.22), edge: "cut", shadow: 0.8 }, x, y, { ...o, wiggle: 0.5 });
}

export function envelopeFront(name: string, color: string, x: number, y: number, o: PlaceOpts & { closed?: number } = {}) {
  scrap(
    {
      key: `envfront:${color}`,
      w: ENV_W,
      h: ENV_H * 0.78,
      color,
      edge: "cut",
      shadow: 0.2,
      paint: (c, w, h) => {
        c.strokeStyle = "rgba(0,0,0,0.16)";
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(0, h);
        c.lineTo(w * 0.5, h * 0.35);
        c.lineTo(w, h);
        c.stroke();
      },
    },
    x,
    y + ENV_H * 0.11,
    { ...o, wiggle: 0.5 },
  );
  const closed = o.closed ?? 0;
  if (closed > 0.02) {
    const flapH = ENV_H * 0.62;
    scrap(
      { key: `envflap:${color}`, w: ENV_W, h: flapH, color: shade(color, -0.06), shape: "tri", edge: "cut", shadow: 0.6 },
      x,
      y - ENV_H / 2,
      { ...o, ay: 0, sy: closed, wiggle: 0.5 },
    );
  }
  label(name, x, y + ENV_H * 0.2, {
    kind: "marker",
    size: 30,
    bg: C.white,
    rot: (o.rot ?? 0) - 0.03,
    scale: o.scale,
    edge: "torn",
    padY: 8,
    wiggle: 0.5,
  });
}

/** An open cardboard tray seen from the front. Draw back, then members, then front. */
export function boxBack(w: number, h: number, x: number, y: number, color = C.kraft, o: PlaceOpts = {}) {
  scrap({ key: `boxback:${w}:${h}:${color}`, w, h, color: shade(color, -0.25), edge: "cut", shadow: 0.9 }, x, y, {
    ...o,
    wiggle: 0.4,
  });
}

export function boxFront(name: string, w: number, h: number, x: number, y: number, color = C.kraft, o: PlaceOpts & { size?: number } = {}) {
  const fh = h * 0.42;
  scrap(
    {
      key: `boxfront:${w}:${h}:${color}`,
      w,
      h: fh,
      color,
      edge: "torn",
      shadow: 0.5,
      paint: (c, ww, hh) => {
        c.strokeStyle = "rgba(90,60,20,0.25)";
        c.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
          c.beginPath();
          c.moveTo(0, (hh * i) / 4);
          c.lineTo(ww, (hh * i) / 4 + 2);
          c.stroke();
        }
      },
    },
    x,
    y + h / 2 - fh / 2,
    { ...o, wiggle: 0.4 },
  );
  label(name, x, y + h / 2 - fh / 2, {
    kind: "marker",
    size: o.size ?? 34,
    bg: C.white,
    edge: "torn",
    rot: (o.rot ?? 0) + (hash(strSeed(name), 1) - 0.5) * 0.08,
    padY: 6,
    wiggle: 0.4,
  });
  tape(x - labelHalf(name, o.size ?? 34) - 6, y + h / 2 - fh / 2 - 18, 70, -0.6, "plain", strSeed(name));
}

function labelHalf(name: string, size: number) {
  return (measure(name, font("marker", size)) + size * 1.1) / 2;
}

export function desaturate(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const f = (v: number) => Math.round(v + (l - v) * amt);
  return `#${((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, "0")}`;
}

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------------------------
// Rubber stamps

interface StampBake {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}
const stamps = new Map<string, StampBake>();

function bakeStamp(text: string, color: string, sub?: string): StampBake {
  const key = `${text}|${color}|${sub}|${G.res}`;
  const hit = stamps.get(key);
  if (hit) return hit;
  const res = G.res;
  const size = 64;
  const f = font("print", size, 900);
  const sf = font("type", 24);
  const tw = measure(text, f);
  const w = tw + 70;
  const h = size + 44 + (sub ? 34 : 0);
  const canvas = makeCanvas((w + 20) * res, (h + 20) * res);
  const c = canvas.getContext("2d")!;
  c.scale(res, res);
  c.translate(10, 10);
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = 7;
  c.beginPath();
  c.roundRect(4, 4, w - 8, h - 8, 14);
  c.stroke();
  c.lineWidth = 2.5;
  c.beginPath();
  c.roundRect(14, 14, w - 28, h - 28, 8);
  c.stroke();
  c.font = f;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, w / 2, sub ? h / 2 - 14 : h / 2 + 3);
  if (sub) {
    c.font = sf;
    c.fillText(sub, w / 2, h / 2 + 30);
  }
  // Distress: knock out specks so it reads as an inked impression.
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "destination-out";
  const r = rng(strSeed(text));
  for (let i = 0; i < (w * h) / 90; i++) {
    c.globalAlpha = 0.3 + r() * 0.7;
    const s = (0.6 + r() * 2.4) * res;
    c.fillRect(r() * canvas.width, r() * canvas.height, s, s);
  }
  for (let i = 0; i < 6; i++) {
    c.globalAlpha = 0.25;
    c.fillRect(0, r() * canvas.height, canvas.width, (1 + r() * 3) * res);
  }
  const out = { canvas, w: w + 20, h: h + 20 };
  stamps.set(key, out);
  return out;
}

/**
 * A rubber stamp slammed onto the page at time `at`. Returns true on the frame of impact so the
 * caller can add camera shake.
 */
export function stamp(text: string, x: number, y: number, t: number, at: number, o: { color?: string; rot?: number; scale?: number; sub?: string } = {}) {
  if (t < at) return;
  const b = bakeStamp(text, o.color ?? C.red, o.sub);
  const p = k(t, at, at + 0.16);
  const sc = (o.scale ?? 1) * (1 + (1 - ease.outCubic(p)) * 0.9);
  const ctx = G.ctx;
  ctx.save();
  ctx.globalAlpha *= 0.25 + p * 0.65;
  ctx.globalCompositeOperation = "multiply";
  ctx.translate(x, y);
  ctx.rotate(o.rot ?? -0.12);
  ctx.scale(sc, sc);
  ctx.drawImage(b.canvas, -b.w / 2, -b.h / 2, b.w, b.h);
  ctx.restore();
  // Ink splats on impact.
  if (p >= 1 && t < at + 0.5) {
    const sp = k(t, at + 0.16, at + 0.5);
    ctx.save();
    ctx.fillStyle = o.color ?? C.red;
    ctx.globalAlpha *= 0.8 * (1 - sp * 0.4);
    const seed = strSeed(text);
    for (let i = 0; i < 7; i++) {
      const a = hash(seed, i) * Math.PI * 2;
      const d = (b.w / 2) * (0.9 + hash(seed, i, 1) * 0.4) * (o.scale ?? 1) * (0.9 + sp * 0.15);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.55, 2 + hash(seed, i, 2) * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// Small props

/** A brass key drawn as a filled shape with a marker outline. */
export function key(x: number, y: number, s: number, rot: number, color = C.mustard, seed = 1) {
  const ctx = G.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-34, 0, 20, 0, Math.PI * 2);
  ctx.moveTo(-16, -6);
  ctx.lineTo(40, -6);
  ctx.lineTo(40, 18);
  ctx.lineTo(32, 18);
  ctx.lineTo(32, 6);
  ctx.lineTo(24, 6);
  ctx.lineTo(24, 14);
  ctx.lineTo(16, 14);
  ctx.lineTo(16, 6);
  ctx.lineTo(-16, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(-40, -6, 6, 0, Math.PI * 2);
  ctx.fill();
  ellipse(-34, 0, 20, 20, { seed, width: 3.5, double: false, turns: 1.03 });
  ellipse(-34, 0, 7, 7, { seed: seed + 1, width: 3, double: false, turns: 1.03 });
  stroke(
    [
      { x: -15, y: -6 },
      { x: 40, y: -6 },
      { x: 40, y: 18 },
      { x: 32, y: 18 },
      { x: 32, y: 6 },
      { x: 24, y: 6 },
      { x: 24, y: 14 },
      { x: 16, y: 14 },
      { x: 16, y: 6 },
      { x: -15, y: 6 },
    ],
    { seed: seed + 2, width: 3.5, double: false, amp: 0.8 },
  );
  ctx.restore();
}

export function padlock(x: number, y: number, s: number, open: number, color = C.mustard, seed = 3) {
  const ctx = G.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const lift = open * 22;
  stroke([{ x: -26, y: -18 }, ...arcPts(0, -30 - lift, 26, Math.PI, Math.PI * 2), { x: 26, y: open > 0.5 ? -24 - lift : -18 }], {
    seed,
    width: 9,
    color: "#6f6a64",
    double: false,
    amp: 0.6,
  });
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-40, -18, 80, 64, 10);
  ctx.fill();
  rect(-40, -18, 80, 64, { seed: seed + 1, width: 4, double: false });
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-3, 8, 6, 18);
  ctx.restore();
}

/** Hand-drawn mouse pointer. */
export function cursor(x: number, y: number, pressed = 0, s = 1) {
  const ctx = G.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (1 - pressed * 0.12), s * (1 - pressed * 0.12));
  ctx.rotate(-0.08);
  const pts: Pt[] = [
    { x: 0, y: 0 },
    { x: 0, y: 58 },
    { x: 14, y: 45 },
    { x: 25, y: 70 },
    { x: 36, y: 65 },
    { x: 25, y: 41 },
    { x: 43, y: 40 },
  ];
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x + 5, p.y + 7) : ctx.moveTo(p.x + 5, p.y + 7)));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.white;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  stroke(pts, { seed: 77, width: 4, closed: true, double: false, amp: 0.7 });
  ctx.restore();
}

/** Expanding marker rings where the cursor clicks. */
export function clickRing(x: number, y: number, t: number, at: number) {
  const p = k(t, at, at + 0.45);
  if (p <= 0 || p >= 1) return;
  ellipse(x, y, 16 + p * 34, 16 + p * 34, { seed: 90, width: 4, color: C.red, alpha: 1 - p, turns: 1 });
}

/** A light bulb doodle with a coloured-in glow. */
export function bulb(x: number, y: number, s: number, glow: number, seed = 5) {
  const ctx = G.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (glow > 0) {
    ctx.fillStyle = `rgba(247,223,107,${0.85 * glow})`;
    ctx.beginPath();
    ctx.arc(0, -10, 44, 0, Math.PI * 2);
    ctx.fill();
  }
  ellipse(0, -12, 40, 42, { seed, width: 5, turns: 1.02 });
  rect(-18, 30, 36, 26, { seed: seed + 1, width: 4.5 });
  line(-18, 42, 18, 42, { seed: seed + 2, width: 3 });
  ctx.restore();
}

/** A strip of masking tape with hand-written text, e.g. a caption on the board. */
export function note(text: string, x: number, y: number, o: { rot?: number; size?: number; color?: string; progress?: number } = {}) {
  write(text, x, y, { kind: "hand", size: o.size ?? 44, weight: 700, color: o.color ?? INK, rot: o.rot, progress: o.progress });
}

export { place, bakeScrap };
