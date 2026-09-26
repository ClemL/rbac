"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { Explainer } from "@/explainer/engine";
import { EXPLAINER_FONTS, handClass } from "@/explainer/fonts";
import { CUES } from "@/explainer/script";
import { POSTER_TIME, SCENES } from "@/explainer/timeline";

const DURATION = SCENES[SCENES.length - 1].end;

function clock(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

/**
 * Canvas player for the hand-drawn explainer: chaptered scrubber, subtitles, transcript,
 * keyboard control and fullscreen. Time is the only state the animation depends on.
 */
export function ExplainerPlayer({ onFinish }: { onFinish?: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Explainer | null>(null);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const idleRef = useRef<number | undefined>(undefined);

  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [transcript, setTranscript] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const sync = () => setIsFull(document.fullscreenElement === boxRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const draw = useCallback((t: number) => engineRef.current?.render(t), []);

  // Engine lifetime: fonts first, so no cut-out is baked in a fallback face.
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const engine = new Explainer(canvas, SCENES, EXPLAINER_FONTS, reduced);
    let alive = true;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      engine.resize(r.width, r.height, window.devicePixelRatio || 1);
      if (engineRef.current) draw(timeRef.current || POSTER_TIME);
    };
    let gen = 0;
    const ro = new ResizeObserver(() => {
      fit();
      const mine = ++gen;
      void engine.warm(() => !alive || mine !== gen);
    });
    Explainer.loadFonts(EXPLAINER_FONTS).then(() => {
      if (!alive) return;
      engineRef.current = engine;
      fit();
      ro.observe(canvas);
      setReady(true);
    });
    return () => {
      alive = false;
      ro.disconnect();
      engineRef.current = null;
    };
  }, [draw]);

  // Playback loop. Content changes 12 times a second, so only redraw when the frame changes.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let lastFrame = -1;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = Math.min(DURATION, timeRef.current + dt);
      timeRef.current = t;
      const frame = Math.floor(t * 24);
      if (frame !== lastFrame) {
        lastFrame = frame;
        draw(t);
        setTime(t);
      }
      if (t >= DURATION) {
        playingRef.current = false;
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, draw]);

  const seek = useCallback(
    (t: number) => {
      const v = Math.max(0, Math.min(DURATION, t));
      timeRef.current = v;
      setTime(v);
      setStarted(true);
      draw(v);
    },
    [draw],
  );

  const setPlay = useCallback(
    (on: boolean) => {
      if (on && timeRef.current >= DURATION - 0.05) seek(0);
      if (on && !started) seek(0);
      playingRef.current = on;
      setPlaying(on);
      setStarted(true);
      boxRef.current?.focus({ preventScroll: true });
    },
    [seek, started],
  );

  const poke = useCallback(() => {
    setChrome(true);
    window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      if (playingRef.current) setChrome(false);
    }, 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(idleRef.current), []);

  const fullscreen = () => {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") setPlay(!playingRef.current);
    else if (k === "arrowright") seek(timeRef.current + 5);
    else if (k === "arrowleft") seek(timeRef.current - 5);
    else if (k === "c") setCaptions((c) => !c);
    else if (k === "f") fullscreen();
    else if (k === "home") seek(0);
    else return;
    e.preventDefault();
    poke();
  };

  const scrubAt = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * DURATION;
  };

  const cue = CUES.find((c) => time >= c.start && time < c.end);
  const scene = SCENES.find((s) => time < s.end) ?? SCENES[SCENES.length - 1];
  const ended = started && !playing && time >= DURATION - 0.05;
  const showChrome = chrome || !playing;

  return (
    <div>
      <div
        ref={boxRef}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={poke}
        aria-label="RBAC Sandbox explainer animation. Space plays or pauses, arrow keys seek, C toggles subtitles, F toggles fullscreen."
        className={`group relative aspect-video w-full overflow-hidden [container-type:inline-size] rounded-xl bg-[#1b1a1f] outline-none ring-accent/60 focus-visible:ring-2 [&:fullscreen]:rounded-none ${
          playing && !showChrome ? "cursor-none" : ""
        }`}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={cue?.text ?? "Hand-drawn collage animation explaining role-based access control"}
          onClick={() => started && !ended && setPlay(!playing)}
        />

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-faint">Sharpening pencils…</div>
        )}

        {/* Subtitles */}
        {captions && started && cue && (
          <div
            className="pointer-events-none absolute inset-x-0 flex justify-center px-[6%] transition-[bottom] duration-200"
            style={{ bottom: showChrome ? "15%" : "6%" }}
          >
            <p
              key={cue.start}
              aria-live="polite"
              className="animate-pop max-w-[88%] -rotate-[0.4deg] rounded-sm bg-[#fffaf0]/95 px-[1.1em] py-[0.35em] text-center font-semibold leading-snug text-[#26232e] shadow-[0_3px_0_rgba(0,0,0,0.25)]"
              style={{ fontSize: "clamp(11px, 2.15cqw, 30px)" }}
            >
              {cue.text}
            </p>
          </div>
        )}

        {/* Poster */}
        {ready && !started && (
          <button
            type="button"
            onClick={() => setPlay(true)}
            aria-label="Play the intro"
            className="absolute inset-0 flex items-start justify-end gap-3 bg-black/10 p-[3.5%] transition-colors hover:bg-transparent"
          >
            <span className={`${handClass} order-2 rotate-2 rounded bg-[#fffaf0] px-3 py-0.5 text-[clamp(15px,2.4cqw,32px)] font-bold leading-tight text-[#26232e] shadow-[0_3px_0_rgba(0,0,0,0.25)]`}>
              Watch the {Math.round(DURATION / 60)}-minute intro
              <br />
              no sound needed
            </span>
            <span className="order-3 flex size-[clamp(52px,9cqw,112px)] shrink-0 items-center justify-center rounded-full border-4 border-[#26232e] bg-[#f7df6b] shadow-[4px_6px_0_rgba(0,0,0,0.35)] transition-transform group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="ml-[8%] size-1/2 fill-[#26232e]" aria-hidden>
                <path d="M6 4.5 L19.5 12 L6 19.5 Z" strokeLinejoin="round" stroke="#26232e" strokeWidth="2" />
              </svg>
            </span>
          </button>
        )}

        {/* End card */}
        {ended && (
          <div className="absolute inset-0 flex flex-col items-start gap-3 p-[3.5%]">
            {onFinish && (
              <button
                type="button"
                onClick={onFinish}
                className={`${handClass} rounded-lg border-[3px] border-[#26232e] bg-[#f7df6b] px-5 py-1.5 text-[clamp(18px,2.6cqw,34px)] font-bold text-[#26232e] shadow-[3px_5px_0_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5`}
              >
                Start review #1 →
              </button>
            )}
            <button
              type="button"
              onClick={() => setPlay(true)}
              className={`${handClass} rounded-lg border-[3px] border-[#26232e] bg-[#fffaf0] px-5 py-1.5 text-[clamp(18px,2.6cqw,34px)] font-bold text-[#26232e] shadow-[3px_5px_0_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5`}
            >
              ↺ Watch again
            </button>
          </div>
        )}

        {/* Controls */}
        {started && (
          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8 transition-opacity duration-300 ${
              showChrome ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div
              className="relative flex h-4 cursor-pointer items-center gap-[3px]"
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(DURATION)}
              aria-valuenow={Math.round(time)}
              aria-valuetext={`${clock(time)} — ${scene.chapter}`}
              tabIndex={-1}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                seek(scrubAt(e));
              }}
              onPointerMove={(e) => {
                const t = scrubAt(e);
                const r = e.currentTarget.getBoundingClientRect();
                setHover({ x: e.clientX - r.left, t });
                if (e.buttons === 1) seek(t);
              }}
              onPointerLeave={() => setHover(null)}
            >
              {SCENES.map((s) => {
                const fill = Math.max(0, Math.min(1, (time - s.start) / (s.end - s.start)));
                return (
                  <div
                    key={s.id}
                    className="relative h-1.5 overflow-hidden rounded-full bg-white/25 transition-[height] group-hover:h-2"
                    style={{ flexGrow: s.end - s.start, flexBasis: 0 }}
                  >
                    <div className="absolute inset-y-0 left-0 bg-[#f7df6b]" style={{ width: `${fill * 100}%` }} />
                  </div>
                );
              })}
              {hover && (
                <div
                  className="pointer-events-none absolute bottom-5 -translate-x-1/2 whitespace-nowrap rounded bg-[#fffaf0] px-2 py-0.5 text-[11px] font-semibold text-[#26232e]"
                  style={{ left: hover.x }}
                >
                  {clock(hover.t)} · {(SCENES.find((s) => hover.t < s.end) ?? scene).chapter}
                </div>
              )}
            </div>

            <div className="mt-1.5 flex items-center gap-1 text-white">
              <CtrlButton label={playing ? "Pause (space)" : "Play (space)"} onClick={() => setPlay(!playing)}>
                {playing ? (
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                ) : (
                  <path d="M7 4.5 19 12 7 19.5z" />
                )}
              </CtrlButton>
              <CtrlButton label="Restart (Home)" onClick={() => seek(0)}>
                <path d="M12 5a7 7 0 1 1-6.6 4.7l1.9.6A5 5 0 1 0 12 7v3L7.5 6 12 2z" />
              </CtrlButton>
              <span className="ml-1 font-mono text-[11px] tabular-nums text-white/80">
                {clock(time)} / {clock(DURATION)}
              </span>
              <span className="ml-2 hidden truncate text-[11px] text-white/70 sm:inline">{scene.chapter}</span>
              <div className="ml-auto flex items-center gap-1">
                <CtrlButton label={captions ? "Hide subtitles (C)" : "Show subtitles (C)"} onClick={() => setCaptions(!captions)} active={captions}>
                  <path d="M3 5h18v14H3zm2 2v10h14V7zm2 3h4v1.5H8.5v1h2.5V14H7zm6 0h4v1.5h-2.5v1H17V14h-4z" />
                </CtrlButton>
                <CtrlButton label={isFull ? "Exit fullscreen (F)" : "Fullscreen (F)"} onClick={fullscreen}>
                  <path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z" />
                </CtrlButton>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-faint">
        <span>Space play/pause · ←/→ seek 5s · C subtitles · F fullscreen</span>
        <button type="button" onClick={() => setTranscript(!transcript)} className="text-accent hover:underline">
          {transcript ? "Hide transcript" : "Read the transcript"}
        </button>
      </div>

      {transcript && (
        <ol className="mt-2 max-h-56 space-y-0.5 overflow-auto rounded-lg border border-line bg-surface-2 p-2 text-xs">
          {CUES.map((c) => {
            const active = cue === c;
            return (
              <li key={c.start}>
                <button
                  type="button"
                  onClick={() => seek(c.start)}
                  className={`flex w-full gap-3 rounded px-2 py-1 text-left transition-colors ${
                    active ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-surface-3"
                  }`}
                >
                  <span className="shrink-0 font-mono text-ink-faint">{clock(c.start)}</span>
                  <span>{c.text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function CtrlButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-md transition-colors hover:bg-white/15 ${active ? "text-[#f7df6b]" : ""}`}
    >
      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
