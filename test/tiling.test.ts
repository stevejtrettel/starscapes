import { describe, expect, it } from "vitest";
import { coneQuadratics } from "../src/core/search/cone.ts";
import { ownsRoot, tileGrid } from "../src/live/tiling.ts";

/** UHP root of ax²+bx+c when disc < 0, else null. */
function uhpRoot(a: number, b: number, c: number): { re: number; im: number } | null {
  const disc = b * b - 4 * a * c;
  if (disc >= 0) return null;
  return { re: -b / (2 * a), im: Math.sqrt(-disc) / (2 * a) };
}

function coneOwnedKeys(
  window: { left: number; top: number; worldW: number; worldH: number },
  owns: (re: number, im: number) => boolean,
  aMax: number,
): string[] {
  const keys: string[] = [];
  coneQuadratics(window, 1, aMax, (coeffs, count) => {
    for (let i = 0; i < count; i++) {
      const c = coeffs[i * 3];
      const b = coeffs[i * 3 + 1];
      const a = coeffs[i * 3 + 2];
      const root = uhpRoot(a, b, c);
      if (root && owns(root.re, root.im)) keys.push(`${a},${b},${c}`);
    }
  });
  return keys;
}

// View chosen so a cell boundary lands EXACTLY at re = 1/2 (rational root
// coordinates make exact edge landings possible — e.g. x² − x + 1 at
// 1/2 + i√3/2): center 0.5, two 64px cells across a 128px viewport.
const VIEW = { centerRe: 0.5, centerIm: 0.85, height: 0.4 };
const VIEWPORT = 128;
const TILE_PX = 64;

describe("cell grid", () => {
  it("every point in the padded view has exactly one owning cell", () => {
    const grid = tileGrid(VIEW, VIEWPORT, VIEWPORT, TILE_PX, 0.02);
    // Sample a lattice of points including exact cell boundaries.
    for (let i = 0; i <= 16; i++) {
      for (let j = 0; j <= 16; j++) {
        const re = VIEW.centerRe - 0.2 + (0.4 * i) / 16; // hits 0.5 exactly
        const im = VIEW.centerIm - 0.2 + (0.4 * j) / 16;
        if (im <= 0) continue;
        const owners = grid.tiles.filter((t) => ownsRoot(t, re, im)).length;
        expect(owners, `point ${re}, ${im}`).toBe(1);
      }
    }
  });

  it("partition equivalence: ∪(cone per cell ∩ owned) ≡ untiled cone ∩ owned-by-any", () => {
    const grid = tileGrid(VIEW, VIEWPORT, VIEWPORT, TILE_PX, 0.02);
    const aMax = 12;

    const tiled: string[] = [];
    for (const t of grid.tiles) {
      const window = { left: t.left, top: t.top, worldW: t.right - t.left, worldH: t.top - t.bottom };
      tiled.push(...coneOwnedKeys(window, (re, im) => ownsRoot(t, re, im), aMax));
    }

    // Reference: one cone over the grid's bounding rectangle.
    const first = grid.tiles[0];
    const last = grid.tiles[grid.tiles.length - 1];
    const bound = { left: first.left, top: first.top, worldW: last.right - first.left, worldH: first.top - last.bottom };
    const whole = coneOwnedKeys(
      bound,
      (re, im) => grid.tiles.some((t) => ownsRoot(t, re, im)),
      aMax,
    );

    expect(tiled.length).toBe(new Set(tiled).size); // no duplicates across cells
    expect(tiled.sort()).toEqual(whole.sort());     // no losses either
  });

  it("a boundary-exact root (x² − x + 1, re = 1/2) is counted exactly once", () => {
    const grid = tileGrid(VIEW, VIEWPORT, VIEWPORT, TILE_PX, 0);
    let count = 0;
    for (const t of grid.tiles) {
      const window = { left: t.left, top: t.top, worldW: t.right - t.left, worldH: t.top - t.bottom };
      coneQuadratics(window, 1, 1, (coeffs, n) => {
        for (let i = 0; i < n; i++) {
          if (coeffs[i * 3] === 1 && coeffs[i * 3 + 1] === -1 && coeffs[i * 3 + 2] === 1) {
            const root = uhpRoot(1, -1, 1)!;
            if (ownsRoot(t, root.re, root.im)) count++;
          }
        }
      });
    }
    expect(count).toBe(1);
  });
});
