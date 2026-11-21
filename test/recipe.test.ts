import { describe, expect, it } from "vitest";
import type { Star } from "../src/catalogue/star.ts";
import { PRESETS } from "../src/presets.ts";
import { lawAt, parseRecipe, type Recipe, requote, zoomExponentOf } from "../src/recipe.ts";
import { COLOURINGS, oklch, paint } from "../src/style/colour.ts";

describe("recipes", () => {
  it("every preset survives a round trip through JSON", () => {
    for (const preset of Object.values(PRESETS) as Recipe[]) {
      expect(parseRecipe(JSON.parse(JSON.stringify(preset)))).toEqual(preset);
    }
  });

  it("malformed recipes are refused with a reason", () => {
    const good = JSON.parse(JSON.stringify(PRESETS.cubics));
    expect(() => parseRecipe(null)).toThrow(/not a recipe/);
    expect(() => parseRecipe({ ...good, colouring: "plaid" })).toThrow(/colouring/);
    expect(() => parseRecipe({ ...good, spec: { ...good.spec, family: { kind: "sextics" } } })).toThrow(/family/);
    expect(() => parseRecipe({ ...good, view: { centre: [0, "1"], height: 2 } })).toThrow(/centre/);
    expect(() => parseRecipe({ ...good, spec: { ...good.spec, law: { ...good.spec.law, cap: 2 } } })).toThrow(/cap/);
  });

  it("the zoom law: c ∝ pixel^γ, and requoting does not change the picture", () => {
    const recipe: Recipe = PRESETS.quadratics;
    expect(zoomExponentOf(recipe.spec)).toBeCloseTo(1 / 3, 12);
    expect(lawAt(recipe, recipe.pixel).c).toBe(recipe.spec.law.c);
    expect(lawAt(recipe, recipe.pixel / 8).c).toBeCloseTo(recipe.spec.law.c / 2, 12);
    const elsewhere = requote(recipe, recipe.pixel / 37);
    for (const pixel of [recipe.pixel, 1e-3, 1e-7]) {
      expect(lawAt(elsewhere, pixel).c).toBeCloseTo(lawAt(recipe, pixel).c, 14);
    }
  });

  it("finite families do not rescale", () => {
    expect(zoomExponentOf(PRESETS.quartics.spec)).toBe(0);
    expect(zoomExponentOf(PRESETS["cubic-plane"].spec)).toBe(0);
  });
});

describe("colourings", () => {
  const star: Star = { f: new Float64Array([-1, -1, 0, 1]), s: -0.66, y: 0.56, slope: 3.2 };

  it("every colouring writes an in-gamut colour dark enough for a white ground", () => {
    for (const name of COLOURINGS) {
      const rgb = new Float32Array(3);
      paint(name)(star, rgb);
      for (const channel of rgb) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(1);
      }
      const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
      expect(luminance, name).toBeLessThan(0.7);
    }
  });

  it("real-root colours cubics on a wheel and falls back to ink otherwise", () => {
    const [a, b, q] = [new Float32Array(3), new Float32Array(3), new Float32Array(3)];
    const wheel = paint("real-root");
    wheel(star, a);
    wheel({ ...star, s: 0.9 }, b); // r = −b/a − 2s: another real root
    wheel({ f: new Float64Array([1, 0, 1]), s: 0, y: 1, slope: 2 }, q);
    expect(Array.from(a)).not.toEqual(Array.from(b));
    expect(q[0]).toBe(q[1]);
  });

  it("oklch: zero chroma is grey, and lightness is monotone", () => {
    const [r, g, b] = oklch(0.5, 0, 0.3);
    expect(r).toBeCloseTo(g, 6);
    expect(g).toBeCloseTo(b, 6);
    expect(oklch(0.7, 0, 0)[0]).toBeGreaterThan(oklch(0.4, 0, 0)[0]);
  });
});
