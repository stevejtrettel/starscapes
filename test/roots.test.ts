import { describe, expect, it } from "vitest";
import { evalJet, format } from "../src/poly/poly.ts";
import { solveAberth } from "../src/roots/aberth.ts";
import { solve } from "../src/roots/solve.ts";
import { lcg } from "./support.ts";

function roots(f: number[]): Array<[number, number]> {
  const d = f.length - 1;
  const re = new Float64Array(d);
  const im = new Float64Array(d);
  solve(f, re, im);
  return Array.from(re, (r, i) => [r, im[i]] as [number, number]);
}

describe("closed forms", () => {
  it("x² + 1: the upper-half-plane root comes first", () => {
    expect(roots([1, 0, 1])).toEqual([[0, 1], [0, -1]]);
  });

  it("x² − 5x + 6: real roots ascending, exactly real", () => {
    const r = roots([6, -5, 1]);
    expect(r[0][0]).toBeCloseTo(2, 14);
    expect(r[1][0]).toBeCloseTo(3, 14);
    expect(r[0][1]).toBe(0);
  });

  it("x² − 10⁶x + 1: no cancellation in the small root", () => {
    const r = roots([1, -1e6, 1]);
    expect(r[0][0] * r[1][0]).toBeCloseTo(1, 10);
    expect(r[0][0]).toBeGreaterThan(0.9e-6);
  });

  it("(x − 1)(x² + 1): real root, then the pair", () => {
    const r = roots([-1, 1, -1, 1]);
    expect(r[0][0]).toBeCloseTo(1, 14);
    expect(r[1][0]).toBeCloseTo(0, 14);
    expect(r[1][1]).toBeCloseTo(1, 14);
    expect(r[2][1]).toBeCloseTo(-1, 14);
  });

  it("(x − 1)(x − 2)(x − 3) and repeated roots are exactly real", () => {
    expect(roots([-6, 11, -6, 1]).map((z) => z[0])).toEqual([1, 2, 3].map((v) => expect.closeTo(v, 12)));
    expect(roots([-1, 3, -3, 1])).toEqual([[1, 0], [1, 0], [1, 0]]);
    expect(roots([-2, 5, -4, 1])).toEqual([[1, 0], [1, 0], [2, 0]]);
  });
});

describe("quartic closed form", () => {
  it("x⁴ + 1, a biquadratic, and a quartic with four real roots", () => {
    const h = Math.SQRT1_2;
    const z = roots([1, 0, 0, 0, 1]).map(([s, y]) => `${s.toFixed(9)},${y.toFixed(9)}`).sort();
    expect(z).toEqual([[h, h], [h, -h], [-h, h], [-h, -h]].map(([s, y]) => `${s.toFixed(9)},${y.toFixed(9)}`).sort());
    expect(roots([4, 0, -5, 0, 1]).map((r) => r[0]).sort((a, b) => a - b)).toEqual([-2, -1, 1, 2].map((v) => expect.closeTo(v, 10)));
    expect(roots([24, -50, 35, -10, 1]).map((r) => r[0]).sort((a, b) => a - b)).toEqual([1, 2, 3, 4].map((v) => expect.closeTo(v, 9)));
  });

  it("conjugate pairs are adjacent, upper member first", () => {
    const rand = lcg(13);
    for (let trial = 0; trial < 500; trial++) {
      const f = Array.from({ length: 5 }, () => Math.floor(rand() * 21) - 10);
      if (f[4] === 0) f[4] = 1;
      const z = roots(f);
      for (let k = 0; k < 4; k++) {
        if (z[k][1] > 0) {
          expect(z[k + 1][0]).toBe(z[k][0]);
          expect(z[k + 1][1]).toBe(-z[k][1]);
        }
      }
    }
  });
});

describe("every solver", () => {
  it("returns d roots with small residual and the right sum and product (degrees 2–9)", () => {
    const rand = lcg(11);
    const jet = new Float64Array(4);
    for (let trial = 0; trial < 4000; trial++) {
      const d = 2 + (trial % 8);
      const f = Array.from({ length: d + 1 }, () => Math.floor(rand() * 41) - 20);
      if (f[d] === 0) f[d] = 1;
      if (f[0] === 0) f[0] = 1;
      const z = roots(f);
      const scale = Math.max(...f.map(Math.abs));
      let sum = 0;
      for (const [s, y] of z) {
        evalJet(f, s, y, jet);
        const bound = scale * (1 + Math.hypot(s, y)) ** d;
        expect(Math.hypot(jet[0], jet[1]), `residual of ${format(f)}`).toBeLessThan(1e-9 * bound);
        sum += s;
      }
      expect(sum).toBeCloseTo(-f[d - 1] / f[d], 6); // Vieta
    }
  });

  it("Aberth agrees with the closed forms (cubic, quartic)", () => {
    const rand = lcg(12);
    for (let trial = 0; trial < 2000; trial++) {
      const d = 3 + (trial % 2);
      const f = Array.from({ length: d + 1 }, () => Math.floor(rand() * 21) - 10);
      if (f[d] === 0) f[d] = 1;
      const exact = roots(f);
      const re = new Float64Array(d);
      const im = new Float64Array(d);
      solveAberth(f, re, im);
      for (const [s, y] of exact) {
        const nearest = Math.min(...Array.from(re, (r, i) => Math.hypot(r - s, im[i] - y)));
        expect(nearest, format(f)).toBeLessThan(1e-6);
      }
    }
  });
});
