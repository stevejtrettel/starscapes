/**
 * Catalogues by symmetry: the stars of an SL₂(ℤ)-invariant family, found
 * by carrying reduced forms from the fundamental domain.
 *
 * PSL₂(ℤ) acts on binary forms and on their roots, compatibly, and δ is
 * invariant. So every star (f′, z′) is γ·(f, z) for a star with z in the
 * fundamental domain 𝔉 and a γ unique up to the stabiliser of z:
 *
 *     stars in W  =  ⋃_γ  γ·{ (f, z) : z ∈ 𝔉 ∩ γ⁻¹W },
 *
 * the union over the tiles γ𝔉 that meet W. A form with root in 𝔉 is a
 * REDUCED form (Gauss for quadratics, Mathews–Belabas for cubics), and
 * reduced forms have small coefficients: in 𝔉 the head loops of the direct
 * enumerators are short, and work is proportional to the stars found.
 * Close to the real axis the direct enumerators lose this (heads far
 * outnumber stars; mathematics.md §5.4) — and there the tiles are many but
 * each holds few stars, so transport is the efficient method.
 *
 * Three points need care.
 *
 * 1. THE SHELL. A shell lo·y′^e < δ ≤ hi·y′^e refers to the height y′ of
 *    the carried star. For e ≠ 0 the piece of 𝔉 behind a tile is cut into
 *    cells on which y′ varies little; each is enumerated with the
 *    invariant shell (e = 0) covering it, and membership is decided after
 *    carrying.
 * 2. THE BOUNDARY. A root on ∂𝔉 belongs to two tiles; one is chosen by an
 *    exact integer test (modular/domain.ts). At the two elliptic points
 *    the star is seen from 2 or 3 tiles, and the least γ keeps it.
 * 3. INFINITY. A reduced form may have a root at ∞ — as a polynomial its
 *    degree drops — and still be carried to a polynomial of full degree.
 *    For cubics these are y·(bx² + cxy + dy²), the reducible cubics whose
 *    rational root sits at the tile's cusp; they are the quadratic
 *    catalogue with δ = 2b·√y.
 *
 * A carried star is completed from its integer coefficients by the same
 * code as in the direct enumerators, so the two methods yield identical
 * stars, bit for bit — which is how they are tested against each other,
 * and what lets a window be split between them.
 */
import { contains, type Window } from "../fibre/window.ts";
import { type Position, positionOfCubic, positionOfQuadratic } from "../modular/domain.ts";
import { act, compare, imageBox, inverse, type Matrix, multiply, S, T } from "../modular/mobius.ts";
import { tilesMeeting } from "../modular/tiles.ts";
import { CUBIC_DELTA_MIN, cubics, locateCubic } from "./cubics.ts";
import { locateQuadratic, QUADRATIC_DELTA_MIN, quadratics } from "./quadratics.ts";
import { type Catalogue, clipToShell, delta, inShell, powerRange, type Shell, type Star } from "./star.ts";

/** What transport needs to know about a family. */
interface Reduced {
  readonly degree: number;
  readonly deltaMin: number;
  /**
   * Every form of the family with root in R and δ in the invariant shell
   * (exponent 0), as coefficients of a binary form of the family's degree
   * (so the leading one may be 0), with its root s + iy and its δ.
   */
  forms(shell: Shell, R: Window, visit: (f: ArrayLike<number>, s: number, y: number, delta: number) => void): void;
  position(f: ArrayLike<number>): Position;
  /** Completes a star from its coefficients; false if it is not in the shell. */
  locate(star: Star, shell: Shell): boolean;
}

const QUADRATIC: Reduced = {
  degree: 2,
  deltaMin: QUADRATIC_DELTA_MIN,
  forms: (shell, R, visit) => quadratics(shell)(R, (star) => visit(star.f, star.s, star.y, delta(star))),
  position: positionOfQuadratic,
  locate: locateQuadratic,
};

const degenerate = new Float64Array(4);
const CUBIC: Reduced = {
  degree: 3,
  deltaMin: CUBIC_DELTA_MIN,
  forms(shell, R, visit) {
    cubics(shell)(R, (star) => visit(star.f, star.s, star.y, delta(star)));
    // The forms with a root at infinity: y·Q with Q a quadratic, δ = δ(Q)/√y.
    quadratics({ lo: shell.lo, hi: shell.hi, exponent: 0.5 })(R, (star) => {
      degenerate.set(star.f);
      degenerate[3] = 0;
      visit(degenerate, star.s, star.y, star.slope / Math.sqrt(star.y));
    });
  },
  position: positionOfCubic,
  locate: locateCubic,
};

/** The stabilisers in PSL₂(ℤ) of the two elliptic points of 𝔉. */
const ST = multiply(S, T);
const STABILISER = { i: [S], rho: [ST, multiply(ST, ST)] } as const;

/** Whether γ is the least of γ·Stab(z): the tile that keeps a star at an elliptic point. */
function keepsElliptic(gamma: Matrix, position: "i" | "rho"): boolean {
  return STABILISER[position].every((g) => compare(gamma, multiply(gamma, g)) < 0);
}

/**
 * out(x) = (cx + d)ⁿ·f((ax + b)/(cx + d)) for a form f of degree n: the
 * form whose roots are m⁻¹ of the roots of f.
 */
function substitute(f: ArrayLike<number>, m: Matrix, out: Float64Array): void {
  const n = f.length - 1;
  const [a, b, c, d] = m;
  out.fill(0);
  for (let k = 0; k <= n; k++) {
    if (f[k] === 0) continue;
    // term = (ax + b)ᵏ (cx + d)ⁿ⁻ᵏ, built one linear factor at a time.
    term.fill(0, 0, n + 1);
    term[0] = 1;
    for (let j = 0; j < n; j++) {
      const lead = j < k ? a : c;
      const constant = j < k ? b : d;
      for (let i = j + 1; i >= 1; i--) term[i] = term[i] * constant + term[i - 1] * lead;
      term[0] *= constant;
    }
    for (let i = 0; i <= n; i++) out[i] += f[k] * term[i];
  }
}
const term = new Float64Array(8);

/** Above this the coefficients of a carried form are no longer exact in float64. */
const EXACT = 2 ** 53;
/** A cell is fine enough when the carried height varies by at most this factor over it. */
const HEIGHT_RATIO = 1.5;

function transported(family: Reduced, shell: Shell): Catalogue {
  const e = shell.exponent;
  return (window: Window, visit): void => {
    const W = clipToShell(window, shell, family.deltaMin);
    if (!W) return;
    if (W.y0 <= 0) {
      throw new Error("this shell holds infinitely many stars near the real axis; raise the window's y0");
    }
    const star: Star = { f: new Float64Array(family.degree + 1), s: 0, y: 0, slope: 0 };
    const point = [0, 0];

    for (const { gamma, pullback } of tilesMeeting(W)) {
      const back = inverse(gamma);

      /**
       * Enumerates the reduced forms in a cell of the pullback and carries
       * them. The cell is half-open on the sides where it has a neighbour.
       */
      const scan = (cell: Window, openRight: boolean, openTop: boolean, depth: number): void => {
        // The heights the cell's stars are carried to, within the window.
        // (Compared with a little slack: a star on the window's edge must
        // survive the rounding of the box.)
        const image = imageBox(gamma, cell);
        const y0 = Math.max(image.y0, W.y0) * (1 - 1e-9);
        const y1 = Math.min(image.y1, W.y1) * (1 + 1e-9);
        const slack = 1e-9 * (1 + Math.abs(W.s0) + Math.abs(W.s1));
        if (y0 > y1 || image.s1 < W.s0 - slack || image.s0 > W.s1 + slack) return;

        if (e !== 0 && y1 > HEIGHT_RATIO * y0 && depth < 40) {
          // Split across the direction of greater hyperbolic extent.
          if ((cell.s1 - cell.s0) / cell.y0 > Math.log(cell.y1 / cell.y0)) {
            const mid = (cell.s0 + cell.s1) / 2;
            scan({ ...cell, s1: mid }, true, openTop, depth + 1);
            scan({ ...cell, s0: mid }, openRight, openTop, depth + 1);
          } else {
            const mid = Math.sqrt(cell.y0 * cell.y1);
            scan({ ...cell, y1: mid }, openRight, true, depth + 1);
            scan({ ...cell, y0: mid }, openRight, openTop, depth + 1);
          }
          return;
        }

        // The invariant shell covering the cell's stars, widened against rounding.
        const [low, high] = powerRange(e, y0, y1);
        const cover = { lo: shell.lo * low * (1 - 1e-9), hi: shell.hi * high * (1 + 1e-9), exponent: 0 };
        family.forms(cover, cell, (f, s, y, del) => {
          if ((openRight && s >= cell.s1) || (openTop && y >= cell.y1)) return;
          const position = family.position(f);
          if (position === "outside") return;
          if (position !== "inside" && !keepsElliptic(gamma, position)) return;

          // Carry the form: the roots of f∘γ⁻¹ are γ(roots of f).
          substitute(f, back, star.f);
          const lead = star.f[family.degree];
          if (lead === 0) return; // a root went to infinity: not of this degree
          let largest = 0;
          for (let k = 0; k <= family.degree; k++) {
            if (lead < 0) star.f[k] = -star.f[k];
            largest = Math.max(largest, Math.abs(star.f[k]));
          }
          if (largest >= EXACT) {
            // Too deep for exact coefficients in float64: place the star by
            // the Möbius map instead. Its position and size are still
            // right (δ is invariant); only star.f is rounded.
            act(gamma, s, y, point);
            [star.s, star.y] = point;
            star.slope = del * star.y ** ((family.degree - 2) / 2);
            if (inShell(shell, del, star.y) && contains(W, star.s, star.y)) visit(star);
            return;
          }
          if (family.locate(star, shell) && contains(W, star.s, star.y)) visit(star);
        });
      };
      scan(pullback, false, false, 0);
    }
  };
}

/**
 * The height below which transport is used. A head of the direct
 * enumerator carries a star only if hi·y^(e + 1/(d−1)) ≳ 1, so below about
 * hi^(−1/(e + 1/(d−1))) it wastes its time; the constants place the
 * crossover where the two methods were measured to cost the same.
 */
function crossover(shell: Shell, degree: number): number {
  const power = shell.exponent + 1 / (degree - 1);
  if (power <= 0) return 0.25;
  return Math.min(1, CROSSOVER[degree] * shell.hi ** (-1 / power));
}
const CROSSOVER: Record<number, number> = { 2: 0.02, 3: 4 };

/** The direct enumerator above the crossover height, transport below it. */
function hybrid(family: Reduced, direct: (shell: Shell) => Catalogue, shell: Shell): Catalogue {
  const cut = crossover(shell, family.degree);
  const above = direct(shell);
  const below = transported(family, shell);
  return (W, visit) => {
    if (W.y1 > cut) {
      const upper = { ...W, y0: Math.max(W.y0, cut) };
      above(upper, (star) => {
        if (star.y > cut) visit(star);
      });
    }
    if (W.y0 <= cut) {
      const lower = { ...W, y1: Math.min(W.y1, cut) };
      below(lower, (star) => {
        if (star.y <= cut) visit(star);
      });
    }
  };
}

/** All integer quadratics in a shell, by symmetry (identical to `quadratics`). */
export const quadraticsBySymmetry = (shell: Shell): Catalogue => transported(QUADRATIC, shell);
/** All integer cubics in a shell, by symmetry (identical to `cubics`). */
export const cubicsBySymmetry = (shell: Shell): Catalogue => transported(CUBIC, shell);

/** All integer quadratics in a shell, each part of the window by the method that suits it. */
export const allQuadratics = (shell: Shell): Catalogue => hybrid(QUADRATIC, quadratics, shell);
/** All integer cubics in a shell, each part of the window by the method that suits it. */
export const allCubics = (shell: Shell): Catalogue => hybrid(CUBIC, (s) => cubics(s), shell);
