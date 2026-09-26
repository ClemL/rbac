import { C, INK, ease, font, k, pop } from "../core";
import { stroke } from "../ink";
import { scrap } from "../paper";
import { measure, write } from "../text";

/** Chapter heading: a numbered paper disc and a marker title that writes itself on. */
export function heading(num: string, text: string, x: number, y: number, t: number, at: number, color: string = C.mustard) {
  scrap(
    {
      key: `num:${num}:${color}`,
      w: 92,
      h: 92,
      color,
      shape: "circle",
      edge: "torn",
      paint: (c, w, h) => {
        c.font = font("marker", 58);
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = INK;
        c.fillText(num, w / 2, h / 2 + 4);
      },
    },
    x,
    y,
    { scale: pop(t, at), rot: -0.08 },
  );
  const size = 76;
  write(text, x + 70, y + 4, { kind: "marker", size, align: "left", progress: ease.outCubic(k(t, at + 0.2, at + 1.1)) });
  const w = measure(text, font("marker", size));
  stroke(
    [
      { x: x + 70, y: y + 50 },
      { x: x + 70 + w * 0.5, y: y + 56 },
      { x: x + 70 + w, y: y + 48 },
    ],
    { seed: text.length * 7, width: 7, color: C.red, progress: ease.outCubic(k(t, at + 1.0, at + 1.5)) },
  );
}
