import { Archivo_Black, Caveat, Permanent_Marker, Special_Elite } from "next/font/google";

import type { Fonts } from "./core";

// Self-hosted by next/font; the canvas draws with the generated family names.
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"], display: "block" });
const hand = Caveat({ subsets: ["latin"], display: "block" });
const type = Special_Elite({ weight: "400", subsets: ["latin"], display: "block" });
const print = Archivo_Black({ weight: "400", subsets: ["latin"], display: "block" });

export const EXPLAINER_FONTS: Fonts = {
  marker: marker.style.fontFamily,
  hand: hand.style.fontFamily,
  type: type.style.fontFamily,
  print: print.style.fontFamily,
};

export const handClass = hand.className;
