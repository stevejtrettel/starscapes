import { describe, expect, it } from "vitest";
import { cubics } from "../src/catalogue/cubics.ts";
import { quartics } from "../src/catalogue/quartics.ts";
import type { Shell } from "../src/catalogue/star.ts";
import { irreducibleCubics, irreducibleQuartics } from "../src/catalogue/transport.ts";
import type { Window } from "../src/fibre/window.ts";
import { hasQuadraticFactor, isIrreducible } from "../src/poly/rationalRoot.ts";
import { solve } from "../src/roots/solve.ts";
import { starscape } from "../src/starscape.ts";
import { hyperbolic } from "../src/style/sizeLaw.ts";
import { collect, lcg, starKey } from "./support.ts";

/** Whether the integer polynomial g divides f over ℚ: the pseudo-remainder lead(g)^k·f mod g is 0. */
function divides(g: number[], f: ArrayLike<number>): boolean {
  const m = g.length - 1;
  const rest = Array.from(f, BigInt);
  const divisor = g.map(BigInt);
  for (let k = rest.length - 1; k >= m; k--) {
    const top = rest[k];
    for (let j = 0; j < rest.length; j++) rest[j] *= divisor[m];
    for (let j = 0; j <= m; j++) rest[k - m + j] -= top * divisor[j];
  }
  return rest.every((c) => c === 0n);
}

/** Reducibility over ℚ by trial: some integer factor of degree 1 or 2 with coefficients ≤ bound. */
function reducibleByTrial(f: ArrayLike<number>, bound: number): boolean {
  for (let a = 1; a <= bound; a++) {
    for (let b = -bound; b <= bound; b++) {
      if (divides([b, a], f)) return true;
      if (f.length - 1 < 4) continue;
      for (let c = -bound; c <= bound; c++) if (divides([c, b, a], f)) return true;
    }
  }
  return false;
}

describe("irreducibility over ℚ from one complex root", () => {
  it("a quadratic factor is found from its root", () => {
    // (2x² − 2x + 5)(3x² + x − 7): the first factor has the roots (1 ± 3i)/2.
    const f = [-35, 19, -1, -4, 6];
    expect(hasQuadraticFactor(f, 0.5, 1.5)).toBe(true);
    expect(isIrreducible(f, 0.5, 1.5)).toBe(false);
    // 2·(x² + 1)(x² + x + 1): the content does not hide the factor.
    expect(hasQuadraticFactor([2, 2, 4, 2, 2], 0, 1)).toBe(true);
    // x⁴ + 1 is irreducible, although it factors over ℚ(√2): (1 + i)/√2 is not quadratic over ℚ.
    expect(isIrreducible([1, 0, 0, 0, 1], Math.SQRT1_2, Math.SQRT1_2)).toBe(true);
    // (2x − 1)²(x² + 1): a repeated rational root, between the two real roots of the cofactor.
    expect(isIrreducible([1, -4, 5, -4, 4], 0, 1)).toBe(false);
  });

  for (const d of [3, 4]) {
    it(`agrees with trial division on random polynomials of degree ${d}`, () => {
      const rand = lcg(100 + d);
      const [re, im] = [new Float64Array(d), new Float64Array(d)];
      let [reducible, irreducible] = [0, 0];
      for (let trial = 0; trial < 400; trial++) {
        const f = Array.from({ length: d + 1 }, () => Math.floor(rand() * 9) - 4);
        if (f[d] === 0) f[d] = 1 + Math.floor(rand() * 4);
        f[d] = Math.abs(f[d]);
        solve(f, re, im);
        // A factor of a polynomial of height 4 has coefficients at most 2^d·√(d + 1)·4 by Mignotte; far fewer occur.
        const expected = !reducibleByTrial(f, 12);
        for (let i = 0; i < d; i++) {
          if (im[i] < 1e-6) continue;
          expect(isIrreducible(f, re[i], im[i]), `${f} at ${re[i]} + ${im[i]}i`).toBe(expected);
          if (expected) irreducible++;
          else reducible++;
        }
      }
      expect(Math.min(reducible, irreducible)).toBeGreaterThan(20);
    });
  }
});

describe("the irreducible catalogues", () => {
  const W: Window = { s0: -0.3, s1: 0.8, y0: 0.03, y1: 1.3 };

  it("irreducible cubics ≡ the cubic catalogue, sieved", () => {
    for (const shell of [{ lo: 0, hi: 8, exponent: 1 / 3 }, { lo: 2, hi: 5, exponent: 0 }] as Shell[]) {
      const sieved = collect((v) => cubics(shell)(W, (star) => isIrreducible(star.f, star.s, star.y) && v(star))).sort();
      expect(collect((v) => irreducibleCubics(shell)(W, v)).sort()).toEqual(sieved);
      expect(sieved.length).toBeGreaterThan(100);
    }
  });

  it("irreducible quartics ≡ the quartic catalogue, sieved", { timeout: 120_000 }, () => {
    for (const [shell, tau] of [[{ lo: 0, hi: 7, exponent: 0.4 }, 1], [{ lo: 0, hi: 4.5, exponent: 0 }, 2]] as Array<[Shell, number]>) {
      const window = tau === 1 ? W : { ...W, y0: 0.15 };
      const sieved = collect((v) =>
        quartics(shell, { tau })(window, (star) => isIrreducible(star.f, star.s, star.y) && v(star)),
      ).sort();
      expect(collect((v) => irreducibleQuartics(shell, tau)(window, v)).sort()).toEqual(sieved);
      expect(sieved.length).toBeGreaterThan(100);
    }
  });

  it("a starscape's irreducible stars, for a family without symmetry", () => {
    const family = { kind: "box", degree: 4, height: 3, monic: false } as const;
    const view: Window = { s0: -1, s1: 1, y0: 0.1, y1: 1.5 };
    const all = collect((v) => starscape({ family, law: hyperbolic(0.1) }).stars(0)(view, v));
    const some = new Set(collect((v) => starscape({ family, law: hyperbolic(0.1), irreducible: true }).stars(0)(view, v)));
    expect(some.size).toBeGreaterThan(100);
    expect(some.size).toBeLessThan(all.length);
    // x⁴ + x² + 1 = (x² + x + 1)(x² − x + 1) has no rational root, and is not irreducible.
    const product = starKey({ f: Float64Array.of(1, 0, 1, 0, 1), s: 0.5, y: Math.sqrt(3) / 2, slope: 0 });
    expect(all).toContain(product);
    expect(some.has(product)).toBe(false);
    expect(() => starscape({ family: { ...family, degree: 5 }, law: hyperbolic(0.1), irreducible: true })).toThrow(/degree 4/);
  });
});
