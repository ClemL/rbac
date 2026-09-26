/**
 * Paper: backgrounds, torn and scissor-cut scraps, tape, pins. Everything here is baked once into
 * an offscreen canvas (grain, torn white fibres, drop shadow and any printed content included) and
 * then moved around like a physical cut-out, which is both faster and truer to collage animation
 * than redrawing each frame.
 */

import { C, G, H, W, hash, jit, makeCanvas, rng, strSeed, type Pt } from "./core";

interface Baked {
  canvas: HTMLCanvasElement;
  /** Size in virtual pixels, excluding padding. */
  w: number;
  h: number;
  pad: number;
  res: number;
}

const cache = new Map<string, Baked>();
let cacheRes = 0;

function cached(key: string, make: () => Baked): Baked {
  if (cacheRes !== G.res) {
    cache.clear();
    cacheRes = G.res;
  }
  let b = cache.get(key);
  if (!b) {
    b = make();
    cache.set(key, b);
  }
  return b;
}

// ---------------------------------------------------------------------------------------------
// Grain

let grain: HTMLCanvasElement | null = null;

function grainCanvas(): HTMLCanvasElement {
  if (grain) return grain;
  const size = 256;
  grain = makeCanvas(size, size);
  const g = grain.getContext("2d")!;
  const img = g.createImageData(size, size);
  const r = rng(99);
  for (let i = 0; i < size * size; i++) {
    const v = 110 + r() * 145;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v * 0.97;
    img.data[i * 4 + 2] = v * 0.9;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return grain;
}

function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = amount;
  ctx.fillStyle = ctx.createPattern(grainCanvas(), "repeat")!;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Outlines

export type ScrapShape = "rect" | "circle" | "ticket" | "tag" | "cloud" | "badge" | "torso" | "house" | "tri" | "arch";

export interface ScrapSpec {
  /** Unique cache key: anything baked into the scrap must be reflected here. */
  key: string;
  w: number;
  h: number;
  color: string;
  shape?: ScrapShape;
  /** "torn" edges show a white paper core; "cut" edges are clean scissor lines. */
  edge?: "torn" | "cut";
  /** Edge jaggedness in px. */
  rough?: number;
  shadow?: number;
  grain?: number;
  pattern?: "ruled" | "grid" | "dots" | "halftone" | "stripes";
  patternColor?: string;
  paint?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

function outline(spec: ScrapSpec, seed: number, inset: number): Pt[] {
  const { w, h } = spec;
  const shape = spec.shape ?? "rect";
  const torn = (spec.edge ?? "torn") === "torn";
  const rough = spec.rough ?? (torn ? 3.2 : 1.1);
  const r = rng(seed);
  const pts: Pt[] = [];
  const jag = () => (r() - 0.5) * 2 * rough + (torn && r() < 0.08 ? (r() - 0.3) * rough * 2.5 : 0);

  if (shape === "circle" || shape === "cloud" || shape === "badge") {
    const n = Math.max(40, Math.ceil((w + h) / 6));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      let rr = 1;
      if (shape === "cloud") rr = 0.86 + 0.14 * Math.abs(Math.sin(a * 4.5));
      if (shape === "badge") rr = i % 2 === 0 ? 1 : 0.9;
      pts.push({
        x: w / 2 + Math.cos(a) * (w / 2 - inset) * rr + jag() * 0.6,
        y: h / 2 + Math.sin(a) * (h / 2 - inset) * rr + jag() * 0.6,
      });
    }
    return pts;
  }

  const edgePts = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(2, Math.ceil(len / (torn ? 7 : 40)));
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const j = jag();
      pts.push({ x: ax + (bx - ax) * t + nx * j, y: ay + (by - ay) * t + ny * j });
    }
  };

  const i = inset;
  if (shape === "torso" || shape === "arch") {
    // Dome over a rectangle: shoulders for a paper doll, a rounded top for a door.
    const dome = shape === "torso" ? h * 0.42 : w / 2;
    edgePts(w - i, h - i, i, h - i);
    edgePts(i, h - i, i, dome);
    const n = Math.max(16, Math.ceil(w / 7));
    for (let k = 0; k <= n; k++) {
      const a = Math.PI + (k / n) * Math.PI;
      const j = jag() * 0.5;
      pts.push({ x: w / 2 + Math.cos(a) * (w / 2 - i + j), y: dome + Math.sin(a) * (dome - i + j) });
    }
    edgePts(w - i, dome, w - i, h - i);
    return pts;
  }
  if (shape === "house") {
    const roof = h * 0.36;
    edgePts(i, roof, w / 2, i);
    edgePts(w / 2, i, w - i, roof);
    edgePts(w - i, roof, w - i, h - i);
    edgePts(w - i, h - i, i, h - i);
    edgePts(i, h - i, i, roof);
    return pts;
  }
  if (shape === "tri") {
    edgePts(i, i, w - i, i);
    edgePts(w - i, i, w / 2, h - i);
    edgePts(w / 2, h - i, i, i);
    return pts;
  }
  if (shape === "ticket") {
    const notch = Math.min(h * 0.18, 18);
    edgePts(i, i, w - i, i);
    edgePts(w - i, i, w - i, h / 2 - notch);
    for (let k = 0; k <= 10; k++) {
      const a = -Math.PI / 2 - (k / 10) * Math.PI;
      pts.push({ x: w - i + Math.cos(a) * notch, y: h / 2 + Math.sin(a) * notch });
    }
    edgePts(w - i, h / 2 + notch, w - i, h - i);
    edgePts(w - i, h - i, i, h - i);
    edgePts(i, h - i, i, h / 2 + notch);
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI / 2 - (k / 10) * Math.PI;
      pts.push({ x: i + Math.cos(a) * notch, y: h / 2 - Math.sin(a) * notch * -1 });
    }
    edgePts(i, h / 2 - notch, i, i);
    return pts;
  }
  if (shape === "tag") {
    const cut = h * 0.42;
    edgePts(cut, i, w - i, i);
    edgePts(w - i, i, w - i, h - i);
    edgePts(w - i, h - i, cut, h - i);
    edgePts(cut, h - i, i, h / 2);
    edgePts(i, h / 2, cut, i);
    return pts;
  }
  // Slightly skewed rectangle: nobody cuts perfectly square.
  const s = () => (r() - 0.5) * Math.min(w, h) * 0.035;
  const c = [
    { x: i + s(), y: i + s() },
    { x: w - i + s(), y: i + s() },
    { x: w - i + s(), y: h - i + s() },
    { x: i + s(), y: h - i + s() },
  ];
  for (let e = 0; e < 4; e++) edgePts(c[e].x, c[e].y, c[(e + 1) % 4].x, c[(e + 1) % 4].y);
  return pts;
}

function tracePoly(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function paintPattern(ctx: CanvasRenderingContext2D, spec: ScrapSpec, seed: number) {
  const { w, h } = spec;
  const color = spec.patternColor ?? "rgba(58,103,201,0.28)";
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  switch (spec.pattern) {
    case "ruled":
      for (let y = 34; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(224,83,61,0.45)";
      ctx.beginPath();
      ctx.moveTo(46, 0);
      ctx.lineTo(46, h);
      ctx.stroke();
      break;
    case "grid":
      ctx.lineWidth = 1;
      for (let x = 12; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 12; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      break;
    case "dots":
      for (let y = 10; y < h; y += 22)
        for (let x = 10 + ((y / 22) % 2) * 11; x < w; x += 22) {
          ctx.beginPath();
          ctx.arc(x, y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    case "halftone":
      for (let y = 0; y < h; y += 9)
        for (let x = (y / 9) % 2 ? 4.5 : 0; x < w; x += 9) {
          const d = 0.4 + 0.6 * (1 - (x / w + y / h) / 2);
          ctx.beginPath();
          ctx.arc(x, y, 3.3 * d, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    case "stripes":
      ctx.lineWidth = 9;
      for (let x = -h; x < w + h; x += 26) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        ctx.stroke();
      }
      break;
  }
  ctx.restore();
  void seed;
}

export function bakeScrap(spec: ScrapSpec): Baked {
  return cached("scrap:" + spec.key, () => {
    const res = G.res;
    const pad = 26;
    const cw = spec.w + pad * 2;
    const ch = spec.h + pad * 2;
    const canvas = makeCanvas(cw * res, ch * res);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(res, res);
    ctx.translate(pad, pad);
    const seed = strSeed(spec.key);
    const torn = (spec.edge ?? "torn") === "torn";
    const outer = outline(spec, seed, 0);
    const inner = torn ? outline(spec, seed + 1, 2.2) : outer;
    const shadow = spec.shadow ?? 1;

    // Shadow + torn white core.
    ctx.save();
    if (shadow > 0) {
      ctx.shadowColor = `rgba(45,28,10,${0.3 * shadow})`;
      ctx.shadowBlur = 9 * res * shadow;
      ctx.shadowOffsetX = 3 * res * shadow;
      ctx.shadowOffsetY = 6 * res * shadow;
    }
    ctx.beginPath();
    tracePoly(ctx, outer);
    ctx.fillStyle = torn ? "#fbf8f0" : spec.color;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    tracePoly(ctx, inner);
    ctx.clip();
    ctx.fillStyle = spec.color;
    ctx.fillRect(-4, -4, spec.w + 8, spec.h + 8);
    if (spec.pattern) paintPattern(ctx, spec, seed);
    // Soft light falloff so flat colour reads as paper.
    const lg = ctx.createLinearGradient(0, 0, spec.w, spec.h);
    lg.addColorStop(0, "rgba(255,255,255,0.14)");
    lg.addColorStop(1, "rgba(0,0,0,0.07)");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, spec.w, spec.h);
    if (spec.paint) {
      ctx.save();
      spec.paint(ctx, spec.w, spec.h);
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    applyGrain(ctx, canvas.width, canvas.height, spec.grain ?? 0.28);
    ctx.restore();

    return { canvas, w: spec.w, h: spec.h, pad, res };
  });
}

export interface PlaceOpts {
  rot?: number;
  scale?: number;
  sx?: number;
  sy?: number;
  alpha?: number;
  /** Stop-motion wobble: tiny position/rotation noise per boil frame. */
  wiggle?: number;
  /** Anchor, 0..1 of the scrap (default centre). */
  ax?: number;
  ay?: number;
}

/** Draws a baked scrap centred (by default) on x, y. */
export function place(b: Baked, x: number, y: number, o: PlaceOpts = {}) {
  const ctx = G.ctx;
  const scale = o.scale ?? 1;
  if (scale <= 0.001 || (o.alpha ?? 1) <= 0) return;
  const wig = o.wiggle ?? 1;
  const seed = Math.round(x * 13 + y * 7) + b.w;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.translate(x + jit(seed, 1) * 0.9 * wig, y + jit(seed, 2) * 0.9 * wig);
  ctx.rotate((o.rot ?? 0) + jit(seed, 3) * 0.0045 * wig);
  ctx.scale(scale * (o.sx ?? 1), scale * (o.sy ?? 1));
  const ax = (o.ax ?? 0.5) * b.w;
  const ay = (o.ay ?? 0.5) * b.h;
  ctx.drawImage(b.canvas, -ax - b.pad, -ay - b.pad, b.w + b.pad * 2, b.h + b.pad * 2);
  ctx.restore();
}

export function scrap(spec: ScrapSpec, x: number, y: number, o: PlaceOpts = {}) {
  place(bakeScrap(spec), x, y, o);
}

// ---------------------------------------------------------------------------------------------
// Tape, pins

const TAPES: Record<string, { fill: string; stripe?: string }> = {
  plain: { fill: "rgba(238,229,198,0.78)" },
  pink: { fill: "rgba(243,166,174,0.82)", stripe: "rgba(255,255,255,0.55)" },
  mint: { fill: "rgba(167,220,198,0.82)", stripe: "rgba(255,255,255,0.5)" },
  yellow: { fill: "rgba(247,223,107,0.8)", stripe: "rgba(224,83,61,0.35)" },
  blue: { fill: "rgba(156,200,234,0.82)", stripe: "rgba(255,255,255,0.55)" },
};

export function tape(x: number, y: number, len: number, rot: number, variant = "plain", seed = 1) {
  const kind = TAPES[variant] ?? TAPES.plain;
  const h = 36;
  const b = cached(`tape:${variant}:${Math.round(len)}:${seed}`, () => {
    const res = G.res;
    const pad = 8;
    const canvas = makeCanvas((len + pad * 2) * res, (h + pad * 2) * res);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(res, res);
    ctx.translate(pad, pad);
    const r = rng(seed * 31 + len);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    for (let yy = 0; yy <= h; yy += 4) ctx.lineTo(len - r() * 5, yy);
    ctx.lineTo(0, h);
    for (let yy = h; yy >= 0; yy -= 4) ctx.lineTo(r() * 5, yy);
    ctx.closePath();
    ctx.shadowColor = "rgba(40,25,10,0.18)";
    ctx.shadowBlur = 3 * res;
    ctx.shadowOffsetY = 1.5 * res;
    ctx.fillStyle = kind.fill;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.clip();
    if (kind.stripe) {
      ctx.strokeStyle = kind.stripe;
      ctx.lineWidth = 6;
      for (let xx = -h; xx < len + h; xx += 18) {
        ctx.beginPath();
        ctx.moveTo(xx, 0);
        ctx.lineTo(xx + h, h);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(0, 4, len, 5);
    return { canvas, w: len, h, pad, res };
  });
  place(b, x, y, { rot, wiggle: 0.5 });
}

export function pin(x: number, y: number, color = C.red) {
  const ctx = G.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(40,25,10,0.28)";
  ctx.beginPath();
  ctx.ellipse(6, 9, 13, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.arc(-4, -4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Backgrounds

export type Backdrop = "cream" | "kraft" | "cork" | "graph" | "desk";

const BG: Record<Backdrop, string> = {
  cream: "#f4e8cf",
  kraft: "#c79f6e",
  cork: "#b98a58",
  graph: "#f2ecde",
  desk: "#2f3a4a",
};

function bakeBackdrop(kind: Backdrop): Baked {
  return cached("bg:" + kind, () => {
    const res = Math.min(G.res, 1.5);
    const canvas = makeCanvas(W * res, H * res);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(res, res);
    const r = rng(strSeed(kind));
    ctx.fillStyle = BG[kind];
    ctx.fillRect(0, 0, W, H);

    // Blotchy tone variation.
    for (let i = 0; i < 26; i++) {
      const x = r() * W;
      const y = r() * H;
      const rad = 150 + r() * 420;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const dark = r() < 0.5;
      g.addColorStop(0, dark ? "rgba(90,60,20,0.05)" : "rgba(255,255,255,0.07)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    if (kind === "graph") {
      ctx.strokeStyle = "rgba(58,103,201,0.13)";
      ctx.lineWidth = 1.2;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 20; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(58,103,201,0.22)";
      ctx.lineWidth = 1.6;
      for (let x = 0; x < W; x += 200) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 20; y < H; y += 200) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    if (kind === "cork") {
      for (let i = 0; i < 9000; i++) {
        const dark = r() < 0.6;
        ctx.fillStyle = dark ? `rgba(80,45,15,${0.15 + r() * 0.3})` : `rgba(240,200,150,${0.1 + r() * 0.25})`;
        const s = 1 + r() * 3.5;
        ctx.fillRect(r() * W, r() * H, s, s * (0.6 + r()));
      }
    }

    if (kind === "desk") {
      for (let y = 0; y < H; y += 3) {
        ctx.fillStyle = `rgba(255,255,255,${0.012 + 0.02 * Math.abs(Math.sin(y * 0.05 + r()))})`;
        ctx.fillRect(0, y, W, 1.5);
      }
    }

    // Paper fibres.
    ctx.lineCap = "round";
    for (let i = 0; i < (kind === "cork" ? 200 : 700); i++) {
      const x = r() * W;
      const y = r() * H;
      const a = r() * Math.PI;
      const l = 4 + r() * 16;
      ctx.strokeStyle = r() < 0.5 ? "rgba(120,90,50,0.10)" : "rgba(255,255,255,0.22)";
      ctx.lineWidth = 0.6 + r() * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    applyGrain(ctx, canvas.width, canvas.height, kind === "desk" ? 0.25 : 0.2);
    ctx.scale(res, res);

    // Vignette.
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, kind === "desk" ? "rgba(0,0,0,0.45)" : "rgba(70,40,10,0.28)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    return { canvas, w: W, h: H, pad: 0, res };
  });
}

/** Paints a backdrop oversized so camera moves never reveal its edge. */
export function backdrop(kind: Backdrop) {
  const b = bakeBackdrop(kind);
  const ctx = G.ctx;
  const mx = 560;
  const my = 320;
  ctx.drawImage(b.canvas, -mx, -my, W + mx * 2, H + my * 2);
}

// ---------------------------------------------------------------------------------------------
// Scene transition: a big torn sheet of coloured paper swept across the frame. It fully covers
// the frame at the cut, so the outgoing and incoming scenes never have to be composited.

export function wipeSheet(progress: number, color: string, seed: number, doodle?: (x: number) => void) {
  if (progress <= 0 || progress >= 1) return;
  const sw = 2500;
  const sh = H + 500;
  const b = cached(`wipe:${color}:${seed}`, () => {
    const res = Math.min(G.res, 0.75);
    const pad = 40;
    const canvas = makeCanvas((sw + pad * 2) * res, (sh + pad * 2) * res);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(res, res);
    ctx.translate(pad, pad);
    const r = rng(seed);
    const pts: Pt[] = [];
    for (let y = 0; y <= sh; y += 10) pts.push({ x: 20 + Math.sin(y * 0.01 + seed) * 16 + r() * 10, y });
    for (let y = sh; y >= 0; y -= 10) pts.push({ x: sw - 20 - Math.sin(y * 0.013 + seed) * 18 - r() * 10, y });
    ctx.shadowColor = "rgba(30,15,0,0.35)";
    ctx.shadowBlur = 24 * res;
    ctx.fillStyle = "#fbf8f0";
    ctx.beginPath();
    tracePoly(ctx, pts);
    ctx.fill();
    ctx.shadowColor = "transparent";
    const inner = pts.map((p, i) => ({ x: p.x + (p.x < sw / 2 ? 3 : -3) + (hash(seed, i) - 0.5) * 4, y: p.y }));
    ctx.beginPath();
    tracePoly(ctx, inner);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    applyGrain(ctx, canvas.width, canvas.height, 0.22);
    return { canvas, w: sw, h: sh, pad, res };
  });
  // Ease so the sheet decelerates while covering the frame and accelerates away.
  const p = progress < 0.5 ? 0.5 * (1 - (1 - progress * 2) ** 2.2) : 0.5 + 0.5 * ((progress - 0.5) * 2) ** 2.2;
  const left = W + 40 - p * (W + sw + 80);
  const ctx = G.ctx;
  ctx.save();
  ctx.translate(left + sw / 2, H / 2);
  ctx.rotate(-0.035);
  ctx.drawImage(b.canvas, -sw / 2 - b.pad, -sh / 2 - b.pad, sw + b.pad * 2, sh + b.pad * 2);
  ctx.restore();
  if (doodle) doodle(left + sw / 2);
}
