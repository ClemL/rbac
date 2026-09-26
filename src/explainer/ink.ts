/**
 * Marker and pencil strokes. Every line is resampled and displaced with seeded noise, drawn in two
 * slightly different passes, and re-seeded several times a second so the ink "boils" the way
 * traced animation drawings do. Strokes can be partially drawn (`progress`) to animate them on.
 */

import { G, INK, hash, noise, type Pt } from "./core";

export interface InkOpts {
  seed: number;
  color?: string;
  width?: number;
  /** Wobble amplitude in px. */
  amp?: number;
  /** 0..1 — how much of the stroke has been drawn so far. */
  progress?: number;
  alpha?: number;
  /** Second, fainter pass for the doubled-stroke hand-drawn look. */
  double?: boolean;
  /** Set false for lines that should hold perfectly still. */
  boil?: boolean;
  closed?: boolean;
  dash?: number[];
}

function boilSeed(o: InkOpts, pass: number): number {
  const b = o.boil === false || G.reduced ? 0 : G.boil;
  return (o.seed * 131 + b * 7919 + pass * 104729) | 0;
}

/** Resamples a polyline every ~12px and pushes each sample sideways by smooth noise. */
export function wobble(pts: Pt[], seed: number, amp: number, closed = false, overshoot = true): Pt[] {
  if (pts.length < 2) return pts;
  const src = closed ? [...pts, pts[0]] : pts;
  const out: Pt[] = [];
  let dist = 0;
  for (let i = 0; i < src.length - 1; i++) {
    const a = src[i];
    const b = src[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const n = Math.max(2, Math.ceil(len / 12));
    for (let j = i === 0 ? 0 : 1; j <= n; j++) {
      const t = j / n;
      const d = dist + len * t;
      const off = amp * (noise(seed, d / 70) * 0.85 + (hash(seed, i * 97 + j) - 0.5) * 0.3);
      out.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off });
    }
    dist += len;
  }
  if (overshoot && !closed && out.length > 1) {
    // Hand-drawn lines rarely stop exactly where they were aimed.
    const extend = (p: Pt, q: Pt, s: number) => {
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const len = Math.hypot(dx, dy) || 1;
      const e = amp * (0.4 + hash(seed, s) * 1.4);
      return { x: p.x + (dx / len) * e, y: p.y + (dy / len) * e };
    };
    out[0] = extend(out[0], out[1], 1);
    out[out.length - 1] = extend(out[out.length - 1], out[out.length - 2], 2);
  }
  return out;
}

/** Traces the first `progress` fraction of a polyline's length. */
export function tracePartial(ctx: CanvasRenderingContext2D, pts: Pt[], progress: number) {
  if (pts.length < 2 || progress <= 0) return;
  let total = 0;
  const lens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    lens.push(l);
    total += l;
  }
  let remaining = total * Math.min(1, progress);
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < lens.length; i++) {
    if (remaining >= lens[i]) {
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      remaining -= lens[i];
    } else {
      const t = remaining / (lens[i] || 1);
      ctx.lineTo(pts[i].x + (pts[i + 1].x - pts[i].x) * t, pts[i].y + (pts[i + 1].y - pts[i].y) * t);
      break;
    }
  }
}

export function stroke(pts: Pt[], o: InkOpts) {
  const progress = o.progress ?? 1;
  if (progress <= 0) return;
  const ctx = G.ctx;
  const width = o.width ?? 5;
  const amp = o.amp ?? Math.min(3.2, 1.2 + width * 0.3);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = o.color ?? INK;
  if (o.dash) ctx.setLineDash(o.dash);
  const passes = o.double === false ? 1 : 2;
  for (let p = 0; p < passes; p++) {
    const w = wobble(pts, boilSeed(o, p), p === 0 ? amp : amp * 1.3, o.closed);
    ctx.globalAlpha = (o.alpha ?? 1) * (p === 0 ? 0.95 : 0.45);
    ctx.lineWidth = p === 0 ? width : width * 0.55;
    ctx.beginPath();
    tracePartial(ctx, w, progress);
    ctx.stroke();
  }
  ctx.restore();
}

export function line(x1: number, y1: number, x2: number, y2: number, o: InkOpts) {
  stroke(
    [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ],
    o,
  );
}

/** Four separately drawn sides, like a person drawing a box, animated in order. */
export function rect(x: number, y: number, w: number, h: number, o: InkOpts) {
  const p = o.progress ?? 1;
  const sides: [number, number, number, number][] = [
    [x, y, x + w, y],
    [x + w, y, x + w, y + h],
    [x + w, y + h, x, y + h],
    [x, y + h, x, y],
  ];
  sides.forEach((s, i) => {
    const sp = Math.max(0, Math.min(1, p * 4 - i));
    if (sp > 0) line(s[0], s[1], s[2], s[3], { ...o, seed: o.seed + i * 17, progress: sp });
  });
}

/** Loose ellipse that overshoots its starting point, as quick marker circles do. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, o: InkOpts & { turns?: number }) {
  const seed = o.seed;
  const start = hash(seed, 3) * Math.PI * 2;
  const turns = o.turns ?? 1.08;
  const n = Math.max(24, Math.ceil(((rx + ry) * turns) / 7));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = start + (i / n) * Math.PI * 2 * turns;
    const r = 1 + noise(seed + 9, i / 6) * 0.04 + (i / n) * 0.05 * (hash(seed, 5) - 0.5);
    pts.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r });
  }
  stroke(pts, { ...o, amp: o.amp ?? 1.2 });
}

/** Samples a quadratic curve through a control point. */
export function curvePts(a: Pt, ctrl: Pt, b: Pt, n = 24): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y,
    });
  }
  return out;
}

/** A curved marker arrow; the head is drawn once the shaft arrives. */
export function arrow(a: Pt, b: Pt, o: InkOpts & { bend?: number; head?: number }) {
  const bend = o.bend ?? 0.2;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ctrl = { x: mx - dy * bend, y: my + dx * bend };
  const pts = curvePts(a, ctrl, b);
  const p = o.progress ?? 1;
  stroke(pts, { ...o, progress: Math.min(1, p / 0.85) });
  if (p > 0.85) {
    const hp = (p - 0.85) / 0.15;
    const end = pts[pts.length - 1];
    const prev = pts[pts.length - 4];
    const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
    const hl = o.head ?? 26;
    for (const side of [-1, 1]) {
      const a2 = ang + Math.PI + side * 0.5;
      line(end.x, end.y, end.x + Math.cos(a2) * hl, end.y + Math.sin(a2) * hl, {
        ...o,
        seed: o.seed + 50 + side,
        progress: hp,
      });
    }
  }
}

/** Marker check mark. */
export function check(x: number, y: number, size: number, o: InkOpts) {
  stroke(
    [
      { x: x - size * 0.5, y: y },
      { x: x - size * 0.12, y: y + size * 0.4 },
      { x: x + size * 0.6, y: y - size * 0.55 },
    ],
    { width: size * 0.16, ...o, amp: o.amp ?? size * 0.03 },
  );
}

export function cross(x: number, y: number, size: number, o: InkOpts) {
  const p = o.progress ?? 1;
  const s = size / 2;
  line(x - s, y - s, x + s, y + s, { width: size * 0.15, ...o, progress: Math.min(1, p * 2) });
  line(x + s, y - s, x - s, y + s, {
    width: size * 0.15,
    ...o,
    seed: o.seed + 3,
    progress: Math.max(0, p * 2 - 1),
  });
}

/**
 * Marker "colouring in": zig-zag hatching clipped to a path, revealed left to right.
 * `clip` must add a path to the context; it is called between beginPath() and clip().
 */
export function hatch(
  bounds: { x: number; y: number; w: number; h: number },
  clip: (ctx: CanvasRenderingContext2D) => void,
  o: InkOpts & { gap?: number },
) {
  const ctx = G.ctx;
  const gap = o.gap ?? 14;
  const p = o.progress ?? 1;
  ctx.save();
  ctx.beginPath();
  clip(ctx);
  ctx.clip();
  const pts: Pt[] = [];
  const slant = bounds.h * 0.6;
  for (let x = bounds.x - slant, i = 0; x < bounds.x + bounds.w + slant; x += gap, i++) {
    pts.push(i % 2 === 0 ? { x, y: bounds.y - 10 } : { x: x + slant, y: bounds.y + bounds.h + 10 });
  }
  stroke(pts, { width: gap * 0.9, alpha: 0.55, double: false, amp: 2, ...o, progress: p });
  ctx.restore();
}

/** Radiating emphasis dashes around a point ("ta-da" lines). */
export function burst(x: number, y: number, r: number, o: InkOpts & { rays?: number }) {
  const rays = o.rays ?? 9;
  const p = o.progress ?? 1;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + hash(o.seed, i) * 0.3;
    const r0 = r * (1 + p * 0.25);
    const r1 = r0 + r * (0.35 + hash(o.seed, i + 40) * 0.25) * Math.sin(Math.min(1, p) * Math.PI);
    if (r1 - r0 < 1) continue;
    line(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, {
      width: 5,
      ...o,
      seed: o.seed + i,
      progress: 1,
    });
  }
}

/** Jagged lightning bolt between two points. */
export function zigzag(a: Pt, b: Pt, o: InkOpts & { teeth?: number; size?: number }) {
  const n = o.teeth ?? 5;
  const size = o.size ?? 22;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = i === 0 || i === n ? 0 : (i % 2 ? 1 : -1) * size;
    pts.push({ x: a.x + dx * t + nx * s, y: a.y + dy * t + ny * s });
  }
  stroke(pts, { amp: 1, ...o });
}

/** Little doodle star. */
export function star(x: number, y: number, r: number, o: InkOpts) {
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  stroke(pts, { width: 4, amp: 1, ...o });
}

/** Loose spiral scribble — used as emphasis or for "confusion" doodles. */
export function scribble(x: number, y: number, r: number, o: InkOpts & { loops?: number }) {
  const loops = o.loops ?? 4;
  const pts: Pt[] = [];
  const n = loops * 18;
  for (let i = 0; i <= n; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rr = r * (0.55 + 0.45 * Math.sin(i * 0.37 + o.seed));
    pts.push({ x: x + Math.cos(a) * rr + i * 0.9 - n * 0.45, y: y + Math.sin(a) * rr * 0.8 });
  }
  stroke(pts, { width: 4, amp: 1.5, ...o });
}
