/**
 * Stars and catalogues.
 *
 * A STAR is a point of the incidence variety over ℤ: a pair (f, z) with
 * f ∈ ℤ[x] of exact degree d, leading coefficient positive, and z = s + iy
 * a root of f in the open upper half plane. (One star per conjugate pair;
 * f and −f are the same star.)
 *
 * The one analytic quantity attached to a star is |f′(z)|, the exchange
 * rate between coefficient space and root space (fibre/tail.ts). Its
 * weight-normalised form
 *
 *     δ(f, z) = |f′(z)| · y^(−(d−2)/2)
 *
 * is invariant under SL₂(ℝ) acting on binary forms and their roots — for
 * γ = (α β; γ δ) one has f′ ↦ f′·(γz + δ)^(2−d) and y ↦ y/|γz + δ|². It is
 * the local form of the discriminant:
 *
 *     d = 2:   δ² = |disc f|,           d = 3:   δ⁴ = 4·|disc f|.
 *
 * (For d ≥ 4 the discriminant involves the other roots as well, and δ
 * alone no longer bounds it.)
 *
 * A CATALOGUE is a locally finite set of stars, presented by its
 * restriction to windows.
 */
import type { Window } from "../fibre/window.ts";

/**
 * A star, as handed to a visitor. The same object is reused for every
 * visit: read it, and copy what you keep.
 */
export interface Star {
  /** f, coefficients ascending (integers stored as float64). */
  readonly f: Float64Array;
  /** Re z. */
  s: number;
  /** Im z > 0. */
  y: number;
  /** |f′(z)|. */
  slope: number;
}

export type Visit = (star: Star) => void;

/**
 * Visits every star of the catalogue with z ∈ W exactly once. The order
 * is deterministic but unspecified.
 */
export type Catalogue = (W: Window, visit: Visit) => void;

/** δ(f, z) = |f′(z)|·y^(−(d−2)/2); see the file comment. */
export function delta(star: Star): number {
  const d = star.f.length - 1;
  return d === 2 ? star.slope : d === 3 ? star.slope / Math.sqrt(star.y) : star.slope * star.y ** (-(d - 2) / 2);
}

/**
 * A δ-shell: the stars with
 *
 *     lo·y^e < δ(f, z) ≤ hi·y^e.
 *
 * e = 0 is the invariant truncation (bounded discriminant); other
 * exponents arise as visibility limits of size laws (style/sizeLaw.ts).
 * Shells with a common exponent and abutting bounds partition a catalogue,
 * which is how the live view streams large stars first.
 */
export interface Shell {
  readonly lo: number;
  readonly hi: number;
  readonly exponent: number;
}

export function inShell(shell: Shell, del: number, y: number): boolean {
  const scale = shell.exponent === 0 ? 1 : y ** shell.exponent;
  return del > shell.lo * scale && del <= shell.hi * scale;
}

/**
 * The part of W in which a shell can hold stars at all. Integrality gives
 * a floor δ ≥ δ_min on every star (|disc| ≥ 1), and δ_min ≤ hi·y^e bounds
 * y away from the real axis when e > 0. Returns null if nothing is left.
 */
export function clipToShell(W: Window, shell: Shell, deltaMin: number): Window | null {
  let { y0, y1 } = W;
  const e = shell.exponent;
  if (e > 0) y0 = Math.max(y0, (deltaMin / shell.hi) ** (1 / e));
  else if (e < 0) y1 = Math.min(y1, (shell.hi / deltaMin) ** (-1 / e));
  else if (shell.hi < deltaMin) return null;
  return y0 <= y1 && y1 > 0 ? { s0: W.s0, s1: W.s1, y0, y1 } : null;
}

/**
 * Bounds of y^e over [y0, y1] — the one fact about shells the enumerators
 * need to turn a shell into loop bounds.
 */
export function powerRange(e: number, y0: number, y1: number): [min: number, max: number] {
  if (e === 0) return [1, 1];
  const u = y0 ** e;
  const v = y1 ** e;
  return u < v ? [u, v] : [v, u];
}
