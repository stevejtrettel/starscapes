/**
 * The catalogues against published theorems. Each test counts stars and
 * compares with a density that was derived independently of the code
 * (docs/mathematics.md §2–3).
 */
import { describe, expect, it } from "vitest";
import { box } from "../src/catalogue/box.ts";
import { cubics, realRoot } from "../src/catalogue/cubics.ts";
import { quadratics } from "../src/catalogue/quadratics.ts";
import type { Catalogue } from "../src/catalogue/star.ts";
import type { Window } from "../src/fibre/window.ts";
import { hasRationalRoot } from "../src/poly/rationalRoot.ts";

const count = (catalogue: Catalogue, W: Window): number => {
  let n = 0;
  catalogue(W, () => n++);
  return n;
};
const hyperbolicArea = (W: Window): number => (W.s1 - W.s0) * (1 / W.y0 - 1 / W.y1);

describe("invariant truncations have constant density per hyperbolic area", () => {
  const windows: Window[] = [
    { s0: 0, s1: 1, y0: 1, y1: 2 },
    { s0: 0.2, s1: 0.7, y0: 0.25, y1: 0.4 },
  ];

  it("quadratics: #{δ ≤ Δ} ≈ (Δ³/6)·area — the class number average (π/18)·X^(3/2) per fundamental domain", () => {
    for (const W of windows) {
      const Delta = 150;
      const n = count(quadratics({ lo: 0, hi: Delta, exponent: 0 }), W);
      expect(n / ((Delta ** 3 / 6) * hyperbolicArea(W))).toBeCloseTo(1, 1.5);
    }
  });

  it("cubics: #{δ ≤ Δ} ≈ (πΔ⁴/16)·area = (π/4)·X·area for |disc| ≤ X", () => {
    for (const W of windows) {
      const Delta = 30;
      const n = count(cubics({ lo: 0, hi: Delta, exponent: 0 }), W);
      const ratio = n / (((Math.PI * Delta ** 4) / 16) * hyperbolicArea(W));
      expect(ratio).toBeGreaterThan(0.95);
      expect(ratio).toBeLessThan(1.02);
    }
  });
});

describe("Davenport–Shintani", () => {
  it("GL₂(ℤ)-classes of irreducible binary cubic forms with −X < disc < 0", () => {
    // Each class has exactly one representative with a > 0 whose complex
    // root lies in the fundamental domain {0 ≤ s ≤ 1/2, |z| ≥ 1} of GL₂(ℤ)
    // (the Mathews–Belabas reduction). Roots on its boundary are shared by
    // two representatives and count one half each.
    const X = 1e5;
    const Delta = (4 * X) ** 0.25;
    // a ≥ 1 forces 4y³ ≤ δ² ≤ Δ², which bounds the cusp.
    const F: Window = { s0: 0, s1: 0.5, y0: Math.sqrt(3) / 2, y1: (Delta / 2) ** (2 / 3) + 1e-9 };
    const edge = 1e-9;
    let classes = 0;
    cubics({ lo: 0, hi: Delta, exponent: 0 })(F, (star) => {
      const n = star.s * star.s + star.y * star.y;
      if (n < 1 - edge) return;
      if (hasRationalRoot(star.f, realRoot(star))) return;
      let weight = 1;
      if (Math.abs(n - 1) <= edge) weight /= 2;
      if (star.s <= edge || star.s >= 0.5 - edge) weight /= 2;
      classes += weight;
    });
    // Bhargava–Shankar–Tsimerman, Theorem 5:
    //   N(−X, 0) = (π²/24)·X + ζ(2/3)Γ(1/3)(2π)^(1/3)/(10Γ(2/3))·X^(5/6) + O(X^(3/4+ε)).
    // ζ(2/3) = −2.4475807…, Γ(1/3) = 2.6789385…, Γ(2/3) = 1.3541179….
    const secondary = (-2.447580736233658 * 2.678938534707747 * (2 * Math.PI) ** (1 / 3)) / (10 * 1.3541179394264);
    const predicted = (Math.PI ** 2 / 24) * X + secondary * X ** (5 / 6);
    expect(classes).toBe(28452);
    expect(Math.abs(classes / predicted - 1)).toBeLessThan(0.02); // 28452 vs 28008
  });
});

describe("Götze–Kaliada–Zaporozhets density for a coefficient box", () => {
  // Quadratics of height ≤ Q with a ≥ 1: #roots in Ω = (Q³/2)·∫_Ω ψ + O(Q²), with
  //   ψ(x + iy) = (8/3)y           on {|z| ≤ 1, |x| ≤ 1/2},
  //   ψ(x + iy) = y/(3|x|³)        on {(|x| − 1)² + y² ≤ 1, |x| > 1/2}.
  it("inside the unit disc", () => {
    const W: Window = { s0: -0.4, s1: 0.4, y0: 0.2, y1: 0.8 };
    const Q = 400;
    const integral = (8 / 3) * (W.s1 - W.s0) * ((W.y1 ** 2 - W.y0 ** 2) / 2);
    expect(Math.abs(count(box(2, Q), W) / ((Q ** 3 / 2) * integral) - 1)).toBeLessThan(0.01);
  });

  it("in the second region", () => {
    const W: Window = { s0: 1, s1: 1.4, y0: 0.4, y1: 0.8 };
    const Q = 800;
    const integral = (1 / 3) * (1 / 2) * (1 / W.s0 ** 2 - 1 / W.s1 ** 2) * ((W.y1 ** 2 - W.y0 ** 2) / 2);
    expect(Math.abs(count(box(2, Q), W) / ((Q ** 3 / 2) * integral) - 1)).toBeLessThan(0.01);
  });
});
