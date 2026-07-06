/**
 * Collections (design.md, "The collection model"): the house equivalence
 * standard — a collection must enumerate exactly what a direct call to its
 * kernel enumerator produces, and the depth-law functions must match their
 * documented formulas (including bit-exactness against the superseded
 * f′-form constant round trip they replaced).
 */
import { describe, expect, it } from "vitest";
import type { BatchSink } from "../src/core/collection.ts";
import { integerPolynomials } from "../src/core/family/lattice.ts";
import { coneQuadratics, viewConeQuadratics, visibleDepthQuadratics } from "../src/core/search/cone.ts";
import {
  coneMonicCubics,
  viewConeMonicCubics,
  visibleReachMonicCubics,
} from "../src/core/search/coneMonicCubic.ts";
import { box, enumerateBox, forwardBox } from "../src/core/search/forward.ts";
import { harvestQuadratics, inverse, inverseQuadratics } from "../src/core/search/inverse.ts";
import { fattenWindow } from "../src/core/window.ts";

/** Collect an enumeration as sorted coefficient-tuple keys. */
function keysOf(run: (onBatch: BatchSink) => number, stride: number): { keys: string[]; total: number } {
  const keys: string[] = [];
  const total = run((coeffs, count) => {
    for (let i = 0; i < count; i++) {
      const parts: number[] = [];
      for (let k = 0; k < stride; k++) parts.push(coeffs[i * stride + k]);
      keys.push(parts.join(","));
    }
  });
  keys.sort();
  return { keys, total };
}

const WINDOW = { left: -0.15, top: 1.15, worldW: 0.3, worldH: 0.3 }; // around i
const WPP = 2.6 / 900; // the home view on a 900px viewport
const C = 0.035; // classic-law constant (quadratics)
const C3 = 0.035; // disc¼-form constant (cubics)

describe("depth-law functions", () => {
  it("visibleDepthQuadratics ≡ the §2 formula, floored at 5", () => {
    expect(visibleDepthQuadratics(C, WPP)).toBe(Math.ceil((3 * C) / (2 * WPP)));
    expect(visibleDepthQuadratics(0.001, 1)).toBe(5); // shallow view keeps landmarks
  });

  it("visibleReachMonicCubics ≡ the §3 formula, dust dial linear", () => {
    expect(visibleReachMonicCubics(C3, WPP, 4)).toBe(4 * Math.sqrt((3 * C3) / (2 * WPP)));
    expect(visibleReachMonicCubics(C3, WPP, 8)).toBe(2 * visibleReachMonicCubics(C3, WPP, 4));
    expect(visibleReachMonicCubics(C3, WPP)).toBe(visibleReachMonicCubics(C3, WPP, 4)); // default R
  });

  it("disc¼-form constant is bit-exact vs the superseded f′-form round trip", () => {
    // The pre-refactor path declared the f′-form constant c·4^¼ on the law,
    // then converted /√2 at the derivation point. Same floats, verified.
    const cFprime = C3 * 4 ** 0.25;
    const oldRho = 4 * Math.sqrt((3 * (cFprime / Math.SQRT2)) / (2 * WPP));
    expect(visibleReachMonicCubics(C3, WPP, 4)).toBe(oldRho);
  });
});

describe("viewConeQuadratics collection", () => {
  const aMax = visibleDepthQuadratics(C, WPP);
  const collection = viewConeQuadratics({ window: WINDOW, aMax, pad: C / 2 });

  it("≡ the direct cone call on the fattened window", () => {
    const direct = keysOf((cb) => coneQuadratics(fattenWindow(WINDOW, C / 2), 1, aMax, cb), 3);
    const via = keysOf((cb) => collection.collect(cb), 3);
    expect(via.keys).toEqual(direct.keys);
    expect(via.total).toBe(direct.total);
    expect(via.total).toBeGreaterThan(0);
  });

  it("carries provenance and coverage", () => {
    expect(collection.describe()).toBe(`Φ_cone(W, A = ${aMax})`);
    expect(collection.coverage).toBe("proved");
    expect(collection.family.degree).toBe(2);
  });

});

describe("viewConeMonicCubics collection", () => {
  const rho = visibleReachMonicCubics(C3, WPP, 4);
  const collection = viewConeMonicCubics({ window: WINDOW, rho, pad: C3 });

  it("≡ the direct cone call on the fattened window", () => {
    const direct = keysOf((cb) => coneMonicCubics(fattenWindow(WINDOW, C3), rho, cb), 4);
    const via = keysOf((cb) => collection.collect(cb), 4);
    expect(via.keys).toEqual(direct.keys);
    expect(via.total).toBe(direct.total);
    expect(via.total).toBeGreaterThan(0);
  });

});

describe("forwardBox collection", () => {
  it("≡ enumerateBox: identical members, identical count", () => {
    const family = integerPolynomials({ degree: 2 });
    const collection = forwardBox(family, 3);
    const direct = keysOf((cb) => enumerateBox(family, box(3), cb), 3);
    const via = keysOf((cb) => collection.collect(cb), 3);
    expect(via.keys).toEqual(direct.keys);
    expect(via.total).toBe(direct.total);
    expect(collection.coverage).toBe("proved");
    expect(collection.describe()).toBe("Φ_box(|params| ≤ 3)");
  });
});

describe("inverseQuadratics collection", () => {
  it("≡ the direct harvest, labeled heuristic", () => {
    const search = inverse({ aMax: 12, epsilon: 0.3 });
    const collection = inverseQuadratics(search, WINDOW, 8, 8);
    const direct = keysOf((cb) => harvestQuadratics(search, WINDOW, 8, 8, cb), 3);
    const via = keysOf((cb) => collection.collect(cb), 3);
    expect(via.keys).toEqual(direct.keys);
    expect(via.total).toBe(direct.total);
    expect(via.total).toBeGreaterThan(0);
    expect(collection.coverage).toBe("heuristic");
    expect(collection.describe()).toContain("Φ_inv(fixed, ε = 0.3, A ≤ 12)");
  });
});
