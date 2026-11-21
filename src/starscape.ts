/**
 * A starscape: a family of integer polynomials together with a size law.
 *
 * The specification is plain data — it crosses to the render worker and
 * can be saved with a picture — and `starscape(spec)` turns it into the
 * two things a renderer needs: the catalogue of stars at least a given
 * size, and the size of each.
 */
import { ball, box } from "./catalogue/box.ts";
import { cubics } from "./catalogue/cubics.ts";
import { plane } from "./catalogue/plane.ts";
import type { Catalogue, Star } from "./catalogue/star.ts";
import { allCubics, allQuadratics } from "./catalogue/transport.ts";
import { naturalRadius, type Population, radius, type SizeLaw, shellOfRadii } from "./style/sizeLaw.ts";

export type Family =
  /** ax² + bx + c, a ≥ 1. */
  | { readonly kind: "quadratics" }
  /** ax³ + bx² + cx + d, a ≥ 1 (a = 1 if monic). */
  | { readonly kind: "cubics"; readonly monic: boolean }
  /** Degree d, coefficients in [−H, H]. */
  | { readonly kind: "box"; readonly degree: number; readonly height: number; readonly monic: boolean }
  /** Degree d, Σ a_k² ≤ radius². */
  | { readonly kind: "ball"; readonly degree: number; readonly radius: number; readonly monic: boolean }
  /** The integer plane aP + bQ + cR with a in the given range and |b|, |c| ≤ height. */
  | {
      readonly kind: "plane";
      readonly basis: readonly [readonly number[], readonly number[], readonly number[]];
      readonly a: readonly [number, number];
      readonly height: number;
    };

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

  /** A finite family: its catalogue does not depend on the size limit, which only filters. */
  const finite = (degree: number, all: Catalogue): Starscape => ({
    spec,
    degree,
    population: null,
    stars: (rMin, rMax = Infinity) => (W, visit) =>
      all(W, (star) => {
        const r = naturalRadius(law, star);
        if (r >= rMin && r < rMax) visit(star);
      }),
    radius: draw,
    radiusBound: (y) => law.cap * y,
  });

  switch (family.kind) {
    case "quadratics":
      return {
        spec,
        degree: 2,
        population: { power: 3, weight: 2 }, // Δ³/6 per unit hyperbolic area
        stars: (rMin, rMax) => allQuadratics(shellOfRadii(law, rMin, rMax)),
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
        stars: (rMin, rMax) => {
          const shell = shellOfRadii(law, rMin, rMax);
          // The monic cubics are invariant under translations only: no transport.
          return family.monic ? cubics(shell, { monic: true }) : allCubics(shell);
        },
        radius: draw,
        // δ² = 4y[(b + 3as)² + a²y²] ≥ 4y³, and δ⁴ = 4|disc| ≥ 12.
        radiusBound: boundFrom((y) => Math.max(2 * y ** 1.5, 12 ** 0.25)),
      };
    case "box":
      return finite(family.degree, box(family.degree, family.height, { monic: family.monic }));
    case "ball":
      return finite(family.degree, ball(family.degree, family.radius, { monic: family.monic }));
    case "plane":
      return finite(family.basis[0].length - 1, plane({ basis: family.basis, a: family.a, H: family.height }));
    default: {
      // Exhaustiveness: a new Family member fails to compile here.
      const unreachable: never = family;
      throw new Error(`unknown family ${JSON.stringify(unreachable)}`);
    }
  }
}
