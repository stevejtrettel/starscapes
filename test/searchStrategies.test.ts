/**
 * Search strategies (design.md Level 3): the house equivalence standard —
 * a strategy-bound population must enumerate exactly what a direct call to
 * its kernel enumerator produces with the documented derived cutoffs, and
 * the derivations themselves are asserted against their doc formulas.
 */
import { describe, expect, it } from "vitest";
import { integerPolynomials } from "../src/core/family/lattice.ts";
import { coneQuadratics, viewConeQuadratics } from "../src/core/search/cone.ts";
import { coneMonicCubics, viewConeMonicCubics } from "../src/core/search/coneMonicCubic.ts";
import { box, enumerateBox, forwardBox } from "../src/core/search/forward.ts";
import {
  type BatchSink,
  DUST_FACTOR,
  fattenWindow,
  type ViewContext,
} from "../src/core/search/types.ts";

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
const VIEW: ViewContext = {
  window: WINDOW,
  worldPerPixel: 2.6 / 900, // the home view on a 900px viewport
  sizeScale: 0.035,
};

describe("forwardBox strategy", () => {
  it("≡ enumerateBox: identical members, identical count", () => {
    const family = integerPolynomials({ degree: 2 });
    const strategy = forwardBox(family, 3);
    expect(strategy.mode).toBe("forward");
    const direct = keysOf((cb) => enumerateBox(family, box(3), cb), 3);
    const viaStrategy = keysOf((cb) => strategy.populationFor(VIEW).enumerate(cb), 3);
    expect(viaStrategy.keys).toEqual(direct.keys);
    expect(viaStrategy.total).toBe(direct.total);
  });
});

describe("viewConeQuadratics strategy", () => {
  it("derives A by the visibility law and enumerates ≡ the direct cone call", () => {
    // live-sampling.md §2: A = ⌈dust · c / (2·worldPerPixel)⌉, floored at 5.
    const aMax = Math.max(
      5,
      Math.ceil((DUST_FACTOR * VIEW.sizeScale) / (2 * VIEW.worldPerPixel)),
    );
    const population = viewConeQuadratics().populationFor(VIEW);
    expect(population.describe()).toContain(`A = ${aMax}`);
    expect(population.coverage).toBe("proved");

    const direct = keysOf(
      (cb) => coneQuadratics(fattenWindow(WINDOW, VIEW.sizeScale / 2), 1, aMax, cb),
      3,
    );
    const viaStrategy = keysOf((cb) => population.enumerate(cb), 3);
    expect(viaStrategy.keys).toEqual(direct.keys);
    expect(viaStrategy.total).toBe(direct.total);
    expect(viaStrategy.total).toBeGreaterThan(0);
  });

  it("applies the depth floor when the derived depth is shallow", () => {
    const shallow: ViewContext = { window: WINDOW, worldPerPixel: 1, sizeScale: 0.001 };
    expect(viewConeQuadratics().populationFor(shallow).describe()).toContain("A = 5");
  });
});

describe("viewConeMonicCubics strategy", () => {
  it("derives ρ by the reach law and enumerates ≡ the direct cone call", () => {
    // monic-cubic-sampling.md §3: ρ = R·√(dust · c / (2·worldPerPixel)).
    const rho = 4 * Math.sqrt((DUST_FACTOR * VIEW.sizeScale) / (2 * VIEW.worldPerPixel));
    const population = viewConeMonicCubics().populationFor(VIEW);
    expect(population.describe()).toContain(`ρ = ${rho.toFixed(1)}`);

    const direct = keysOf(
      (cb) => coneMonicCubics(fattenWindow(WINDOW, VIEW.sizeScale), rho, cb),
      4,
    );
    const viaStrategy = keysOf((cb) => population.enumerate(cb), 4);
    expect(viaStrategy.keys).toEqual(direct.keys);
    expect(viaStrategy.total).toBe(direct.total);
    expect(viaStrategy.total).toBeGreaterThan(0);
  });

  it("the dust dial enters ρ linearly", () => {
    const rho8 = 8 * Math.sqrt((DUST_FACTOR * VIEW.sizeScale) / (2 * VIEW.worldPerPixel));
    const deep = viewConeMonicCubics({ dustR: 8 }).populationFor(VIEW);
    expect(deep.describe()).toContain(`ρ = ${rho8.toFixed(1)}`);
  });
});
