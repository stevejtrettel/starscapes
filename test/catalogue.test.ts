import { describe, expect, it } from "vitest";
import { box } from "../src/catalogue/box.ts";
import { cubics } from "../src/catalogue/cubics.ts";
import { quadratics } from "../src/catalogue/quadratics.ts";
import { type Catalogue, delta, inShell, type Shell } from "../src/catalogue/star.ts";
import type { Window } from "../src/fibre/window.ts";
import { bruteStars, collect, starKey } from "./support.ts";

/** Asserts catalogue ∩ W equals the brute-force set, with no repeats. */
function expectEqual(catalogue: Catalogue, W: Window, brute: Set<string>): void {
  const got = collect((visit) => catalogue(W, visit));
  expect(new Set(got).size, "no star visited twice").toBe(got.length);
  expect(new Set(got)).toEqual(brute);
  expect(brute.size).toBeGreaterThan(20);
}

const NEAR_I: Window = { s0: -0.4, s1: 0.5, y0: 0.55, y1: 1.3 };

describe("quadratic catalogue ≡ brute force", () => {
  const cases: Array<[string, Shell]> = [
    ["bounded discriminant (e = 0)", { lo: 0, hi: 14, exponent: 0 }],
    ["bounded leading coefficient (e = 1)", { lo: 0, hi: 13, exponent: 1 }],
    ["a middle shell (e = 1)", { lo: 5, hi: 13, exponent: 1 }],
    ["fractional exponent", { lo: 2, hi: 12, exponent: 2 / 3 }],
    ["exponent above 1", { lo: 0, hi: 9, exponent: 1.5 }],
  ];
  for (const [name, shell] of cases) {
    it(name, () => {
      // Every member has a ≤ 25, |b| ≤ 2a·0.5, c ≤ a(0.25 + 1.69): inside the box below.
      const brute = bruteStars([[-60, 60], [-60, 60], [1, 30]], NEAR_I, (star) =>
        inShell(shell, delta(star), star.y),
      );
      expectEqual(quadratics(shell), NEAR_I, brute);
    });
  }

  it("abutting shells partition the catalogue", () => {
    const whole = collect((v) => quadratics({ lo: 0, hi: 20, exponent: 1 })(NEAR_I, v));
    const parts = [0, 4, 9, 20].slice(1).flatMap((hi, i) =>
      collect((v) => quadratics({ lo: [0, 4, 9][i], hi, exponent: 1 })(NEAR_I, v)),
    );
    expect(parts.sort()).toEqual(whole.sort());
  });

  it("a window on the real axis is finite for e = 1 and refused for e = 0", () => {
    const W: Window = { s0: 0, s1: 1, y0: 0, y1: 1 };
    expect(collect((v) => quadratics({ lo: 0, hi: 8, exponent: 1 })(W, v)).length).toBeGreaterThan(0);
    expect(() => quadratics({ lo: 0, hi: 8, exponent: 0 })(W, () => {})).toThrow(/infinitely many/);
  });
});

describe("cubic catalogue ≡ brute force", () => {
  const W: Window = { s0: -0.3, s1: 0.45, y0: 0.6, y1: 1.4 };
  const ranges: Array<[number, number]> = [[-28, 28], [-28, 28], [-28, 28], [1, 9]];

  for (const [name, shell] of [
    ["bounded discriminant (e = 0)", { lo: 0, hi: 9, exponent: 0 }],
    ["hyperbolic visibility (e = 1/2)", { lo: 0, hi: 9, exponent: 0.5 }],
    ["a middle shell", { lo: 5, hi: 9.5, exponent: 0.25 }],
  ] as Array<[string, Shell]>) {
    it(`all cubics, ${name}`, () => {
      const brute = bruteStars(ranges, W, (star) => inShell(shell, delta(star), star.y));
      expectEqual(cubics(shell), W, brute);
    });
  }

  it("monic cubics", () => {
    const shell: Shell = { lo: 0, hi: 22, exponent: 0 };
    const brute = bruteStars([[-80, 80], [-80, 80], [-30, 30], [1, 1]], W, (star) =>
      inShell(shell, delta(star), star.y),
    );
    expectEqual(cubics(shell, { monic: true }), W, brute);
  });

  it("δ⁴ = 4|disc|", () => {
    cubics({ lo: 0, hi: 9, exponent: 0 })(W, (star) => {
      const [d, c, b, a] = star.f;
      const disc = 18 * a * b * c * d - 4 * b ** 3 * d + b * b * c * c - 4 * a * c ** 3 - 27 * a * a * d * d;
      expect(delta(star) ** 4).toBeCloseTo(-4 * disc, 6);
    });
  });
});

describe("box catalogue ≡ brute force", () => {
  it("quartics of height 3, wide window", () => {
    const W: Window = { s0: -1.2, s1: 1.2, y0: 0.05, y1: 1.6 };
    const brute = bruteStars([[-3, 3], [-3, 3], [-3, 3], [-3, 3], [1, 3]], W);
    expectEqual(box(4, 3), W, brute);
  });

  it("quintics of height 2, small window (the pruned regime)", () => {
    const W: Window = { s0: 0.3, s1: 0.42, y0: 0.7, y1: 0.8 };
    const brute = bruteStars([[-2, 2], [-2, 2], [-2, 2], [-2, 2], [-2, 2], [1, 2]], W);
    expectEqual(box(5, 2), W, brute);
  });

  it("monic sextics of height 1", () => {
    const W: Window = { s0: -0.2, s1: 0.5, y0: 0.5, y1: 1.1 };
    const brute = bruteStars([[-1, 1], [-1, 1], [-1, 1], [-1, 1], [-1, 1], [-1, 1], [1, 1]], W);
    expectEqual(box(6, 1, { monic: true }), W, brute);
  });
});

describe("a catalogue does not depend on how the window is cut", () => {
  // Cuts at heights and abscissae where stars sit exactly: y = 2/7 is the
  // lowest point of the curve of 49x³ + 4x + t, tangent to that edge.
  const whole: Window = { s0: -0.5, s1: 1, y0: 0.1, y1: 1.1 };
  const cuts: Array<["s" | "y", number]> = [["y", 2 / 7], ["y", 0.5], ["y", Math.sqrt(3) / 2], ["s", 0], ["s", 0.5], ["s", 1 / 3]];
  const cases: Array<[string, Catalogue]> = [
    ["quadratics", quadratics({ lo: 0, hi: 30, exponent: 1 })],
    ["cubics, e = 1/2", cubics({ lo: 0, hi: 28, exponent: 0.5 })],
    ["cubics, e = 0", cubics({ lo: 0, hi: 9, exponent: 0 })],
    ["monic cubics", cubics({ lo: 0, hi: 40, exponent: 0 }, { monic: true })],
    ["quartic box", box(4, 3)],
  ];
  for (const [name, catalogue] of cases) {
    it(name, () => {
      const all = collect((v) => catalogue(whole, v)).sort();
      expect(all.length).toBeGreaterThan(100);
      for (const [axis, at] of cuts) {
        // The lower/left part keeps the stars on the cut.
        const first: Window = axis === "y" ? { ...whole, y1: at } : { ...whole, s1: at };
        const second: Window = axis === "y" ? { ...whole, y0: at } : { ...whole, s0: at };
        const parts: string[] = [];
        catalogue(first, (star) => parts.push(starKey(star)));
        catalogue(second, (star) => {
          if ((axis === "y" ? star.y : star.s) > at) parts.push(starKey(star));
        });
        expect(parts.sort(), `cut at ${axis} = ${at}`).toEqual(all);
      }
    });
  }
});
