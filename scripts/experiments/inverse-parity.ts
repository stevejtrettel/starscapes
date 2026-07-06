/**
 * Parity experiment: wide field of view, forward box search vs inverse
 * march-harvest on the same window. Ground truth = every box(B) quadratic
 * with an upper-half-plane root inside the window. Reports found / missed /
 * beyond-box finds, with misses characterized by √|disc| (the |f′| exchange
 * rate — design.md, inverse sampler mathematics), and renders both images.
 */

import { solid } from "../../src/core/coloring.ts";
import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { box, enumerateBox } from "../../src/core/search/forward.ts";
import { harvestQuadratics, inverse } from "../../src/core/search/inverse.ts";
import { classic } from "../../src/core/sizing.ts";
import { type Style, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

const BOUND = 40;
const A_MAX = 40;
const EPSILON = 0.04;
const SIZE = 800;

const view = { center: [0, 1.1] as const, height: 2.6 };
const worldW = view.height; // square image
const left = view.center[0] - worldW / 2;
const top = view.center[1] + view.height / 2;
const window = { left, top, worldW, worldH: view.height };

const inWindow = (re: number, im: number) =>
  re >= left && re <= left + worldW && im <= top && im >= top - view.height;

// --- Ground truth: box(B) quadratics with a UHP root in the window -------
const family = integerPolynomials({ degree: 2 });
const gt = new Map<string, number>(); // key → |disc|
enumerateBox(family, box(BOUND), (coeffs, count) => {
  for (let i = 0; i < count; i++) {
    const c = coeffs[i * 3];
    const b = coeffs[i * 3 + 1];
    const a = coeffs[i * 3 + 2];
    const disc = b * b - 4 * a * c;
    if (disc >= 0) continue;
    const re = -b / (2 * a);
    const im = Math.sqrt(-disc) / (2 * a);
    if (inWindow(re, im)) gt.set(`${a},${b},${c}`, -disc);
  }
});

// --- Harvest over the same window ----------------------------------------
const hv = new Set<string>();
let beyondBox = 0;
const t0 = performance.now();
harvestQuadratics(inverse({ aMax: A_MAX, epsilon: EPSILON }), window, SIZE, SIZE, (coeffs, count) => {
  for (let i = 0; i < count; i++) {
    const c = coeffs[i * 3];
    const b = coeffs[i * 3 + 1];
    const a = coeffs[i * 3 + 2];
    hv.add(`${a},${b},${c}`);
    if (Math.abs(b) > BOUND || Math.abs(c) > BOUND) beyondBox++;
  }
});
const harvestMs = performance.now() - t0;

// --- Set comparison -------------------------------------------------------
let both = 0;
const missedDiscs: number[] = [];
for (const [key, absDisc] of gt) {
  if (hv.has(key)) both++;
  else missedDiscs.push(absDisc);
}
missedDiscs.sort((p, q) => p - q);
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(2)}%`;

console.log(`window: center ${view.center}, height ${view.height} — ε=${EPSILON}, aMax=${A_MAX}, seeds ${SIZE}²`);
console.log(`ground truth (box ${BOUND}, root in window): ${gt.size}`);
console.log(`harvested: ${hv.size} in ${harvestMs.toFixed(0)} ms (${beyondBox} beyond the box — unreachable by forward search)`);
console.log(`coverage: ${both}/${gt.size} = ${pct(both, gt.size)} of ground truth found`);
if (missedDiscs.length > 0) {
  const q = (f: number) => Math.sqrt(missedDiscs[Math.min(missedDiscs.length - 1, Math.floor(f * missedDiscs.length))]);
  console.log(
    `missed: ${missedDiscs.length} — √|disc| min ${q(0).toFixed(1)}, ` +
    `median ${q(0.5).toFixed(1)}, max ${q(1).toFixed(1)} ` +
    `(large √|disc| = large |f′| = sub-pixel dots, per the exchange-rate theory)`,
  );
}

// --- Render both for the eyeball diff -------------------------------------
const style: Style = {
  sizing: classic(0.035),
  coloring: solid(0.05, 0.05, 0.05),
};
for (const [name, search] of [
  ["forward", box(BOUND)],
  ["inverse", inverse({ aMax: A_MAX, epsilon: EPSILON })],
] as const) {
  const result = renderPrint({
    family, search, filters: [upperHalfPlane], style,
    view: { center: [...view.center], height: view.height },
    image: { width: SIZE, compositing: "opaque" },
  });
  writePng(`outputs/parity-${name}.png`, result.rgb, result.width, result.height);
  console.log(`parity-${name}.png: ${result.stats.polynomials} polys, ${result.stats.drawn} drawn`);
}
