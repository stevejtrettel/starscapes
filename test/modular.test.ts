import { describe, expect, it } from "vitest";
import { cubics } from "../src/catalogue/cubics.ts";
import { quadratics } from "../src/catalogue/quadratics.ts";
import type { Catalogue, Shell } from "../src/catalogue/star.ts";
import { allCubics, allQuadratics, cubicsBySymmetry, quadraticsBySymmetry } from "../src/catalogue/transport.ts";
import type { Window } from "../src/fibre/window.ts";
import { positionOfCubic, positionOfQuadratic } from "../src/modular/domain.ts";
import { act, imageBox, inverse, type Matrix, multiply, reduce, S, T } from "../src/modular/mobius.ts";
import { tilesMeeting } from "../src/modular/tiles.ts";
import { collect, lcg } from "./support.ts";

const randomMatrix = (rand: () => number): Matrix => {
  let m: Matrix = [1, 0, 0, 1];
  for (let k = 0; k < 8; k++) m = multiply(m, rand() < 0.5 ? S : rand() < 0.5 ? T : [1, -2, 0, 1]);
  return m;
};

describe("Möbius maps", () => {
  it("imageBox is the exact bounding box of γ(W)", () => {
    const rand = lcg(41);
    const p = [0, 0];
    for (let trial = 0; trial < 300; trial++) {
      const m = randomMatrix(rand);
      const s0 = rand() * 4 - 2;
      const y0 = 0.05 + rand();
      const W: Window = { s0, s1: s0 + 0.05 + rand() * 2, y0, y1: y0 + 0.05 + rand() * 2 };
      const box = imageBox(m, W);
      // Sample the boundary densely: all images inside the box, and its sides attained.
      const seen = { s0: Infinity, s1: -Infinity, y0: Infinity, y1: -Infinity };
      const N = 4000;
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        for (const [s, y] of [
          [W.s0 + t * (W.s1 - W.s0), W.y0], [W.s0 + t * (W.s1 - W.s0), W.y1],
          [W.s0, W.y0 + t * (W.y1 - W.y0)], [W.s1, W.y0 + t * (W.y1 - W.y0)],
        ]) {
          act(m, s, y, p);
          seen.s0 = Math.min(seen.s0, p[0]);
          seen.s1 = Math.max(seen.s1, p[0]);
          seen.y0 = Math.min(seen.y0, p[1]);
          seen.y1 = Math.max(seen.y1, p[1]);
        }
      }
      const size = Math.max(box.s1 - box.s0, box.y1 - box.y0);
      for (const side of ["s0", "s1", "y0", "y1"] as const) {
        expect(Math.abs(seen[side] - box[side]), `${side} of ${m}`).toBeLessThan(1e-3 * size + 1e-12);
      }
      expect(seen.s0).toBeGreaterThanOrEqual(box.s0 - 1e-12);
      expect(seen.y1).toBeLessThanOrEqual(box.y1 + 1e-12);
    }
  });

  it("reduce finds the tile of a point", () => {
    const rand = lcg(42);
    const p = [0, 0];
    for (let trial = 0; trial < 2000; trial++) {
      const [s, y] = [rand() * 6 - 3, 10 ** (-4 * rand())];
      act(inverse(reduce(s, y)), s, y, p);
      expect(Math.abs(p[0])).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(p[0] ** 2 + p[1] ** 2).toBeGreaterThanOrEqual(1 - 1e-9);
    }
  });

  it("tilesMeeting contains the tile of every point of the window", () => {
    const rand = lcg(43);
    for (const W of [
      { s0: -0.7, s1: 0.9, y0: 0.05, y1: 0.6 },
      { s0: 0.31, s1: 0.33, y0: 0.004, y1: 0.02 },
      { s0: -1.2, s1: 1.2, y0: 0.4, y1: 2.5 },
    ] as Window[]) {
      const tiles = new Set(tilesMeeting(W).map((tile) => tile.gamma.join()));
      for (let k = 0; k < 3000; k++) {
        const s = W.s0 + rand() * (W.s1 - W.s0);
        const y = W.y0 + rand() * (W.y1 - W.y0);
        expect(tiles.has(reduce(s, y).join()), `${s} + ${y}i`).toBe(true);
      }
    }
  });
});

describe("exact position in the fundamental domain", () => {
  it("agrees with the root, and exactly one of f, f∘T, f∘S owns a boundary root", () => {
    expect(positionOfQuadratic([1, 0, 1])).toBe("i"); // x² + 1
    expect(positionOfQuadratic([1, 1, 1])).toBe("rho"); // x² + x + 1
    expect(positionOfQuadratic([1, -1, 1])).toBe("outside"); // root ρ + 1
    expect(positionOfQuadratic([5, 1, 5])).toBe("inside"); // on the arc, s < 0
    expect(positionOfQuadratic([5, -1, 5])).toBe("outside"); // on the arc, s > 0
    expect(positionOfQuadratic([3, 2, 2])).toBe("inside"); // s = −1/2, |z| > 1
    expect(positionOfQuadratic([3, -2, 2])).toBe("outside"); // s = +1/2
    expect(positionOfCubic([0, 1, 0, 1])).toBe("i"); // x(x² + 1)
    expect(positionOfCubic([1, 0, 1, 0])).toBe("i"); // y(x² + y²): the root at infinity
    expect(positionOfCubic([-1, 0, 0, 1])).toBe("rho"); // x³ − 1
    expect(positionOfCubic([-1, -1, 0, 1])).toBe("outside"); // x³ − x − 1: |z| < 1
  });
});

describe("transport ≡ direct enumeration", () => {
  /** The two catalogues list the same stars, each once, with identical coordinates. */
  function expectSame(a: Catalogue, b: Catalogue, W: Window, atLeast: number): void {
    const [x, y] = [collect((v) => a(W, v)), collect((v) => b(W, v))];
    expect(new Set(x).size, "no star twice").toBe(x.length);
    expect(x.sort()).toEqual(y.sort());
    expect(y.length).toBeGreaterThan(atLeast);
  }
  // Windows chosen to hold many tiles, images of i and ρ, and stars on tile edges.
  const windows: Window[] = [
    { s0: -0.6, s1: 0.6, y0: 0.08, y1: 1.3 },
    { s0: 0.2, s1: 0.8, y0: 0.03, y1: 0.3 },
    { s0: -0.05, s1: 0.55, y0: 0.4, y1: 2.1 },
  ];
  const shells: Shell[] = [
    { lo: 0, hi: 9, exponent: 0 },
    { lo: 3, hi: 14, exponent: 0.5 },
    { lo: 0, hi: 16, exponent: 1 },
  ];
  for (const [i, W] of windows.entries()) {
    for (const shell of shells) {
      it(`quadratics, window ${i}, e = ${shell.exponent}`, () => {
        expectSame(quadraticsBySymmetry(shell), quadratics(shell), W, 10);
        expectSame(allQuadratics(shell), quadratics(shell), W, 10);
      });
    }
  }
  const cubicShells: Shell[] = [
    { lo: 0, hi: 6, exponent: 0 },
    { lo: 0, hi: 9, exponent: 0.5 },
    { lo: 2, hi: 8, exponent: 0.3 },
  ];
  for (const [i, W] of windows.entries()) {
    for (const shell of cubicShells) {
      it(`cubics (reducible ones included), window ${i}, e = ${shell.exponent}`, () => {
        expectSame(cubicsBySymmetry(shell), cubics(shell), W, 10);
        expectSame(allCubics(shell), cubics(shell), W, 10);
      });
    }
  }
});
