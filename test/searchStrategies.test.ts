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
import { classic, discLaw, uniform } from "../src/core/sizing.ts";

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
const C = 0.035;
const VIEW: ViewContext = {
  window: WINDOW,
  worldPerPixel: WPP,
  sizing: classic(C), // (γ, δ) = (1, 1), the point the quadratic derivation holds for
};
// The cubic strategy wants the uniformity point (1, ½); its §3 reach
// formula is stated in the disc¼-form constant c_disc = c_f′/√2.
const SIZING3 = discLaw({ alpha: 0.25, beta: 0, c: C, degree: 3 });
const C3_DISC = SIZING3.power!.c / Math.SQRT2;
const VIEW3: ViewContext = { window: WINDOW, worldPerPixel: WPP, sizing: SIZING3 };

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
    const aMax = Math.max(5, Math.ceil((DUST_FACTOR * C) / (2 * WPP)));
    const population = viewConeQuadratics().populationFor(VIEW);
    expect(population.describe()).toContain(`A = ${aMax}`);
    expect(population.coverage).toBe("proved");

    const direct = keysOf(
      (cb) => coneQuadratics(fattenWindow(WINDOW, C / 2), 1, aMax, cb),
      3,
    );
    const viaStrategy = keysOf((cb) => population.enumerate(cb), 3);
    expect(viaStrategy.keys).toEqual(direct.keys);
    expect(viaStrategy.total).toBe(direct.total);
    expect(viaStrategy.total).toBeGreaterThan(0);
  });

  it("applies the depth floor when the derived depth is shallow", () => {
    const shallow: ViewContext = { window: WINDOW, worldPerPixel: 1, sizing: classic(0.001) };
    expect(viewConeQuadratics().populationFor(shallow).describe()).toContain("A = 5");
  });

  it("refuses a sizing rule off its derivation point, loudly (Option A)", () => {
    const wrongPoint: ViewContext = { ...VIEW, sizing: uniform(C) };
    expect(() => viewConeQuadratics().populationFor(wrongPoint)).toThrow(/\(γ, δ\) = \(1, 1\)/);
    const opaque: ViewContext = {
      ...VIEW,
      sizing: { cap: 0.5 }, // hand-written rule: no declared power
    };
    expect(() => viewConeQuadratics().populationFor(opaque)).toThrow(/declares none/);
  });

  it("deriveFrom binds the cutoffs to the reference rule instead", () => {
    const viaDerive = viewConeQuadratics({ deriveFrom: classic(C) })
      .populationFor({ ...VIEW, sizing: uniform(C) });
    const direct = viewConeQuadratics().populationFor(VIEW);
    expect(viaDerive.describe()).toBe(direct.describe());
    expect(keysOf((cb) => viaDerive.enumerate(cb), 3).keys)
      .toEqual(keysOf((cb) => direct.enumerate(cb), 3).keys);
  });
});

describe("viewConeMonicCubics strategy", () => {
  it("derives ρ by the reach law and enumerates ≡ the direct cone call", () => {
    // monic-cubic-sampling.md §3: ρ = R·√(dust · c_disc / (2·worldPerPixel)),
    // c_disc the disc¼-form constant (= c_f′/√2, sizing.ts).
    const rho = 4 * Math.sqrt((DUST_FACTOR * C3_DISC) / (2 * WPP));
    const population = viewConeMonicCubics().populationFor(VIEW3);
    expect(population.describe()).toContain(`ρ = ${rho.toFixed(1)}`);

    const direct = keysOf(
      (cb) => coneMonicCubics(fattenWindow(WINDOW, C3_DISC), rho, cb),
      4,
    );
    const viaStrategy = keysOf((cb) => population.enumerate(cb), 4);
    expect(viaStrategy.keys).toEqual(direct.keys);
    expect(viaStrategy.total).toBe(direct.total);
    expect(viaStrategy.total).toBeGreaterThan(0);
  });

  it("the dust dial enters ρ linearly", () => {
    const rho8 = 8 * Math.sqrt((DUST_FACTOR * C3_DISC) / (2 * WPP));
    const deep = viewConeMonicCubics({ dustR: 8 }).populationFor(VIEW3);
    expect(deep.describe()).toContain(`ρ = ${rho8.toFixed(1)}`);
  });

  it("refuses a sizing rule off the uniformity point (1, ½)", () => {
    expect(() => viewConeMonicCubics().populationFor(VIEW)).toThrow(/\(γ, δ\) = \(1, 0\.5\)/);
  });
});
