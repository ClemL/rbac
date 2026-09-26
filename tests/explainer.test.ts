import assert from "node:assert/strict";
import { test } from "node:test";

import { CUES } from "../src/explainer/script";
import { SCENES } from "../src/explainer/timeline";

const duration = SCENES[SCENES.length - 1].end;

test("explainer runs between two and five minutes", () => {
  assert.ok(duration >= 120 && duration <= 300, `duration ${duration}s`);
});

test("scenes tile the timeline without gaps", () => {
  SCENES.forEach((s, i) => {
    assert.ok(s.end > s.start, s.id);
    if (i > 0) assert.equal(s.start, SCENES[i - 1].end, s.id);
  });
});

test("subtitles are ordered, non-overlapping, readable, and inside the timeline", () => {
  CUES.forEach((c, i) => {
    assert.ok(c.end > c.start, c.text);
    assert.ok(c.end <= duration, c.text);
    if (i > 0) assert.ok(c.start >= CUES[i - 1].end, `overlap before: ${c.text}`);
    // ~20 characters per second is the upper bound for comfortable subtitle reading.
    const cps = c.text.length / (c.end - c.start);
    assert.ok(cps <= 20, `${cps.toFixed(1)} cps: ${c.text}`);
  });
});

test("every scene has at least one subtitle", () => {
  for (const s of SCENES) {
    assert.ok(CUES.some((c) => c.start >= s.start && c.start < s.end), s.id);
  }
});
