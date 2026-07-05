/**
 * E10: local count quotas vs the uniform-depth baseline. Mirrors the live
 * worker exactly (two-pass margin harvest, per-cell quota with uniform
 * floor). See docs/experiments.md for the prediction.
 */
import { discriminant } from "../../src/core/invariants.ts";
import { coneQuadratics } from "../../src/core/search/cone.ts";
import { solveQuadraticBatch } from "../../src/core/solve/quadratic.ts";
import { allocRootSlots } from "../../src/core/solve/types.ts";
import { ownsRoot, tileGrid } from "../../src/live/tiling.ts";

const VIEWPORT = 600;
const CELL_PX = 32;
const N_QUOTA = 48;
const C0 = 0.035;
const DUST_FACTOR = 3;
const DEPTH_FLOOR = 5;
const HOME_HEIGHT = 2.6;
const WORK_GUARD = 2_000_000;
const DEPTH_GUARD = 100_000;

interface Stats {
  population: number;
  haloCount: number;
  minCell: number;
  medianCell: number;
  depthMin: number;
  depthMax: number;
  ms: number;
  signature: number;
}

function run(
  view: { centerRe: number; centerIm: number; height: number },
  quota: boolean,
): Stats {
  const t0 = performance.now();
  const cEff = C0 * Math.cbrt(view.height / HOME_HEIGHT);
  const aUniform = Math.max(DEPTH_FLOOR, Math.ceil((DUST_FACTOR * cEff * VIEWPORT) / (2 * view.height)));
  const pad = cEff / 2;
  const padded = {
    left: view.centerRe - view.height / 2 - pad,
    top: view.centerIm + view.height / 2 + pad,
    worldW: view.height + 2 * pad,
    worldH: view.height + 2 * pad,
  };
  const cellWorld = (CELL_PX * view.height) / VIEWPORT;
  const grid = tileGrid(view, VIEWPORT, VIEWPORT, CELL_PX, cellWorld);
  const aMargin = Math.ceil(cEff / (2 * cellWorld));

  const slots = allocRootSlots(4096, 2);
  let population = 0;
  let haloCount = 0;
  let signature = 0;

  const tally = (coeffs: Float64Array, count: number, owner: { key: number } | null, t?: ReturnType<typeof grid.tiles.at>): number => {
    solveQuadraticBatch(coeffs, count, slots);
    let owned = 0;
    for (let i = 0; i < count; i++) {
      const disc = discriminant(coeffs, i * 3, 2);
      if (disc >= 0) continue;
      const re = slots.re[i * 2];
      const im = slots.im[i * 2];
      if (t) {
        if (!ownsRoot(t, re, im)) continue;
        owned++;
      }
      if (owner === null || owner.key === 1) {
        population++;
        signature = (signature * 31 + coeffs[i * 3] + 7 * coeffs[i * 3 + 1]) % 1_000_000_007;
        if (Math.abs(re * re + im * im - 1) < 0.01) haloCount++;
      }
    }
    return owned;
  };

  // Pass 1.
  if (aMargin >= 1) {
    coneQuadratics(padded, 1, aMargin, (coeffs, n) => {
      tally(coeffs, n, { key: 1 });
    });
  }

  // Pass 2.
  const cells = grid.tiles;
  const ownedCount = new Int32Array(cells.length);
  const work = new Float64Array(cells.length);
  const stoppedAt = new Int32Array(cells.length);
  let active = cells.length;
  for (let ti = 0; ti < cells.length; ti++) {
    if (cells[ti].top <= 0) { stoppedAt[ti] = 1; active--; }
  }

  let level = 0;
  for (let a = 1; a <= DEPTH_GUARD && active > 0; a++) {
    level = a;
    const emit = a > aMargin;
    for (let ti = 0; ti < cells.length; ti++) {
      if (stoppedAt[ti] !== 0) continue;
      const t = cells[ti];
      const w = { left: t.left, top: t.top, worldW: t.right - t.left, worldH: t.top - t.bottom };
      coneQuadratics(w, a, a, (coeffs, n) => {
        ownedCount[ti] += tally(coeffs, n, emit ? { key: 1 } : { key: 0 }, t);
      });
      work[ti] += Math.max(1, 2 * a * (t.right - t.left) + 1);
      const quotaMet = quota
        ? ownedCount[ti] >= N_QUOTA && a >= aUniform
        : a >= aUniform; // baseline: uniform depth only
      if (quotaMet || work[ti] >= WORK_GUARD) {
        stoppedAt[ti] = a;
        active--;
      }
    }
  }

  // Per-cell stats over above-axis cells intersecting the viewport proper.
  const counts: number[] = [];
  let depthMin = level;
  let depthMax = 0;
  for (let ti = 0; ti < cells.length; ti++) {
    const t = cells[ti];
    if (t.top <= 0) continue;
    const d = stoppedAt[ti] === 0 ? level : stoppedAt[ti];
    depthMin = Math.min(depthMin, d);
    depthMax = Math.max(depthMax, d);
    counts.push(ownedCount[ti]);
  }
  counts.sort((p, q) => p - q);

  return {
    population,
    haloCount,
    minCell: counts[0] ?? 0,
    medianCell: counts[Math.floor(counts.length / 2)] ?? 0,
    depthMin,
    depthMax,
    ms: performance.now() - t0,
    signature,
  };
}

const geo = { centerRe: 0.6, centerIm: 0.8, height: 0.15 };
console.log("view | mode | population | halo | cell min/median | depth min…max | ms");
for (const [name, mode] of [["baseline", false], ["quota", true]] as const) {
  const s = run(geo, mode);
  console.log(
    `geodesic | ${name} | ${String(s.population).padStart(7)} | ${String(s.haloCount).padStart(5)} | ` +
    `${s.minCell}/${s.medianCell} | ${s.depthMin}…${s.depthMax} | ${s.ms.toFixed(0)}`,
  );
}
const d1 = run(geo, true);
const d2 = run(geo, true);
console.log(`determinism: ${d1.signature === d2.signature && d1.population === d2.population ? "IDENTICAL" : "MISMATCH"}`);

for (let k = 0; k <= 9; k += 3) {
  const s = run({ centerRe: 0.318, centerIm: 0.842, height: 2.6 / 2 ** k }, true);
  console.log(
    `k=${k} | quota | ${String(s.population).padStart(7)} | ${String(s.haloCount).padStart(5)} | ` +
    `${s.minCell}/${s.medianCell} | ${s.depthMin}…${s.depthMax} | ${s.ms.toFixed(0)}`,
  );
}
