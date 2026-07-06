/**
 * Sizing rules (design.md Level 3 "Sizing rules in code"): the f′-form
 * power law against the mathematics it claims — fprimeAt against a direct
 * derivative evaluation, the discLaw conversion identities against the
 * disc-form originals they replace, and the law-owned NaN-safe cap
 * semantics (cap lives INSIDE size). Property style, seeded LCG
 * (conventions.md).
 */
import { describe, expect, it } from "vitest";
import { discriminant, fprimeAt } from "../src/core/invariants.ts";
import { evalComplex } from "../src/core/polynomial.ts";
import type { RootRow as SentenceRootRow } from "../src/core/rows.ts";
import { classic, discLaw, powerLaw } from "../src/core/sizing.ts";
import { solveCubicBatch } from "../src/core/solve/cubic.ts";
import { solveQuadraticBatch } from "../src/core/solve/quadratic.ts";
import { allocRootSlots } from "../src/core/solve/types.ts";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const relClose = (a: number, b: number, tol: number) =>
  Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b));

/** |f′(z)| by direct Horner on the derivative's coefficients (k·a_k). */
function fprimeDirect(coeffs: Float64Array, off: number, degree: number, re: number, im: number): number {
  const d = new Float64Array(degree);
  for (let k = 1; k <= degree; k++) d[k - 1] = k * coeffs[off + k];
  const out = new Float64Array(2);
  evalComplex(d, re, im, out, 0, 0, degree);
  return Math.hypot(out[0], out[1]);
}

// Laws read im/fprime only; the cast supplies the rest of the row shape.
const row = (fields: { degree?: number; im?: number; fprime?: number }): SentenceRootRow =>
  ({ re: 0, im: 0, mult: 1, fprime: 0, ...fields }) as unknown as SentenceRootRow;

describe("fprimeAt", () => {
  it("≡ direct derivative evaluation at every root (quadratics and cubics)", () => {
    const rand = lcg(20260706);
    const slots2 = allocRootSlots(1, 2);
    const slots3 = allocRootSlots(1, 3);
    const q = new Float64Array(3);
    const cu = new Float64Array(4);
    let checked = 0;
    while (checked < 400) {
      const deg = rand() < 0.5 ? 2 : 3;
      const coeffs = deg === 2 ? q : cu;
      for (let k = 0; k < deg; k++) coeffs[k] = Math.floor(rand() * 61) - 30;
      coeffs[deg] = 1 + Math.floor(rand() * 20);
      if (discriminant(coeffs, 0, deg) === 0) continue; // simple roots only here
      const slots = deg === 2 ? slots2 : slots3;
      if (deg === 2) solveQuadraticBatch(coeffs, 1, slots);
      else solveCubicBatch(coeffs, 1, slots);
      for (let k = 0; k < slots.count[0]; k++) {
        const viaSlots = fprimeAt(slots, deg, 0, k, coeffs[deg]);
        const direct = fprimeDirect(coeffs, 0, deg, slots.re[k], slots.im[k]);
        expect(relClose(viaSlots, direct, 1e-8)).toBe(true);
        checked++;
      }
    }
  });

  it("is exactly 0 at a multiple root", () => {
    const slots = allocRootSlots(1, 2);
    solveQuadraticBatch(new Float64Array([1, -2, 1]), 1, slots); // (x−1)²
    expect(slots.mult[0]).toBe(2);
    expect(fprimeAt(slots, 2, 0, 0, 1)).toBe(0);
  });
});

describe("discLaw conversion identities", () => {
  it("deg 2: reproduces c·y^β/|disc|^α at the complex root", () => {
    const rand = lcg(7);
    const slots = allocRootSlots(1, 2);
    const coeffs = new Float64Array(3);
    let checked = 0;
    while (checked < 200) {
      coeffs[0] = Math.floor(rand() * 61) - 30;
      coeffs[1] = Math.floor(rand() * 61) - 30;
      coeffs[2] = 1 + Math.floor(rand() * 20);
      const disc = discriminant(coeffs, 0, 2);
      if (disc >= 0) continue;
      solveQuadraticBatch(coeffs, 1, slots);
      const y = slots.im[0];
      const fp = fprimeAt(slots, 2, 0, 0, coeffs[2]);
      for (const [alpha, beta] of [[0.5, 1], [1, 1], [0.5, 0], [1, 0], [0.5, 0.5]] as const) {
        const rule = discLaw({ alpha, beta, c: 0.05, degree: 2 });
        const expected = (0.05 * y ** beta) / Math.abs(disc) ** alpha;
        expect(relClose(rule.size(row({ im: y, fprime: fp })), expected, 1e-9)).toBe(true);
      }
      checked++;
    }
  });

  it("deg 3: reproduces c·y^β/|disc|^α, and classic(c) is the old 'fprime' law c/(2√q)", () => {
    const rand = lcg(99);
    const slots = allocRootSlots(1, 3);
    const coeffs = new Float64Array(4);
    let checked = 0;
    while (checked < 200) {
      for (let k = 0; k < 3; k++) coeffs[k] = Math.floor(rand() * 41) - 20;
      coeffs[3] = 1; // monic, as the cubic laws are used
      const disc = discriminant(coeffs, 0, 3);
      if (disc >= 0) continue; // complex pair
      solveCubicBatch(coeffs, 1, slots);
      const k = 1; // real root ascending first, then the UHP pair member
      const y = slots.im[k];
      expect(y).toBeGreaterThan(0);
      const fp = fprimeAt(slots, 3, 0, k, 1);
      const r = row({ degree: 3, im: y, fprime: fp });
      for (const [alpha, beta] of [[0.25, 0], [0.5, 1]] as const) {
        const rule = discLaw({ alpha, beta, c: 0.03, degree: 3 });
        const expected = (0.03 * y ** beta) / Math.abs(disc) ** alpha;
        expect(relClose(rule.size(r), expected, 1e-8)).toBe(true);
      }
      const q = Math.sqrt(Math.abs(disc)) / (2 * y);
      expect(relClose(classic(0.03).size(r), 0.03 / (2 * Math.sqrt(q)), 1e-8)).toBe(true);
      checked++;
    }
  });
});

describe("cap semantics — the law owns its cap (inside size)", () => {
  const flat = (c: number, cap: number) => powerLaw({ c, gamma: 1, delta: 0, cap });

  it("a finite hyperbolic cap zeroes real-axis dots; cap: Infinity keeps the law", () => {
    // A real root of x² − 1: y = 0, |f′| = 2.
    expect(flat(0.02, 0.5).size(row({ im: 0, fprime: 2 }))).toBe(0);
    expect(flat(0.02, Infinity).size(row({ im: 0, fprime: 2 }))).toBe(0.01);
  });

  it("a multiple root under an uncapped law sizes to ∞ — the draw pass drops it", () => {
    // (x−1)²: |f′| = 0 exactly, y = 0 — Infinity·0 = NaN must not cap.
    expect(flat(0.02, Infinity).size(row({ im: 0, fprime: 0 }))).toBe(Infinity);
  });
});
