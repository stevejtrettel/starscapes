import { describe, expect, it } from "vitest";
import { cubicIrreducible, quadraticIrreducible } from "../src/core/invariants.ts";
import { solveCubicBatch } from "../src/core/solve/cubic.ts";
import { allocRootSlots } from "../src/core/solve/types.ts";

/** Irreducibility of a cubic given ascending coefficients, via solve + RRT. */
function cubicIrr(asc: number[]): boolean {
  const coeffs = new Float64Array(asc);
  const slots = allocRootSlots(1, 3);
  solveCubicBatch(coeffs, 1, slots);
  const realRoots: number[] = [];
  for (let k = 0; k < slots.count[0]; k++) {
    if (slots.im[k] === 0) realRoots.push(slots.re[k]);
  }
  return cubicIrreducible(coeffs, 0, realRoots, realRoots.length);
}

describe("quadratic irreducibility", () => {
  it("disc < 0 ⇒ irreducible", () => {
    expect(quadraticIrreducible(-4)).toBe(true); // x² + 1
  });
  it("perfect-square disc ⇒ reducible", () => {
    expect(quadraticIrreducible(1)).toBe(false);  // x² − 5x + 6 = (x−2)(x−3)
    expect(quadraticIrreducible(4)).toBe(false);  // x² − 1... disc 4
    expect(quadraticIrreducible(0)).toBe(false);  // (x−1)²
  });
  it("positive non-square disc ⇒ irreducible", () => {
    expect(quadraticIrreducible(8)).toBe(true);   // x² − 2
    expect(quadraticIrreducible(5)).toBe(true);   // x² − x − 1
  });
});

describe("cubic irreducibility (rational root theorem on solved roots)", () => {
  it("known reducibles", () => {
    expect(cubicIrr([-1, 1, -1, 1])).toBe(false); // (x−1)(x²+1)
    expect(cubicIrr([2, 1, 2, 1])).toBe(false);   // (x+2)(x²+1)... x³+2x²+x+2
    expect(cubicIrr([-3, -1, -1, 2])).toBe(false); // (2x−3)(x²+x+1)
    expect(cubicIrr([-6, 11, -6, 1])).toBe(false); // (x−1)(x−2)(x−3)
  });
  it("known irreducibles", () => {
    expect(cubicIrr([-2, 0, 0, 1])).toBe(true);   // x³ − 2
    expect(cubicIrr([-1, -1, 0, 1])).toBe(true);  // x³ − x − 1 (plastic number)
    expect(cubicIrr([1, 1, 0, 1])).toBe(true);    // x³ + x + 1
    expect(cubicIrr([-1, -3, 0, 1])).toBe(true);  // x³ − 3x − 1 (three real roots, all irrational)
  });

  it("agrees with brute-force RRT over a random box", () => {
    let seed = 424242;
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const rc = () => Math.floor(rand() * 21) - 10;

    for (let trial = 0; trial < 1500; trial++) {
      const asc = [rc(), rc(), rc(), Math.max(1, Math.abs(rc()))];
      const [d, c, b, a] = asc;

      // Brute force: any rational root p/q with q | a, p | d (or p = 0 when d = 0)?
      let reducible = false;
      if (d === 0) reducible = true; // x = 0 is a root
      else {
        outer: for (let q = 1; q <= Math.abs(a); q++) {
          if (Math.abs(a) % q !== 0) continue;
          for (let p = -Math.abs(d); p <= Math.abs(d); p++) {
            if (p === 0 || Math.abs(d) % Math.abs(p) !== 0) continue;
            if (a * p * p * p + b * p * p * q + c * p * q * q + d * q * q * q === 0) {
              reducible = true;
              break outer;
            }
          }
        }
      }

      expect(cubicIrr(asc), `cubic asc=[${asc}]`).toBe(!reducible);
    }
  });
});
