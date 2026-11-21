import { describe, expect, it } from "vitest";
import { plane } from "../src/catalogue/plane.ts";
import { quadratics } from "../src/catalogue/quadratics.ts";
import type { Star } from "../src/catalogue/star.ts";
import { pencilScan } from "../src/fibre/pencilScan.ts";
import { tailScan } from "../src/fibre/tailScan.ts";
import { contains, type Window } from "../src/fibre/window.ts";
import { evalJet } from "../src/poly/poly.ts";
import { solve } from "../src/roots/solve.ts";
import { collect, lcg, starKey } from "./support.ts";

/** Whether Σ f[k]xᵏ has a root in W (strictly non-real). */
function hasRootIn(f: number[], W: Window): boolean {
  let d = f.length - 1;
  while (d > 0 && f[d] === 0) d--;
  if (d < 1) return false;
  const g = f.slice(0, d + 1);
  const re = new Float64Array(d);
  const im = new Float64Array(d);
  solve(g, re, im);
  return Array.from(re).some((s, i) => im[i] > 1e-7 && contains(W, s, im[i]));
}

describe("pencil scan", () => {
  it("with R = 1 it is the tail scan", () => {
    const rand = lcg(31);
    for (let trial = 0; trial < 300; trial++) {
      const p = [0, ...Array.from({ length: 4 }, () => Math.floor(rand() * 9) - 4)];
      if (p[4] === 0) p[4] = 1;
      const W: Window = { s0: -0.7, s1: 0.2 + rand(), y0: 0.2 + rand(), y1: 1.5 + rand() };
      const a: number[] = [];
      const b: number[] = [];
      tailScan(p, W, (t) => a.push(t));
      pencilScan(p, [1], W, 0, -1e6, 1e6, (t) => b.push(t));
      expect(b).toEqual(a);
    }
  });

  it("T(p, R; W) ∩ ℤ ≡ brute force, including R with a root in the window", () => {
    const rand = lcg(32);
    const candidates: number[][] = [[1, 0, 1], [0, 1], [1, 1, 1], [2, -1], [1, 0, 0, 1], [5, -2, 1]];
    let members = 0;
    let extras = 0;
    for (let trial = 0; trial < 1200; trial++) {
      const d = 3 + (trial % 3);
      const p = Array.from({ length: d + 1 }, () => Math.floor(rand() * 9) - 4);
      if (p[d] === 0) p[d] = 1;
      const R = candidates[trial % candidates.length];
      const s0 = rand() * 2 - 1.3;
      const y0 = 0.15 + rand();
      const W: Window = { s0, s1: s0 + 0.1 + rand(), y0, y1: y0 + 0.1 + rand() };

      const re = new Float64Array(R.length - 1);
      const im = new Float64Array(R.length - 1);
      solve(R, re, im);
      const base = Array.from(re).filter((s, i) => im[i] > 0 && contains(W, s, im[i])).length;

      const T = 60;
      const got: number[] = [];
      pencilScan(p, R, W, base, -T, T, (t) => got.push(t));
      const want: number[] = [];
      for (let t = -T; t <= T; t++) {
        const f = p.map((c, k) => c + t * (R[k] ?? 0));
        if (hasRootIn(f, W)) want.push(t);
      }
      expect(want.filter((t) => !got.includes(t)), `p=[${p}] R=[${R}] W=${JSON.stringify(W)}`).toEqual([]);
      members += want.length;
      extras += got.length - want.length;
    }
    expect(members).toBeGreaterThan(5000);
    expect(extras).toBeLessThan(members / 200);
  });
});

describe("planar catalogue", () => {
  /** Brute force over the plane aP + bQ + cR. */
  function brute(basis: number[][], a: [number, number], H: number, W: Window): Set<string> {
    const [P, Q, R] = basis;
    const d = P.length - 1;
    const f = new Float64Array(d + 1);
    const re = new Float64Array(d);
    const im = new Float64Array(d);
    const jet = new Float64Array(4);
    const found = new Set<string>();
    const star: Star = { f, s: 0, y: 0, slope: 0 };
    for (let x = a[0]; x <= a[1]; x++) {
      for (let b = -H; b <= H; b++) {
        for (let c = -H; c <= H; c++) {
          for (let k = 0; k <= d; k++) f[k] = x * P[k] + b * (Q[k] ?? 0) + c * (R[k] ?? 0);
          solve(f, re, im);
          for (let i = 0; i < d; i++) {
            if (im[i] <= 1e-9 || !contains(W, re[i], im[i])) continue;
            evalJet(f, re[i], im[i], jet);
            if (Math.hypot(jet[2], jet[3]) < 1e-6) continue; // repeated root
            star.s = re[i];
            star.y = im[i];
            found.add(starKey(star));
          }
        }
      }
    }
    return found;
  }
  const W: Window = { s0: -0.6, s1: 0.7, y0: 0.3, y1: 1.4 };
  const families: Array<[string, number[][], [number, number], number]> = [
    ["quadratics ax² + bx + c", [[0, 0, 1], [0, 1], [1]], [1, 6], 12],
    ["HST Figure 1b: ax³ + cx² + bx + c", [[0, 0, 0, 1], [0, 1], [1, 0, 1]], [1, 7], 9],
    ["depressed cubics x³ + bx + c", [[0, 0, 0, 1], [0, 1], [1]], [1, 1], 150],
    ["reciprocal quartics a(x⁴ + 1) + b(x³ + x) + cx²", [[1, 0, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1]], [1, 5], 10],
    ["trinomials x⁵ + bx² + c", [[0, 0, 0, 0, 0, 1], [0, 0, 1], [1]], [1, 1], 25],
  ];
  for (const [name, basis, a, H] of families) {
    it(`${name} ≡ brute force`, () => {
      const got = collect((visit) => plane({ basis: basis as [number[], number[], number[]], a, H })(W, visit));
      const want = brute(basis, a, H, W);
      expect(new Set(got).size).toBe(got.length);
      expect(new Set(got)).toEqual(want);
      expect(want.size).toBeGreaterThan(5);
    });
  }

  it("the plane (x², x, 1) is the quadratic catalogue", () => {
    const A = 9;
    const viaPlane = collect((v) => plane({ basis: [[0, 0, 1], [0, 1], [1]], a: [1, A], H: 60 })(W, v));
    const direct = collect((v) => quadratics({ lo: 0, hi: 2 * A, exponent: 1 })(W, v)); // δ = 2ay ≤ 2A·y
    expect(viaPlane.sort()).toEqual(direct.sort());
  });
});
