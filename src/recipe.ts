/**
 * A recipe: everything that determines a picture, as plain data.
 *
 *     family + size law + colouring + view.
 *
 * The explorer edits a recipe; "save" writes it out; the print script
 * reads it back. A recipe does not fix the resolution: the size constant
 * c is quoted at a stated pixel size and follows the family's zoom law to
 * any other (style/sizeLaw.ts), so the same recipe is the same picture on
 * a screen and on a large print.
 */
import type { View } from "./fibre/window.ts";
import { GALOIS_GROUPS, type GaloisGroup } from "./poly/galois.ts";
import { type Family, type StarscapeSpec, starscape } from "./starscape.ts";
import { COLOURINGS, type Colouring } from "./style/colour.ts";
import { type SizeLaw, zoomExponent } from "./style/sizeLaw.ts";

export interface Recipe {
  readonly title: string;
  readonly spec: StarscapeSpec;
  /** The pixel size, in ℂ, at which spec.law.c is quoted. */
  readonly pixel: number;
  readonly view: View;
  readonly colouring: Colouring;
  /** Radius, in pixels, of the faintest stars drawn. */
  readonly faintest: number;
}

/** The exponent γ of the recipe's zoom law c ∝ pixel^γ (0 for a finite family or convergent ink). */
export function zoomExponentOf(spec: StarscapeSpec): number {
  const { population } = starscape(spec);
  return population === null ? 0 : zoomExponent(spec.law, population);
}

/**
 * The recipe's size law at a given pixel size: c ∝ pixel^γ, so that a
 * zoomed view or a larger print carries the same ink instead of saturating.
 */
export function lawAt(recipe: Recipe, pixel: number): SizeLaw {
  const { law } = recipe.spec;
  return { ...law, c: law.c * (pixel / recipe.pixel) ** zoomExponentOf(recipe.spec) };
}

/** The same picture with c quoted at another pixel size. */
export function requote(recipe: Recipe, pixel: number): Recipe {
  return { ...recipe, pixel, spec: { ...recipe.spec, law: lawAt(recipe, pixel) } };
}

/**
 * Checks that a value read from a file or a URL is a recipe. Throws with a
 * description of the first thing wrong.
 */
export function parseRecipe(value: unknown): Recipe {
  const fail = (what: string): never => {
    throw new Error(`not a recipe: ${what}`);
  };
  const object = (v: unknown, what: string): Record<string, unknown> =>
    typeof v === "object" && v !== null ? (v as Record<string, unknown>) : fail(`${what} is not an object`);
  const number = (v: unknown, what: string): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fail(`${what} is not a number`);
  const integer = (v: unknown, what: string): number =>
    Number.isInteger(v) ? (v as number) : fail(`${what} is not an integer`);
  const integers = (v: unknown, what: string): number[] =>
    Array.isArray(v) && v.length > 0 ? v.map((x) => integer(x, what)) : fail(`${what} is not a list of integers`);

  const r = object(value, "the recipe");
  const spec = object(r.spec, "spec");
  const f = object(spec.family, "family");
  let family: Family;
  switch (f.kind) {
    case "quadratics":
      family = { kind: "quadratics" };
      break;
    case "cubics":
      family = { kind: "cubics", monic: f.monic === true };
      break;
    case "quartics":
      family = { kind: "quartics", tau: number(f.tau, "tau") };
      break;
    case "box":
      family = { kind: "box", degree: integer(f.degree, "degree"), height: integer(f.height, "height"), monic: f.monic === true };
      break;
    case "ball":
      family = { kind: "ball", degree: integer(f.degree, "degree"), radius: number(f.radius, "radius"), monic: f.monic === true };
      break;
    case "plane": {
      const basis = Array.isArray(f.basis) && f.basis.length === 3 ? f.basis : fail("basis is not three polynomials");
      const a = integers(f.a, "a");
      if (a.length !== 2) fail("a is not a range");
      family = {
        kind: "plane",
        basis: [integers(basis[0], "P"), integers(basis[1], "Q"), integers(basis[2], "R")],
        a: [a[0], a[1]],
        height: integer(f.height, "height"),
      };
      break;
    }
    default:
      return fail(`unknown family ${JSON.stringify(f.kind)}`);
  }
  const l = object(spec.law, "law");
  const law: SizeLaw = { c: number(l.c, "c"), beta: number(l.beta, "beta"), kappa: number(l.kappa, "kappa"), cap: number(l.cap, "cap") };
  if (!(law.c > 0 && law.kappa > 0 && law.cap > 0 && law.cap < 1)) fail("the size law needs c, κ > 0 and 0 < cap < 1");

  const v = object(r.view, "view");
  const centre = Array.isArray(v.centre) && v.centre.length === 2 ? v.centre : fail("centre is not a pair");
  const view: View = { centre: [number(centre[0], "centre"), number(centre[1], "centre")], height: number(v.height, "view height") };
  const colouring = COLOURINGS.find((name) => name === r.colouring) ?? fail(`unknown colouring ${JSON.stringify(r.colouring)}`);
  const pixel = number(r.pixel, "pixel");
  const faintest = number(r.faintest, "faintest");
  if (!(view.height > 0 && pixel > 0 && faintest > 0)) fail("view height, pixel and faintest must be positive");

  let galois: GaloisGroup[] | undefined;
  if (spec.galois !== undefined) {
    const all = Object.values(GALOIS_GROUPS).flat();
    galois = Array.isArray(spec.galois) && spec.galois.length > 0
      ? spec.galois.map((g) => all.find((name) => name === g) ?? fail(`unknown Galois group ${JSON.stringify(g)}`))
      : fail("galois is not a list of groups");
  }
  const checked: StarscapeSpec = { family, law, irreducible: spec.irreducible === true, ...(galois ? { galois } : {}) };
  try {
    starscape(checked);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  return {
    title: typeof r.title === "string" ? r.title : "starscape",
    spec: checked,
    pixel,
    view,
    colouring,
    faintest,
  };
}
