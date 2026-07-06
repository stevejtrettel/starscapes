import { describe, expect, it } from "vitest";
import { ownsRoot, tileGrid } from "../scripts/experiments/tiling.ts";
import { coneQuadratics } from "../src/core/search/cone.ts";

/**
 * Two-pass equivalence (worker's harvest structure, house standard):
 * pass 1 = one cone over the padded window for a ≤ aMargin (emit all);
 * pass 2 = per-cell cones over viewport + one ring, emitting only
 * a > aMargin, owned roots. Union must equal one cone over the padded
 * window with the ownership rule applied — same multiset, no duplicates.
 */

const VIEW = { centerRe: 0.0, centerIm: 1.0, height: 0.02 }; // deep-zoom-like
const VIEWPORT = 128;
const CELL_PX = 32;
const C_EFF = 0.03; // forces aMargin = ceil(0.03 / (2·0.005)) = 3
const A_MAX = 12;

function uhpKey(coeffs: Float64Array, i: number): { key: string; re: number; im: number } | null {
  const c = coeffs[i * 3];
  const b = coeffs[i * 3 + 1];
  const a = coeffs[i * 3 + 2];
  const disc = b * b - 4 * a * c;
  if (disc >= 0) return null;
  return { key: `${a},${b},${c}`, re: -b / (2 * a), im: Math.sqrt(-disc) / (2 * a) };
}

describe("two-pass harvest", () => {
  it("pass1 ∪ pass2 ≡ one padded cone with ownership applied", () => {
    const cellWorld = (CELL_PX * VIEW.height) / VIEWPORT;
    const aMargin = Math.ceil(C_EFF / (2 * cellWorld));
    expect(aMargin).toBeGreaterThanOrEqual(2); // the case the test exists for

    const pad = C_EFF / 2;
    const worldW = VIEW.height;
    const padded = {
      left: VIEW.centerRe - worldW / 2 - pad,
      top: VIEW.centerIm + VIEW.height / 2 + pad,
      worldW: worldW + 2 * pad,
      worldH: VIEW.height + 2 * pad,
    };
    const grid = tileGrid(VIEW, VIEWPORT, VIEWPORT, CELL_PX, cellWorld);

    // Two-pass emission.
    const twoPass: string[] = [];
    coneQuadratics(padded, 1, aMargin, (coeffs, n) => {
      for (let i = 0; i < n; i++) {
        const r = uhpKey(coeffs, i);
        if (r) twoPass.push(r.key);
      }
    });
    for (const t of grid.tiles) {
      const w = { left: t.left, top: t.top, worldW: t.right - t.left, worldH: t.top - t.bottom };
      coneQuadratics(w, aMargin + 1, A_MAX, (coeffs, n) => {
        for (let i = 0; i < n; i++) {
          const r = uhpKey(coeffs, i);
          if (r && ownsRoot(t, r.re, r.im)) twoPass.push(r.key);
        }
      });
    }

    // Reference: one padded cone; a ≤ aMargin unconditional, a > aMargin
    // only if owned by some cell (the completeness claim being tested is
    // that no deep dot in the padded region falls OUTSIDE all cells).
    const reference: string[] = [];
    coneQuadratics(padded, 1, A_MAX, (coeffs, n) => {
      for (let i = 0; i < n; i++) {
        const r = uhpKey(coeffs, i);
        if (!r) continue;
        const a = coeffs[i * 3 + 2];
        if (a <= aMargin) reference.push(r.key);
        else if (grid.tiles.some((t) => ownsRoot(t, r.re, r.im))) reference.push(r.key);
      }
    });

    expect(twoPass.length).toBe(new Set(twoPass).size); // no duplicates
    expect(twoPass.sort()).toEqual(reference.sort());   // no losses
  });
});
