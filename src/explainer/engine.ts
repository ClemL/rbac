/**
 * Timeline, camera and frame compositing for the explainer. Pure canvas 2D, no dependencies:
 * `render(time)` draws the frame for any moment, so seeking, pausing and replaying are free.
 */

import { BOIL_FPS, G, H, W, hash, makeCanvas, noise, type Fonts } from "./core";
import { backdrop, wipeSheet, type Backdrop } from "./paper";
import { clearMeasureCache } from "./text";

/** Content is drawn "on twos": a new drawing every 1/12 s, like hand-drawn cut-out animation. */
const CONTENT_FPS = 12;
const WIPE = 1.25;

export interface Cam {
  x: number;
  y: number;
  z: number;
  r: number;
}

export interface Scene {
  id: string;
  chapter: string;
  start: number;
  end: number;
  backdrop: Backdrop;
  /** Colour of the paper sheet that sweeps in to open this scene. */
  wipe: string;
  cam?: (t: number) => Partial<Cam>;
  /** Local times of impacts that should jolt the camera. */
  shakes?: number[];
  draw: (t: number) => void;
}

/** Smoothly blends between camera keyframes: [time, cam][] sorted by time. */
export function camPath(keys: [number, Partial<Cam>][]): (t: number) => Partial<Cam> {
  const full = keys.map(([t, c]) => [t, { x: 960, y: 540, z: 1, r: 0, ...c }] as const);
  return (t) => {
    if (t <= full[0][0]) return full[0][1];
    for (let i = 0; i < full.length - 1; i++) {
      const [t0, a] = full[i];
      const [t1, b] = full[i + 1];
      if (t <= t1) {
        const u = (t - t0) / (t1 - t0 || 1);
        const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
        return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, z: a.z + (b.z - a.z) * e, r: a.r + (b.r - a.r) * e };
      }
    }
    return full[full.length - 1][1];
  };
}

export class Explainer {
  readonly duration: number;
  private ctx: CanvasRenderingContext2D;
  private width = W;
  private height = H;
  private dpr = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private scenes: Scene[],
    fonts: Fonts,
    reduced: boolean,
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.duration = scenes[scenes.length - 1].end;
    G.fonts = fonts;
    G.reduced = reduced;
  }

  /** Resolves once the lettering fonts are usable on canvas, so nothing bakes in a fallback. */
  static async loadFonts(fonts: Fonts) {
    if (typeof document === "undefined" || !document.fonts) return;
    await Promise.all(
      Object.values(fonts).flatMap((f) => [document.fonts.load(`400 40px ${f}`), document.fonts.load(`700 40px ${f}`)]),
    ).catch(() => undefined);
    clearMeasureCache();
  }

  resize(cssWidth: number, cssHeight: number, dpr: number) {
    this.dpr = Math.min(dpr, 2);
    this.width = Math.max(1, Math.round(cssWidth * this.dpr));
    this.height = Math.max(1, Math.round(cssHeight * this.dpr));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    // Bake cut-outs at a resolution that matches how large they will appear.
    const scale = this.width / W;
    G.res = scale > 1.25 ? 2 : scale > 0.8 ? 1.25 : scale > 0.55 ? 1 : 0.75;
  }

  sceneAt(time: number): Scene {
    return this.scenes.find((s) => time < s.end) ?? this.scenes[this.scenes.length - 1];
  }

  /**
   * Bakes every cut-out ahead of time by rendering the whole timeline into a thumbnail-sized
   * canvas, yielding between frames, so chapter changes never stall on first-time baking.
   */
  async warm(cancelled: () => boolean) {
    const thumb = makeCanvas(96, 54).getContext("2d")!;
    const res = G.res;
    for (let t = 0; t < this.duration && !cancelled() && res === G.res; t += 0.5) {
      this.render(t, thumb, 96, 54);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  render(time: number, target?: CanvasRenderingContext2D, tw?: number, th?: number) {
    const ctx = target ?? this.ctx;
    const width = tw ?? this.width;
    const height = th ?? this.height;
    G.ctx = ctx;
    const t = Math.max(0, Math.min(time, this.duration - 0.001));
    const tq = G.reduced ? t : Math.floor(t * CONTENT_FPS) / CONTENT_FPS;
    G.T = tq;
    G.boil = Math.floor(t * BOIL_FPS);

    const scene = this.sceneAt(t);
    const local = tq - scene.start;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1b1a1f";
    ctx.fillRect(0, 0, width, height);

    // Fit the 1920×1080 stage into the canvas.
    const s = Math.min(width / W, height / H);
    const ox = (width - W * s) / 2;
    const oy = (height - H * s) / 2;
    ctx.setTransform(s, 0, 0, s, ox, oy);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    const cam: Cam = { x: 960, y: 540, z: 1, r: 0, ...(scene.cam?.(local) ?? {}) };
    let dx = 0;
    let dy = 0;
    let dr = 0;
    if (!G.reduced) {
      // Handheld rostrum-camera drift.
      dx += noise(11, t * 0.25) * 5;
      dy += noise(12, t * 0.25) * 4;
      dr += noise(13, t * 0.18) * 0.0025;
      for (const at of scene.shakes ?? []) {
        const since = local - at;
        if (since >= 0 && since < 0.45) {
          const amp = 16 * (1 - since / 0.45) ** 2;
          const f = Math.floor(t * 24);
          dx += (hash(f, 1) - 0.5) * 2 * amp;
          dy += (hash(f, 2) - 0.5) * 2 * amp;
          dr += (hash(f, 3) - 0.5) * 0.01 * (amp / 16);
        }
      }
    }
    ctx.save();
    ctx.translate(W / 2 + dx, H / 2 + dy);
    ctx.rotate(cam.r + dr);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
    backdrop(scene.backdrop);
    scene.draw(local);
    ctx.restore();

    // Paper wipe across the cut between scenes.
    for (let i = 1; i < this.scenes.length; i++) {
      const b = this.scenes[i].start;
      if (Math.abs(t - b) < WIPE / 2) {
        wipeSheet((t - b) / WIPE + 0.5, this.scenes[i].wipe, i * 31);
      }
    }

    // Exposure flicker, as if each frame were shot separately under a lamp.
    if (!G.reduced) {
      const f = hash(Math.floor(t * CONTENT_FPS), 77);
      ctx.fillStyle = f < 0.5 ? `rgba(255,244,220,${f * 0.05})` : `rgba(40,20,0,${(f - 0.5) * 0.04})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
}
