import { describe, expect, it } from "vitest";
import { quarticInvariants, quarticShape, quartics, quarticU, quarticWithinShape } from "../src/catalogue/quartics.ts";
import { delta, inShell, type Shell, type Star } from "../src/catalogue/star.ts";
import { allQuartics, quarticsBySymmetry } from "../src/catalogue/transport.ts";
import type { Window } from "../src/fibre/window.ts";
import { positionOfQuartic } from "../src/modular/domain.ts";
import { discriminantExact } from "../src/poly/discriminant.ts";
import { bruteStars, collect, lcg, starKey } from "./support.ts";

describe("the invariants of a quartic star", () => {
  const rand = lcg(61);
  /** A quartic with root s + iy and the given other roots, with |f′(z)|. */
  function star(s: number, y: number, a4: number, other: { r1: number; r2: number } | { s2: number; y2: number }): Star {
    const g = "r1" in other
      ? [a4 * other.r1 * other.r2, -a4 * (other.r1 + other.r2), a4]
      : [a4 * (other.s2 ** 2 + other.y2 ** 2), -2 * a4 * other.s2, a4];
    const q = [s * s + y * y, -2 * s, 1];
    const f = new Float64Array(5);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) f[i + j] += q[i] * g[j];
    const gz = Math.hypot(g[0] + g[1] * s + g[2] * (s * s - y * y), g[1] * y + 2 * g[2] * s * y);
    return { f, s, y, slope: 2 * y * gz };
  }
  const close = (a: number, b: number): void => expect(Math.abs(a - b)).toBeLessThan(1e-7 * (1 + Math.abs(b)));

  it("I = 4U² − 3P, J = 2U(8U² − 9P), with P = δ²/4", () => {
    for (let t = 0; t < 2000; t++) {
      const [s, y, a4] = [rand() * 3 - 1.5, 0.1 + rand() * 2, 0.5 + rand() * 3];
      const other = t % 2 ? { r1: rand() * 6 - 3, r2: rand() * 6 - 3 } : { s2: rand() * 3 - 1.5, y2: 0.1 + rand() * 2 };
      const z = star(s, y, a4, other);
      const U = quarticU(z);
      const P = delta(z) ** 2 / 4;
      const [I, J] = quarticInvariants(z.f);
      close(4 * U * U - 3 * P, I);
      close(2 * U * (8 * U * U - 9 * P), J);
    }
  });

  it("χ = cos(θ/2) for two real roots, |χ| = coth d(z, z₂) for a second pair", () => {
    for (let t = 0; t < 2000; t++) {
      const [s, y, a4] = [rand() * 3 - 1.5, 0.1 + rand() * 2, 0.5 + rand() * 3];
      if (t % 2) {
        // The ray from z to the real point r leaves z at angle 2·atan((r − s)/y) from vertical-down.
        const [r1, r2] = [rand() * 6 - 3, rand() * 6 - 3];
        const half = Math.atan((r1 - s) / y) - Math.atan((r2 - s) / y);
        close(quarticShape(star(s, y, a4, { r1, r2 })), Math.cos(half));
      } else {
        const [s2, y2] = [rand() * 3 - 1.5, 0.1 + rand() * 2];
        const cosh = 1 + ((s - s2) ** 2 + (y - y2) ** 2) / (2 * y * y2);
        close(Math.abs(quarticShape(star(s, y, a4, { s2, y2 }))), cosh / Math.sqrt(cosh * cosh - 1));
      }
    }
  });

  it("27·disc = 4I³ − J² on integer quartics", () => {
    for (let t = 0; t < 300; t++) {
      const f = Array.from({ length: 5 }, () => Math.floor(rand() * 13) - 6);
      const [I, J] = quarticInvariants(f);
      if (f[4] !== 0) expect(27n * discriminantExact(f)).toBe(4n * BigInt(I) ** 3n - BigInt(J) ** 2n);
    }
  });
});

describe("quartic catalogue", () => {
  const W: Window = { s0: -0.25, s1: 0.4, y0: 0.7, y1: 1.3 };

  for (const [name, shell, tau] of [
    ["two real roots (τ = 1), bounded δ", { lo: 0, hi: 5.5, exponent: 0 }, 1],
    ["τ = 1.5, hyperbolic shell", { lo: 0, hi: 5, exponent: 0.5 }, 1.5],
    ["a middle shell", { lo: 3.5, hi: 5.5, exponent: 0 }, 1],
  ] as Array<[string, Shell, number]>) {
    it(`≡ brute force: ${name}`, { timeout: 60_000 }, () => {
      const keep = (z: Star): boolean => inShell(shell, delta(z), z.y) && quarticWithinShape(z, tau);
      // Members have a₄ ≤ (1 + τ)·hi/(4y₀²) < 8 and coefficients within the box below.
      const brute = bruteStars([[-14, 14], [-14, 14], [-14, 14], [-11, 11], [1, 7]], W, keep);
      const got = collect((v) => quartics(shell, { tau })(W, v));
      expect(new Set(got).size).toBe(got.length);
      expect(new Set(got)).toEqual(brute);
      expect(brute.size).toBeGreaterThan(20);
    });
  }

  it("#{δ ≤ Δ, |χ| ≤ τ} → (πτ/40)·Δ⁵ per unit hyperbolic area", { timeout: 60_000 }, () => {
    const area = (W.s1 - W.s0) * (1 / W.y0 - 1 / W.y1);
    for (const tau of [1, 2]) {
      const ratios = [10, 18].map((Delta) => {
        let n = 0;
        quartics({ lo: 0, hi: Delta, exponent: 0 }, { tau })(W, () => n++);
        return n / (((Math.PI * tau) / 40) * Delta ** 5 * area);
      });
      // From below, and closer for the larger Δ (0.87 → 0.91 → 0.94 at Δ = 10, 18, 28).
      expect(ratios[1]).toBeGreaterThan(ratios[0]);
      expect(ratios[1]).toBeGreaterThan(0.88);
      expect(ratios[1]).toBeLessThan(1);
    }
  });

  it("does not depend on how the window is cut", { timeout: 60_000 }, () => {
    const catalogue = quartics({ lo: 0, hi: 9, exponent: 0 }, { tau: 1.5 });
    const all = collect((v) => catalogue(W, v)).sort();
    for (const [axis, at] of [["y", 1], ["y", Math.SQRT1_2 + 0.2], ["s", 0], ["s", 0.25]] as const) {
      const first: Window = axis === "y" ? { ...W, y1: at } : { ...W, s1: at };
      const second: Window = axis === "y" ? { ...W, y0: at } : { ...W, s0: at };
      const parts = collect((v) => catalogue(first, v));
      catalogue(second, (star) => {
        if ((axis === "y" ? star.y : star.s) > at) parts.push(starKey(star));
      });
      expect(parts.sort(), `cut at ${axis} = ${at}`).toEqual(all);
    }
  });
});

describe("quartics by symmetry", () => {
  it("exact position of a quartic's root in the fundamental domain", () => {
    const h = Math.sqrt(3) / 2;
    expect(positionOfQuartic([2, -3, 4, -3, 2], 0, 1)).toBe("i"); // (x² + 1)(2x² − 3x + 2), root i
    expect(positionOfQuartic([2, -3, 4, -3, 2], 0.75, 0.6614378277661477)).toBe("outside"); // its other root: |z| = 1, s > 0
    expect(positionOfQuartic([1, 1, 2, 1, 1], -0.5, h)).toBe("rho"); // (x² + x + 1)(x² + 1)
    expect(positionOfQuartic([1, 1, 2, 1, 1], 0, 1)).toBe("i");
    expect(positionOfQuartic([3, 0, 4, 0, 1], 0, Math.sqrt(3))).toBe("inside"); // (x² + 1)(x² + 3), root i√3
    expect(positionOfQuartic([4, 2, 5, 1, 1], -0.5, Math.sqrt(15) / 2)).toBe("inside"); // (x² + x + 4)(x² + 1): s = −1/2
    expect(positionOfQuartic([4, -2, 5, -1, 1], 0.5, Math.sqrt(15) / 2)).toBe("outside"); // s = +1/2
    expect(positionOfQuartic([0, 1, 0, 1, 0], 0, 1)).toBe("i"); // y·x(x² + y²): a root at infinity
    // Near a boundary but not on it: floating point decides.
    expect(positionOfQuartic([5, 0, 6, 0, 1], 1e-9, Math.sqrt(5))).toBe("inside");
  });

  const windows: Window[] = [
    { s0: -0.6, s1: 0.6, y0: 0.2, y1: 1.3 },
    { s0: 0.1, s1: 0.7, y0: 0.12, y1: 0.5 },
  ];
  for (const [i, W] of windows.entries()) {
    for (const [shell, tau] of [
      [{ lo: 0, hi: 4.2, exponent: 0 }, 1],
      [{ lo: 0, hi: 5, exponent: 0.5 }, 1.5],
      [{ lo: 2, hi: 4.5, exponent: 0.3 }, 0.6],
    ] as Array<[Shell, number]>) {
      it(`transport ≡ direct: window ${i}, e = ${shell.exponent}, τ = ${tau}`, { timeout: 120_000 }, () => {
        const direct = collect((v) => quartics(shell, { tau })(W, v)).sort();
        const carried = collect((v) => quarticsBySymmetry(shell, tau)(W, v));
        expect(new Set(carried).size, "no star twice").toBe(carried.length);
        expect(carried.sort()).toEqual(direct);
        expect(collect((v) => allQuartics(shell, tau)(W, v)).sort()).toEqual(direct);
        expect(direct.length).toBeGreaterThan(10);
      });
    }
  }

  it("a form with |χ| = τ exactly is kept by both methods", () => {
    // (x² + 1)(x² − x + 1): the roots i and e^(iπ/3) are at distance arcoth 2, so χ = 2.
    const shell: Shell = { lo: 0, hi: 6.9, exponent: 0.4 };
    const W: Window = { s0: 0.2, s1: 0.8, y0: 0.6, y1: 1.1 };
    const direct = collect((v) => quartics(shell, { tau: 2 })(W, v)).sort();
    expect(direct).toContain(starKey({ f: Float64Array.of(1, -1, 2, -1, 1), s: 0.5, y: Math.sqrt(3) / 2, slope: 0 }));
    expect(collect((v) => quarticsBySymmetry(shell, 2)(W, v)).sort()).toEqual(direct);
  });
});
