/**
 * Lettering: hand-written text that writes itself on, ransom-note cut-out titles, and paper
 * labels sized to their text.
 */

import { C, G, INK, font, hash, jit, makeCanvas, pop, strSeed, type Fonts } from "./core";
import { scrap, type PlaceOpts, type ScrapSpec } from "./paper";

let measurer: CanvasRenderingContext2D | null = null;
const widthCache = new Map<string, number>();

export function measure(text: string, f: string): number {
  const key = f + "|" + text;
  let w = widthCache.get(key);
  if (w === undefined) {
    measurer ??= makeCanvas(4, 4).getContext("2d")!;
    measurer.font = f;
    w = measurer.measureText(text).width;
    widthCache.set(key, w);
  }
  return w;
}

export function clearMeasureCache() {
  widthCache.clear();
}

export interface WriteOpts {
  kind?: keyof Fonts;
  size?: number;
  weight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  /** 0..1 — fraction of characters written so far. */
  progress?: number;
  rot?: number;
  /** Per-letter wobble strength; 0 for perfectly still type. */
  jitter?: number;
  lineHeight?: number;
  alpha?: number;
  seed?: number;
  /** Width of a trailing underline scribble, drawn once writing is complete. */
  outline?: string;
  outlineWidth?: number;
}

/** Hand lettering, revealed letter by letter with a little per-letter boil. */
export function write(text: string, x: number, y: number, o: WriteOpts = {}) {
  const ctx = G.ctx;
  const size = o.size ?? 48;
  const f = font(o.kind ?? "hand", size, o.weight ?? 400);
  const lines = text.split("\n");
  const lh = o.lineHeight ?? size * 1.12;
  const total = text.replace(/\n/g, "").length;
  const shown = (o.progress ?? 1) * total;
  const jitter = o.jitter ?? 1;
  const seed = o.seed ?? strSeed(text);
  if (shown <= 0) return;

  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.font = f;
  ctx.textBaseline = "middle";
  ctx.fillStyle = o.color ?? INK;
  let idx = 0;
  const y0 = -((lines.length - 1) * lh) / 2;
  lines.forEach((ln, li) => {
    const lw = measure(ln, f);
    const lx = o.align === "left" ? 0 : o.align === "right" ? -lw : -lw / 2;
    for (let i = 0; i < ln.length; i++) {
      const ch = ln[i];
      const frac = Math.min(1, shown - idx);
      idx++;
      if (frac <= 0) break;
      if (ch === " ") continue;
      const cx = lx + measure(ln.slice(0, i), f);
      const cw = measure(ch, f);
      const s = seed + idx * 13;
      ctx.save();
      ctx.translate(cx + cw / 2, y0 + li * lh + jit(s, 1) * 1.1 * jitter + (hash(s, 9) - 0.5) * size * 0.05);
      ctx.rotate(jit(s, 2) * 0.03 * jitter + (hash(s, 7) - 0.5) * 0.05 * jitter);
      const sc = frac < 1 ? 0.7 + 0.3 * frac : 1;
      ctx.scale(sc, sc);
      ctx.globalAlpha *= frac;
      if (o.outline) {
        ctx.lineWidth = o.outlineWidth ?? size * 0.16;
        ctx.lineJoin = "round";
        ctx.strokeStyle = o.outline;
        ctx.strokeText(ch, -cw / 2, 0);
      }
      ctx.fillText(ch, -cw / 2, 0);
      ctx.restore();
    }
  });
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------

const RANSOM_BG = [C.yellow, C.white, C.pink, C.sky, C.mint, C.red, C.ink, C.lilac, C.orange, C.white];
const RANSOM_FONTS: (keyof Fonts)[] = ["marker", "type", "print", "marker", "type"];

/** A ransom-note title: each letter on its own clipped scrap, popping on in sequence. */
export function ransom(
  word: string,
  x: number,
  y: number,
  size: number,
  t: number,
  at: number,
  o: { stagger?: number; seed?: number; gap?: number } = {},
) {
  const seed = o.seed ?? strSeed(word);
  const stagger = o.stagger ?? 0.09;
  const gap = o.gap ?? size * 0.08;
  const letters = [...word];
  const specs = letters.map((ch, i) => {
    const h = hash(seed, i);
    const bg = RANSOM_BG[Math.floor(h * RANSOM_BG.length)];
    const kind = RANSOM_FONTS[Math.floor(hash(seed, i, 2) * RANSOM_FONTS.length)];
    const s = size * (0.86 + hash(seed, i, 3) * 0.28);
    const f = font(kind, s, kind === "print" ? 800 : 400);
    const dark = bg === C.ink || bg === C.red;
    const tw = measure(ch, f);
    const w = Math.max(tw + s * 0.34, s * 0.62);
    const hgt = s * 1.18;
    const spec: ScrapSpec = {
      key: `ransom:${ch}:${seed}:${i}:${Math.round(s)}`,
      w,
      h: hgt,
      color: bg,
      edge: hash(seed, i, 4) < 0.5 ? "cut" : "torn",
      pattern: hash(seed, i, 5) < 0.18 ? "halftone" : undefined,
      patternColor: "rgba(0,0,0,0.08)",
      paint: (ctx, ww, hh) => {
        ctx.font = f;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = dark ? C.white : hash(seed, i, 6) < 0.2 ? C.red : INK;
        ctx.fillText(ch, ww / 2, hh / 2 + s * 0.05);
      },
    };
    return { spec, w };
  });
  const totalW = specs.reduce((n, s) => n + s.w + gap, -gap);
  let cx = x - totalW / 2;
  specs.forEach(({ spec, w }, i) => {
    const sc = pop(t, at + i * stagger, 0.42);
    const rot = (hash(seed, i, 8) - 0.5) * 0.2;
    const dy = (hash(seed, i, 9) - 0.5) * size * 0.14;
    scrap(spec, cx + w / 2, y + dy, { rot, scale: sc, wiggle: 1.4 });
    cx += w + gap;
  });
}

// ---------------------------------------------------------------------------------------------

export interface LabelOpts extends PlaceOpts {
  kind?: keyof Fonts;
  size?: number;
  weight?: number;
  bg?: string;
  fg?: string;
  padX?: number;
  padY?: number;
  edge?: "torn" | "cut";
  shape?: ScrapSpec["shape"];
  pattern?: ScrapSpec["pattern"];
  minW?: number;
}

/** A strip of paper with text printed on it, sized to fit. */
export function label(text: string, x: number, y: number, o: LabelOpts = {}) {
  const size = o.size ?? 34;
  const f = font(o.kind ?? "type", size, o.weight ?? 400);
  const padX = o.padX ?? size * 0.55;
  const padY = o.padY ?? size * 0.32;
  const w = Math.max(o.minW ?? 0, measure(text, f) + padX * 2 + (o.shape === "ticket" ? size * 0.5 : 0));
  const h = size + padY * 2;
  const bg = o.bg ?? C.white;
  const fg = o.fg ?? INK;
  scrap(
    {
      key: `label:${text}:${f}:${bg}:${fg}:${o.edge}:${o.shape}:${o.pattern}:${Math.round(w)}`,
      w,
      h,
      color: bg,
      edge: o.edge ?? "cut",
      shape: o.shape,
      pattern: o.pattern,
      paint: (ctx, ww, hh) => {
        ctx.font = f;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = fg;
        ctx.fillText(text, ww / 2, hh / 2 + size * 0.04);
      },
    },
    x,
    y,
    o,
  );
  return { w, h };
}

export function labelWidth(text: string, o: { kind?: keyof Fonts; size?: number; weight?: number; padX?: number } = {}) {
  const size = o.size ?? 34;
  const f = font(o.kind ?? "type", size, o.weight ?? 400);
  return measure(text, f) + (o.padX ?? size * 0.55) * 2;
}
