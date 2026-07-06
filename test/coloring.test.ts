/**
 * Coloring rules (design.md Level 3 "Coloring rules in code"): the Galois
 * classification against named cubics with hand-checked discriminants, the
 * declared-structure invariants (palette/class match, loud failures), and
 * byScalar's declared-domain clamping and log transform.
 */
import { describe, expect, it } from "vitest";
import { byClass, byGaloisGroup, byScalar, lerpRamp, solid } from "../src/core/coloring.ts";
import { cubicIrreducible, discriminant } from "../src/core/invariants.ts";
import type { PolyRow, RootRow } from "../src/core/rows.ts";

/** A hand-built root row (rules read poly facts through root.poly). */
const row = (
  fields: Partial<{ degree: number; disc: number; irreducible: boolean; height: number; lead: number; im: number; fprime: number }> = {},
): RootRow => {
  const poly = {
    degree: fields.degree ?? 3,
    lead: fields.lead ?? 1,
    coeffs: new Float64Array(0),
    disc: fields.disc ?? 0,
    height: fields.height ?? 1,
    irreducible: fields.irreducible ?? true,
    roots: [],
  } as unknown as PolyRow;
  return { re: 0, im: fields.im ?? 1, mult: 1, fprime: fields.fprime ?? 1, poly };
};

const out = new Float64Array(3);
const classOf = (rule: ReturnType<typeof byGaloisGroup>, r: RootRow): string => {
  rule.color(r, out);
  const k = rule.palette?.findIndex((p) => p[0] === out[0] && p[1] === out[1] && p[2] === out[2]);
  return rule.classes?.[k ?? -1] ?? "?";
};

describe("byGaloisGroup, degree 3", () => {
  const galois = byGaloisGroup(3);

  // Named cubics, disc by the invariants.ts formula, irreducibility by the
  // house rational-root test (both exact).
  const cases: Array<{ name: string; coeffs: number[]; expected: string }> = [
    // x³ − 3x + 1: disc = 81 = 9², no rational root → C₃ (the 2cos(2π/9) field)
    { name: "x³ − 3x + 1", coeffs: [1, -3, 0, 1], expected: "C₃" },
    // x³ + x² − 2x − 1: disc = 49 = 7², no rational root → C₃ (the 2cos(2π/7) field)
    { name: "x³ + x² − 2x − 1", coeffs: [-1, -2, 1, 1], expected: "C₃" },
    // x³ − x + 1: disc = −23 < 0 → S₃
    { name: "x³ − x + 1", coeffs: [1, -1, 0, 1], expected: "S₃" },
    // x³ − 2: disc = −108 → S₃ (the classic non-normal cubic)
    { name: "x³ − 2", coeffs: [-2, 0, 0, 1], expected: "S₃" },
    // x³ + 2x + 1: disc = −59 → S₃, disc not a square though |disc| is prime-ish
    { name: "x³ + 2x + 1", coeffs: [1, 2, 0, 1], expected: "S₃" },
    // x³ − x = x(x−1)(x+1): disc = 4 = 2², a square — but REDUCIBLE, and
    // reducibility must win over the square test.
    { name: "x³ − x (square disc, reducible)", coeffs: [0, -1, 0, 1], expected: "reducible" },
    // x³ − 1 = (x−1)(x²+x+1): disc = −27 → reducible
    { name: "x³ − 1", coeffs: [-1, 0, 0, 1], expected: "reducible" },
  ];

  for (const { name, coeffs, expected } of cases) {
    it(`${name} → ${expected}`, () => {
      const c = Float64Array.from(coeffs);
      const disc = discriminant(c, 0, 3);
      // Real roots for the rational-root test: candidates are integer for
      // monic cubics; test each divisor-nominated value directly by giving
      // the exact roots' approximations. Solve is overkill here — the
      // irreducibility routine only needs real-root approximations, and
      // every rational root of these monic cubics is an integer in [-2, 2].
      const approx = [-2, -1, 0, 1, 2].filter((x) => {
        const f = ((c[3] * x + c[2]) * x + c[1]) * x + c[0];
        return Math.abs(f) < 0.5;
      });
      const irreducible = cubicIrreducible(c, 0, approx, approx.length);
      expect(classOf(galois, row({ disc, irreducible }))).toBe(expected);
    });
  }
});

describe("byGaloisGroup, degree 2", () => {
  const galois = byGaloisGroup(2);
  it("x² + 1 → C₂; x² − 1 → reducible", () => {
    expect(classOf(galois, row({ degree: 2, disc: -4, irreducible: true }))).toBe("C₂");
    expect(classOf(galois, row({ degree: 2, disc: 4, irreducible: false }))).toBe("reducible");
  });
});

describe("declared structure, loudly checked", () => {
  it("palette length must match class count", () => {
    expect(() =>
      byClass({
        classes: ["a", "b", "c"],
        classify: () => 0,
        palette: [[0, 0, 0]],
      }),
    ).toThrow(/3 classes/);
  });

  it("an out-of-range classification throws, not wraps", () => {
    const rule = byClass({ classes: ["only"], classify: () => 7, palette: [[0, 0, 0]] });
    expect(() => rule.color(row({}), out)).toThrow(/outside \[0, 1\)/);
  });

  it("solid declares nothing; byClass declares classes + palette", () => {
    expect(solid(0, 0, 0).classes).toBeUndefined();
    const galois = byGaloisGroup(3);
    expect(galois.classes).toEqual(["reducible", "C₃", "S₃"]);
    expect(galois.palette).toHaveLength(3);
  });
});

describe("byScalar declared domains", () => {
  const bw = byScalar({
    label: "height",
    of: (r) => r.poly.height,
    domain: [1, 100],
    transform: "log",
    ramp: lerpRamp([1, 1, 1], [0, 0, 0]),
  });
  const grayAt = (height: number): number => {
    bw.color(row({ height }), out);
    return out[0];
  };

  it("log transform: the geometric midpoint of the domain is the ramp midpoint", () => {
    expect(grayAt(10)).toBeCloseTo(0.5, 12); // 10 = √(1·100)
  });

  it("out-of-domain clamps to the ramp ends — color meaning is absolute", () => {
    expect(grayAt(0.01)).toBe(1); // below domain → ramp(0)
    expect(grayAt(1e6)).toBe(0); //  above domain → ramp(1)
  });

  it("declares its scalar provenance for legends", () => {
    expect(bw.scalar).toEqual({ label: "height", domain: [1, 100], transform: "log" });
  });

  it("rejects impossible domains loudly", () => {
    const ramp = lerpRamp([0, 0, 0], [1, 1, 1]);
    expect(() => byScalar({ label: "x", of: () => 0, domain: [5, 5], ramp })).toThrow(/lo < hi/);
    expect(() =>
      byScalar({ label: "x", of: () => 0, domain: [0, 1], transform: "log", ramp }),
    ).toThrow(/positive domain/);
  });
});
