import { describe, expect, it } from "vitest";
import type { Window } from "../src/fibre/window.ts";
import { createRaster, depositDisc, develop } from "../src/render/raster.ts";
import { type Family, starscape } from "../src/starscape.ts";
import { euclidean, hyperbolic, naturalRadius, type SizeLaw, zoomExponent } from "../src/style/sizeLaw.ts";
import { collect } from "./support.ts";

const W: Window = { s0: 0.1, s1: 0.5, y0: 0.7, y1: 1.1 };

describe("magnitude-limited catalogues", () => {
  const cases: Array<[string, Family, SizeLaw]> = [
    ["quadratics, hyperbolic", { kind: "quadratics" }, hyperbolic(0.05)],
    ["quadratics, y^(2/3) law", { kind: "quadratics" }, { c: 0.05, beta: 2 / 3, kappa: 1, cap: 0.5 }],
    ["cubics, root discriminant", { kind: "cubics", monic: false }, hyperbolic(0.06, 4 / 3)],
    ["monic cubics, Euclidean", { kind: "cubics", monic: true }, euclidean(0.04)],
  ];
  for (const [name, family, law] of cases) {
    it(`${name}: stars(rMin, rMax) is exactly {rMin ≤ r < rMax}`, () => {
      const scape = starscape({ family, law });
      const [rMin, rMax] = [0.002, 0.008];
      // Reference: a deeper catalogue, filtered by the definition.
      const reference: string[] = [];
      scape.stars(rMin / 3)(W, (star) => {
        const r = naturalRadius(law, star);
        if (r >= rMin && r < rMax) reference.push(`${Array.from(star.f)}`);
      });
      const got: string[] = [];
      scape.stars(rMin, rMax)(W, (star) => got.push(`${Array.from(star.f)}`));
      expect(got.sort()).toEqual(reference.sort());
      expect(got.length).toBeGreaterThan(10);
    });

    it(`${name}: no star exceeds radiusBound`, () => {
      const scape = starscape({ family, law });
      scape.stars(0.001)(W, (star) => {
        expect(scape.radius(star)).toBeLessThanOrEqual(scape.radiusBound(star.y) * (1 + 1e-12));
      });
    });
  }
});

describe("ink", () => {
  /** Σ πr² over the stars of radius ≥ rMin in a window, per unit area. */
  function ink(family: Family, law: SizeLaw, window: Window, rMin: number): number {
    const scape = starscape({ family, law });
    let area = 0;
    scape.stars(rMin)(window, (star) => {
      area += Math.PI * scape.radius(star) ** 2;
    });
    return area / ((window.s1 - window.s0) * (window.y1 - window.y0));
  }

  it("quadratics, hyperbolic κ = 1: ink = π·c³·y / (2·rMin)", () => {
    const c = 0.02;
    const rMin = 2e-5;
    const window: Window = { s0: 0.13, s1: 0.33, y0: 0.9, y1: 1.1 };
    expect(ink({ kind: "quadratics" }, hyperbolic(c), window, rMin) / ((Math.PI * c ** 3 * 1.0) / (2 * rMin))).toBeCloseTo(1, 1);
  });

  it("c ∝ (pixel size)^γ, γ = 1 − 2κ/D, holds the ink constant under zoom", () => {
    const cases: Array<[Family, SizeLaw, number]> = [
      [{ kind: "quadratics" }, hyperbolic(0.03), 3],
      [{ kind: "cubics", monic: true }, euclidean(0.025), 3],
      [{ kind: "cubics", monic: false }, hyperbolic(0.035, 4 / 3), 4],
    ];
    for (const [family, law, growth] of cases) {
      const gamma = zoomExponent(law, growth);
      expect(gamma).toBeCloseTo(1 / 3, 12);
      const inks = [1, 1 / 6, 1 / 36].map((zoom) => {
        const h = 0.4 * zoom;
        const window: Window = { s0: 0.37, s1: 0.37 + h, y0: 0.9, y1: 0.9 + h };
        const zoomed = { ...law, c: law.c * zoom ** gamma };
        return ink(family, zoomed, window, (0.25 * h) / 800);
      });
      // Fixed c would multiply the ink by 6 at each step.
      expect(inks[1] / inks[0]).toBeGreaterThan(0.6);
      expect(inks[1] / inks[0]).toBeLessThan(1.6);
      expect(inks[2] / inks[0]).toBeGreaterThan(0.6);
      expect(inks[2] / inks[0]).toBeLessThan(1.6);
    }
  });
});

describe("raster", () => {
  it("opaque: the smallest disc wins, in either order", () => {
    const paint = (order: number[]): Uint8ClampedArray => {
      const raster = createRaster(16, 16, "opaque", 2);
      const discs: Array<[number, number, number]> = [[6, 0, 0], [3, 1, 0]];
      for (const k of order) depositDisc(raster, 8, 8, discs[k][0], discs[k][1], 0, discs[k][2]);
      return develop(raster);
    };
    const a = paint([0, 1]);
    expect(Array.from(a)).toEqual(Array.from(paint([1, 0])));
    const centre = (8 * 16 + 8) * 3;
    expect(a[centre]).toBe(255); // red channel of the small red disc
  });

  it("sub-sample discs deposit their area", () => {
    // N discs of area A scattered over one pixel darken it by 1 − exp(−N·A).
    const raster = createRaster(4, 4, "opaque", 2);
    const r = 0.05;
    const N = 60;
    for (let k = 0; k < N; k++) depositDisc(raster, 1.5, 1.5, r, 0, 0, 0);
    const out = develop(raster);
    const pixel = (1 * 4 + 1) * 3;
    const expected = 255 * Math.exp(-N * Math.PI * r * r);
    expect(Math.abs(out[pixel] - expected)).toBeLessThan(2);
    expect(out[0]).toBe(255); // elsewhere untouched
  });

  it("a disc's sampled area is πr² on average", () => {
    const raster = createRaster(64, 64, "additive", 2);
    let seed = 5;
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000;
    const r = 0.9;
    const N = 2000;
    for (let k = 0; k < N; k++) depositDisc(raster, 8 + rand() * 48, 8 + rand() * 48, r, 0, 0, 0);
    let samples = 0;
    for (let i = 3; i < raster.samples.length; i += 4) samples += raster.samples[i];
    expect(samples / 4 / (N * Math.PI * r * r)).toBeCloseTo(1, 1);
  });
});
