import { describe, expect, it } from "vitest";
import { coneMonicCubics } from "../src/core/search/coneMonicCubic.ts";
import { solveCubicBatch } from "../src/core/solve/cubic.ts";
import { allocRootSlots } from "../src/core/solve/types.ts";

const WINDOW = { left: 0.05, top: 1.35, worldW: 0.5, worldH: 0.5 }; // s∈[.05,.55], y∈[.85,1.35]
const RHO = 3;

/** Exact membership from solved roots: complex pair in WINDOW, |r − s| ≤ RHO. */
function member(d: number, c: number, b: number): string | null {
  const coeffs = new Float64Array([d, c, b, 1]);
  const slots = allocRootSlots(1, 3);
  solveCubicBatch(coeffs, 1, slots);
  let s = NaN;
  let y = NaN;
  let r = NaN;
  for (let k = 0; k < slots.count[0]; k++) {
    if (slots.im[k] > 0) {
      s = slots.re[k];
      y = slots.im[k];
    } else if (slots.im[k] === 0) {
      r = slots.re[k];
    }
  }
  if (Number.isNaN(s) || Number.isNaN(r)) return null; // three real roots
  const inW =
    s >= WINDOW.left && s <= WINDOW.left + WINDOW.worldW &&
    y <= WINDOW.top && y >= WINDOW.top - WINDOW.worldH;
  if (!inW || Math.abs(r - s) > RHO) return null;
  return `${b},${c},${d}`;
}

describe("monic cubic view-cone", () => {
  it("≡ brute force over a generous coefficient box", () => {
    // Bounds implied by the window and ρ (doc §0/§1), padded generously.
    const K = 25;
    const brute = new Set<string>();
    for (let b = -K; b <= K; b++) {
      for (let c = -K; c <= K; c++) {
        for (let d = -K; d <= K; d++) {
          const key = member(d, c, b);
          if (key) brute.add(key);
        }
      }
    }

    const cone = new Set<string>();
    let emitted = 0;
    coneMonicCubics(WINDOW, RHO, (coeffs, count) => {
      emitted += count;
      for (let i = 0; i < count; i++) {
        const key = member(coeffs[i * 4], coeffs[i * 4 + 1], coeffs[i * 4 + 2]);
        if (key) cone.add(key);
      }
    });

    expect(brute.size).toBeGreaterThan(0);
    expect(cone).toEqual(brute); // completeness AND no spurious members
    expect(emitted).toBeLessThan(brute.size * 50); // over-coverage stays sane
  });

  it("emits no duplicate candidates", () => {
    const seen = new Set<string>();
    let emitted = 0;
    coneMonicCubics(WINDOW, RHO, (coeffs, count) => {
      emitted += count;
      for (let i = 0; i < count; i++) {
        seen.add(`${coeffs[i * 4 + 2]},${coeffs[i * 4 + 1]},${coeffs[i * 4]}`);
      }
    });
    expect(seen.size).toBe(emitted);
  });

  it("is deterministic and grows ~cubically in ρ", () => {
    const count = (rho: number): number =>
      coneMonicCubics(WINDOW, rho, () => {});
    expect(count(RHO)).toBe(count(RHO));
    const c1 = count(2);
    const c2 = count(4);
    const c3 = count(8);
    expect(c2 / c1).toBeGreaterThan(3); // cubic-ish growth (doc §4.2)
    expect(c3 / c2).toBeGreaterThan(4);
  });
});
