/** Scene order and timing. Keep in step with the subtitle cues in `script.ts`. */

import { C } from "./core";
import { camPath, type Scene } from "./engine";
import { drawIntro, drawKeys } from "./scenes/act1";
import { drawGroups, drawPermissions, drawRoles } from "./scenes/act2";
import { drawDrift, drawSandbox } from "./scenes/act3";
import { drawMontage, drawOutro, drawShortcuts } from "./scenes/act4";

type SceneDef = Omit<Scene, "start" | "end"> & { length: number };

const DEFS: SceneDef[] = [
  {
    id: "intro",
    chapter: "The question",
    length: 16,
    backdrop: "cream",
    wipe: C.cream,
    cam: camPath([
      [0, { z: 1.0 }],
      [8, { z: 1.05, y: 520 }],
      [16, { z: 1.0 }],
    ]),
    draw: drawIntro,
  },
  {
    id: "keys",
    chapter: "Keys everywhere",
    length: 20,
    backdrop: "cream",
    wipe: C.sky,
    cam: camPath([
      [0, { z: 1.08, y: 600 }],
      [3, { z: 1.0 }],
      [7, { z: 1.0 }],
      [12, { z: 1.06, y: 600, r: -0.01 }],
      [14, { z: 1.0 }],
    ]),
    shakes: [11.3],
    draw: drawKeys,
  },
  {
    id: "permissions",
    chapter: "Permissions",
    length: 18,
    backdrop: "graph",
    wipe: C.mustard,
    cam: camPath([
      [0, { x: 930 }],
      [9, { x: 980, z: 1.03 }],
      [18, { x: 960, z: 1.0 }],
    ]),
    shakes: [12.3],
    draw: drawPermissions,
  },
  {
    id: "roles",
    chapter: "Roles",
    length: 16,
    backdrop: "cream",
    wipe: C.mint,
    cam: camPath([
      [0, { z: 1.0 }],
      [5, { z: 1.04, x: 900 }],
      [9, { z: 1.0 }],
      [16, { z: 1.02 }],
    ]),
    draw: drawRoles,
  },
  {
    id: "groups",
    chapter: "Groups",
    length: 22,
    backdrop: "kraft",
    wipe: C.orange,
    cam: camPath([
      [0, { z: 1.0 }],
      [7, { z: 1.05, x: 900, y: 560 }],
      [14, { z: 1.05, x: 900, y: 560 }],
      [17.4, { z: 1.0, y: 560 }],
      [22, { z: 1.0, y: 580 }],
    ]),
    draw: drawGroups,
  },
  {
    id: "drift",
    chapter: "Drift",
    length: 26,
    backdrop: "cork",
    wipe: C.red,
    cam: camPath([
      [0, { z: 1.0 }],
      [4.4, { z: 1.0 }],
      [5.4, { z: 1.4, x: 360, y: 600 }],
      [10.6, { z: 1.4, x: 360, y: 600 }],
      [11.6, { z: 1.4, x: 960, y: 600 }],
      [16.6, { z: 1.4, x: 960, y: 600 }],
      [17.6, { z: 1.4, x: 1560, y: 600 }],
      [23.4, { z: 1.4, x: 1560, y: 600 }],
      [24.8, { z: 1.0 }],
    ]),
    shakes: [9.6, 15.6, 20.6],
    draw: drawDrift,
  },
  {
    id: "sandbox",
    chapter: "The sandbox",
    length: 32,
    backdrop: "desk",
    wipe: C.blue,
    cam: camPath([
      [0, { z: 1.0 }],
      [4.6, { z: 1.0 }],
      [5.6, { z: 1.45, x: 450, y: 560 }],
      [9.8, { z: 1.45, x: 450, y: 560 }],
      [10.8, { z: 1.0 }],
      [15.8, { z: 1.0 }],
      [16.6, { z: 1.5, x: 470, y: 520 }],
      [19.8, { z: 1.5, x: 470, y: 520 }],
      [20.6, { z: 1.0 }],
      [21.6, { z: 1.0 }],
      [22.4, { z: 1.3, x: 1250, y: 600 }],
      [30.4, { z: 1.3, x: 1250, y: 600 }],
      [31.6, { z: 1.0 }],
    ]),
    shakes: [23.25, 26.25],
    draw: drawSandbox,
  },
  {
    id: "shortcuts",
    chapter: "No shortcuts",
    length: 16,
    backdrop: "cream",
    wipe: C.pink,
    shakes: [3.0, 7.6],
    draw: drawShortcuts,
  },
  {
    id: "montage",
    chapter: "Thirteen reviews",
    length: 14,
    backdrop: "cork",
    wipe: C.lilac,
    cam: camPath([
      [0, { z: 1.0 }],
      [8, { z: 1.0 }],
      [14, { z: 1.06 }],
    ]),
    draw: drawMontage,
  },
  {
    id: "outro",
    chapter: "Your turn",
    length: 16,
    backdrop: "cream",
    wipe: C.yellow,
    shakes: [3.6],
    draw: drawOutro,
  },
];

export const SCENES: Scene[] = (() => {
  let at = 0;
  return DEFS.map(({ length, ...d }) => {
    const s = { ...d, start: at, end: at + length };
    at += length;
    return s;
  });
})();

/** Frame used as the poster before playback starts. */
export const POSTER_TIME = 13.4;
