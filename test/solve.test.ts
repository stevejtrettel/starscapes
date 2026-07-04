import { describe, expect, it } from "vitest";
import { format, residual2 } from "../src/core/polynomial.ts";
import { solveCubicBatch } from "../src/core/solve/cubic.ts";
import { solveQuadraticBatch } from "../src/core/solve/quadratic.ts";
import { allocRootSlots, type RootSlots } from "../src/core/solve/types.ts";

/** Solve one polynomial given ascending coefficients. */
function solveOne(coeffsAsc: number[]): { out: RootSlots; degree: number } {
  const degree = coeffsAsc.length - 1;
  const coeffs = new Float64Array(coeffsAsc);
  const out = allocRootSlots(1, degree);
  if (degree === 2) solveQuadraticBatch(coeffs, 1, out);
  else if (degree === 3) solveCubicBatch(coeffs, 1, out);
  else throw new Error(`no solver for degree ${degree}`);
  return { out, degree };
}

function roots(coeffsAsc: number[]): Array<{ re: number; im: number; mult: number }> {
  const { out } = solveOne(coeffsAsc);
  const n = out.count[0];
  const list = [];
  for (let k = 0; k < n; k++) {
    list.push({ re: out.re[k], im: out.im[k], mult: out.mult[k] });
  }
  return list;
}

describe("quadratic solver", () => {
  it("x² + 1 → ±i", () => {
    const r = roots([1, 0, 1]);
    expect(r).toHaveLength(2);
    expect(r[0].re).toBe(0);
    expect(r[0].im).toBe(1); // upper-half-plane member first
    expect(r[1].im).toBe(-1);
  });

  it("x² − 5x + 6 → 2, 3 ascending, exactly real", () => {
    const r = roots([6, -5, 1]);
    expect(r[0].re).toBeCloseTo(2, 14);
    expect(r[1].re).toBeCloseTo(3, 14);
    expect(r[0].im).toBe(0);
    expect(r[1].im).toBe(0);
  });

  it("x² − 2x + 1 → double root 1, exact multiplicity", () => {
    const r = roots([1, -2, 1]);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ re: 1, im: 0, mult: 2 });
  });

  it("citardauq pairing is stable when |b| dominates", () => {
    // x² − 10⁶x + 1: the naive formula loses the small root to cancellation.
    // Assert the Vieta invariants tightly instead of a hand-computed root.
    const r = roots([1, -1e6, 1]);
    expect(r[0].re * r[1].re).toBeCloseTo(1, 10); // product = c/a
    expect(r[0].re + r[1].re).toBeCloseTo(1e6, 4); // sum = −b/a
    expect(r[0].re).toBeGreaterThan(0.9e-6);
    expect(r[0].re).toBeLessThan(1.1e-6);
  });
});

describe("cubic solver", () => {
  it("(x−1)(x²+1) = x³ − x² + x − 1 → 1 and ±i", () => {
    const r = roots([-1, 1, -1, 1]);
    expect(r).toHaveLength(3);
    expect(r[0].re).toBeCloseTo(1, 14);
    expect(r[0].im).toBe(0);
    expect(r[1].re).toBeCloseTo(0, 14);
    expect(r[1].im).toBeCloseTo(1, 14);
    expect(r[2].im).toBeCloseTo(-1, 14);
  });

  it("(x−1)(x−2)(x−3) → 1, 2, 3 ascending", () => {
    const r = roots([-6, 11, -6, 1]);
    expect(r.map((x) => x.re)).toEqual(
      [1, 2, 3].map((v) => expect.closeTo(v, 12) as unknown as number),
    );
    expect(r.every((x) => x.im === 0)).toBe(true);
  });

  it("(x−1)³ → triple root, exact", () => {
    const r = roots([-1, 3, -3, 1]);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ re: 1, im: 0, mult: 3 });
  });

  it("(x−1)²(x−2) → double 1, simple 2, exact", () => {
    const r = roots([-2, 5, -4, 1]);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ re: 1, im: 0, mult: 2 });
    expect(r[1]).toEqual({ re: 2, im: 0, mult: 1 });
  });

  it("x³ − 2 → ∛2 and its conjugate pair", () => {
    const r = roots([-2, 0, 0, 1]);
    const c = Math.cbrt(2);
    expect(r[0].re).toBeCloseTo(c, 14);
    expect(r[1].re).toBeCloseTo(-c / 2, 14);
    expect(r[1].im).toBeCloseTo((c * Math.sqrt(3)) / 2, 14);
  });
});

describe("solver honesty over random integer boxes", () => {
  // Deterministic LCG so failures reproduce.
  let seed = 12345;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const randCoef = (bound: number) => Math.floor(rand() * (2 * bound + 1)) - bound;

  it("multiplicities always sum to the degree, residuals are tiny", () => {
    for (const degree of [2, 3]) {
      for (let trial = 0; trial < 2000; trial++) {
        const asc = Array.from({ length: degree + 1 }, () => randCoef(40));
        if (asc[degree] === 0) asc[degree] = 1; // exact degree
        const coeffs = new Float64Array(asc);
        const { out } = solveOne(asc);

        let multSum = 0;
        let scale = 0;
        for (const a of asc) scale = Math.max(scale, Math.abs(a));
        for (let k = 0; k < out.count[0]; k++) {
          multSum += out.mult[k];
          const zAbs = Math.hypot(out.re[k], out.im[k]);
          const bound = scale * (1 + zAbs) ** degree;
          const res = Math.sqrt(residual2(coeffs, out.re[k], out.im[k]));
          expect(
            res,
            `residual for ${format(coeffs)} at root ${out.re[k]} + ${out.im[k]}i`,
          ).toBeLessThan(1e-10 * bound);
        }
        expect(multSum, `mult sum for ${format(coeffs)}`).toBe(degree);
      }
    }
  });
});
