/**
 * Shared state and math for the explainer animation.
 *
 * The renderer is immediate-mode: every frame, each scene redraws itself from scratch as a pure
 * function of time. `G` holds the per-frame context so the drawing helpers don't need it threaded
 * through every call.
 */

export const W = 1920;
export const H = 1080;

/** Content animates "on twos" — 12 drawings per second — like hand-drawn and stop-motion work. */
export const FPS = 24;
/** Marker lines re-jitter this many times per second ("line boil"). */
export const BOIL_FPS = 8;

export interface Fonts {
  marker: string;
  hand: string;
  type: string;
  print: string;
}

export const G = {
  ctx: null as unknown as CanvasRenderingContext2D,
  boil: 0,
  /** Global time in seconds. */
  T: 0,
  fonts: { marker: "cursive", hand: "cursive", type: "monospace", print: "sans-serif" } as Fonts,
  reduced: false,
  /** Resolution multiplier for cached cut-outs, matched to the output canvas. */
  res: 1,
};

export const INK = "#26232e";

export const C = {
  cream: "#f4ecdb",
  paper: "#fbf7ee",
  kraft: "#c9a473",
  kraftDark: "#a9844f",
  cork: "#b8895a",
  ink: INK,
  red: "#e0533d",
  redDeep: "#c23a2a",
  blue: "#3a67c9",
  sky: "#9cc8ea",
  teal: "#2c9c8c",
  mint: "#a7dcc6",
  mustard: "#eab543",
  yellow: "#f7df6b",
  pink: "#f3a6ae",
  lilac: "#b9a4e4",
  orange: "#f08d3c",
  green: "#3fa85f",
  leaf: "#8fcf7a",
  white: "#fffdf7",
  slate: "#5c6b7d",
};

// ---------------------------------------------------------------------------------------------
// Deterministic randomness. Every wobble is seeded so a paused frame is stable and a replay is
// identical to the first viewing.

export function hash(a: number, b = 0, c = 0): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function strSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth value noise in [-1, 1]. */
export function noise(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash(seed, i) * (1 - u) + hash(seed, i + 1) * u) * 2 - 1;
}

/** Per-boil-frame jitter in [-1, 1]; frozen when reduced motion is requested. */
export function jit(seed: number, channel = 0): number {
  if (G.reduced) return 0;
  return hash(seed, G.boil, channel) * 2 - 1;
}

// ---------------------------------------------------------------------------------------------
// Timing.

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Progress of `t` through the window [a, b], clamped to 0..1. */
export const k = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const ease = {
  linear: (t: number) => t,
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outQuart: (t: number) => 1 - (1 - t) ** 4,
  outBack: (t: number) => {
    const c1 = 1.9;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  outElastic: (t: number) =>
    t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  inBack: (t: number) => 2.7 * t * t * t - 1.7 * t * t,
};

/** Scale for a cut-out "popping" onto the page: 0 → overshoot → 1. */
export function pop(t: number, at: number, dur = 0.4): number {
  return ease.outBack(k(t, at, at + dur));
}

/** Scale for a cut-out being pulled off the page: 1 → 0. */
export function unpop(t: number, at: number, dur = 0.3): number {
  return 1 - ease.inBack(k(t, at, at + dur));
}

/** Visibility envelope: 0 before `a`, eases to 1, holds, eases back to 0 by `b`. */
export function env(t: number, a: number, b: number, fade = 0.35): number {
  if (t < a || t > b) return 0;
  return Math.min(ease.outCubic(k(t, a, a + fade)), 1 - ease.inCubic(k(t, b - fade, b)));
}

export interface Pt {
  x: number;
  y: number;
}

/** Point along a quadratic curve — used for objects flying on an arc. */
export function arc(a: Pt, b: Pt, lift: number, t: number): Pt {
  const cx = (a.x + b.x) / 2;
  const cy = Math.min(a.y, b.y) - lift;
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * cx + t * t * b.x,
    y: u * u * a.y + 2 * u * t * cy + t * t * b.y,
  };
}

export function withTransform(x: number, y: number, rot: number, scale: number, fn: () => void) {
  const ctx = G.ctx;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (scale !== 1) ctx.scale(scale, scale);
  fn();
  ctx.restore();
}

export function withAlpha(alpha: number, fn: () => void) {
  if (alpha <= 0) return;
  const ctx = G.ctx;
  ctx.save();
  ctx.globalAlpha *= alpha;
  fn();
  ctx.restore();
}

export function font(kind: keyof Fonts, size: number, weight = 400): string {
  return `${weight} ${size}px ${G.fonts[kind]}`;
}

/** Offscreen canvas factory; the engine only ever runs in a browser. */
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}
