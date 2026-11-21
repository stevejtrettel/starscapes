/**
 * A starscape: a family of integer polynomials together with a size law.
 *
 * The specification is plain data — it crosses to the render worker and
 * can be saved with a picture — and `starscape(spec)` turns it into the
 * two things a renderer needs: the catalogue of stars at least a given
 * size, and the size of each.
 */
import { box } from "./catalogue/box.ts";
import { cubics } from "./catalogue/cubics.ts";
import { quadratics } from "./catalogue/quadratics.ts";
import type { Catalogue, Star } from "./catalogue/star.ts";
import { naturalRadius, type Population, radius, type SizeLaw, shellOfRadii } from "./style/sizeLaw.ts";

export type Family =
  /** ax² + bx + c, a ≥ 1. */
  | { readonly kind: "quadratics" }
  /** ax³ + bx² + cx + d, a ≥ 1 (a = 1 if monic). */
  | { readonly kind: "cubics"; readonly monic: boolean }
  /** Degree d, coefficients in [−H, H]. */
  | { readonly kind: "box"; readonly degree: number; readonly height: number; readonly monic: boolean };

export interface StarscapeSpec {
  readonly family: Family;
  readonly law: SizeLaw;
}

export interface Starscape {
  readonly spec: StarscapeSpec;
  readonly degree: number;
  /** How the family's population grows (style/sizeLaw.ts); null for a finite family. */
  readonly population: Population | null;
  /** Every star with rMin ≤ natural radius < rMax. */
  stars(rMin: number, rMax?: number): Catalogue;
  /** The radius at which a star is drawn. */
  radius(star: Star): number;
  /** An upper bound for the drawn radius of every star at height ≤ y. */
  radiusBound(y: number): number;
}

export function starscape(spec: StarscapeSpec): Starscape {
  const { family, law } = spec;
  const draw = (star: Star): number => radius(law, star);

  /** radiusBound from the least δ an integer polynomial of the family can have. */
  const boundFrom = (deltaMin: (y: number) => number) => (y: number): number =>
    Math.min(law.cap * y, law.c * y ** law.beta * deltaMin(y) ** -law.kappa);

  switch (family.kind) {
    case "quadratics":
      return {
        spec,
        degree: 2,
        population: { power: 3, weight: 2 }, // Δ³/6 per unit hyperbolic area
        stars: (rMin, rMax) => quadratics(shellOfRadii(law, rMin, rMax)),
        radius: draw,
        // δ = 2ay ≥ 2y, and δ = √|disc| ≥ √3.
        radiusBound: boundFrom((y) => Math.max(2 * y, Math.sqrt(3))),
      };
    case "cubics":
      return {
        spec,
        degree: 3,
        // All cubics: πΔ⁴/16 per unit hyperbolic area. Monic: Δ³/(3√y) per unit area.
        population: family.monic ? { power: 3, weight: 0.5 } : { power: 4, weight: 2 },
        stars: (rMin, rMax) => cubics(shellOfRadii(law, rMin, rMax), { monic: family.monic }),
        radius: draw,
        // δ² = 4y[(b + 3as)² + a²y²] ≥ 4y³, and δ⁴ = 4|disc| ≥ 12.
        radiusBound: boundFrom((y) => Math.max(2 * y ** 1.5, 12 ** 0.25)),
      };
    case "box": {
      const all = box(family.degree, family.height, { monic: family.monic });
      return {
        spec,
        degree: family.degree,
        population: null,
        stars: (rMin, rMax = Infinity) => (W, visit) =>
          all(W, (star) => {
            const r = naturalRadius(law, star);
            if (r >= rMin && r < rMax) visit(star);
          }),
        radius: draw,
        radiusBound: (y) => law.cap * y,
      };
    }
    default: {
      // Exhaustiveness: a new Family member fails to compile here.
      const unreachable: never = family;
      throw new Error(`unknown family ${JSON.stringify(unreachable)}`);
    }
  }
}
