import { describe, expect, it } from "vitest";
import { discriminant, discriminantExact } from "../src/poly/discriminant.ts";
import { derivative, evalJet, evalReal, format, shift } from "../src/poly/poly.ts";
import { realRoots } from "../src/poly/realRoots.ts";
import { solve } from "../src/roots/solve.ts";
import { lcg } from "./support.ts";

describe("polynomial arithmetic", () => {
  it("evalJet returns f(z) and f′(z)", () => {
    const f = [1, -3, 0, 2]; // 2x³ − 3x + 1
    const out = new Float64Array(4);
    evalJet(f, 2, 0, out);
    expect(Array.from(out)).toEqual([11, 0, 21, 0]);
    evalJet(f, 0, 1, out); // f(i) = 1 − 5i, f′(i) = −9
    expect(Array.from(out)).toEqual([1, -5, -9, 0]);
  });

  it("shift is the Taylor shift", () => {
    const rand = lcg(1);
    for (let trial = 0; trial < 50; trial++) {
      const f = Array.from({ length: 6 }, () => Math.floor(rand() * 9) - 4);
      const g = shift(f, 3);
      for (const x of [-2, 0.5, 1]) expect(evalReal(g, x)).toBeCloseTo(evalReal(f, x + 3), 8);
    }
  });

  it("formats as on paper", () => {
    expect(format([1, 0, -1, 2])).toBe("2x^3 - x^2 + 1");
    expect(format([0, 1])).toBe("x");
  });
});

describe("discriminant", () => {
  it("the closed forms agree with the exact Sylvester computation", () => {
    const rand = lcg(2);
    for (let trial = 0; trial < 500; trial++) {
      const d = 2 + (trial % 2);
      const f = Array.from({ length: d + 1 }, () => Math.floor(rand() * 41) - 20);
      if (f[d] === 0) f[d] = 1;
      expect(BigInt(discriminant(f))).toBe(discriminantExact(f));
    }
  });

  it("equals a_d^(2d−2) ∏ (αᵢ − αⱼ)² in degrees 4–6", () => {
    const rand = lcg(3);
    for (let trial = 0; trial < 200; trial++) {
      const d = 4 + (trial % 3);
      const f = Array.from({ length: d + 1 }, () => Math.floor(rand() * 9) - 4);
      if (f[d] === 0) f[d] = 1;
      const re = new Float64Array(d);
      const im = new Float64Array(d);
      solve(f, re, im);
      // ∏_{i<j} (αᵢ − αⱼ)² is real; accumulate it as a complex number.
      let pr = f[d] ** (2 * d - 2);
      let pi = 0;
      for (let i = 0; i < d; i++) {
        for (let j = i + 1; j < d; j++) {
          const ur = re[i] - re[j];
          const ui = im[i] - im[j];
          const [qr, qi] = [ur * ur - ui * ui, 2 * ur * ui];
          [pr, pi] = [pr * qr - pi * qi, pr * qi + pi * qr];
        }
      }
      const exact = Number(discriminantExact(f));
      expect(Math.abs(pr - exact)).toBeLessThan(1e-6 * (1 + Math.abs(exact)));
    }
  });

  it("known values", () => {
    expect(discriminantExact([-1, -1, 0, 1])).toBe(-23n); // x³ − x − 1
    expect(discriminantExact([1, 0, 0, 0, 1])).toBe(256n); // x⁴ + 1
    expect(discriminantExact([1, 1, 0, 0, 0, 1])).toBe(3381n); // x⁵ + x + 1 = 5⁵ + 4⁴
  });
});

describe("real roots in an interval", () => {
  it("finds exactly the roots of a product of linear factors", () => {
    const rand = lcg(4);
    for (let trial = 0; trial < 300; trial++) {
      const n = 1 + Math.floor(rand() * 6);
      const roots = Array.from({ length: n }, () => Math.round((rand() * 6 - 3) * 8) / 8);
      const distinct = [...new Set(roots)].sort((a, b) => a - b);
      let f = [rand() < 0.5 ? 2 : -1];
      for (const r of distinct) {
        const g = new Array<number>(f.length + 1).fill(0);
        for (let k = 0; k < f.length; k++) {
          g[k + 1] += f[k];
          g[k] -= r * f[k];
        }
        f = g;
      }
      const lo = -1.3;
      const hi = 1.9;
      const want = distinct.filter((r) => r >= lo && r <= hi);
      const got = realRoots(f, lo, hi);
      expect(got.length, `roots ${distinct}`).toBe(want.length);
      for (const [i, r] of got.entries()) expect(r).toBeCloseTo(want[i], 9);
    }
  });

  it("derivative has the expected coefficients", () => {
    expect(derivative([5, 4, 3, 2])).toEqual([4, 6, 6]);
  });
});
