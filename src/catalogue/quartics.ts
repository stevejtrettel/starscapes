/**
 * The quartic catalogue: stars (a₄x⁴ + … + a₀, z), a₄ ≥ 1, in a δ-shell
 * and of bounded shape.
 *
 * A quartic star has two invariants under SL₂(ℝ), where a quadratic or a
 * cubic star has one. With z = s + iy, put
 *
 *     U = f″(s)/2 = a₂ + 3a₃s + 6a₄s²,        w = f‴(s)/6 = a₃ + 4a₄s,
 *     P = y²w² + (2a₄y² − U)².
 *
 * Then δ² = |f′(z)|²/y² = 4P — the SIZE — and χ = U/√P is the SHAPE of the
 * root configuration:
 *
 *     two real roots r₁, r₂:    χ = cos(θ/2) ∈ (−1, 1), θ the angle at z
 *                               between the geodesic rays to r₁ and r₂;
 *     a second pair z₂, z̄₂:     |χ| = coth d(z, z₂) > 1.
 *
 * The classical invariants are functions of the two:
 *
 *     I = 4U² − 3P,    J = 2U(8U² − 9P),    disc f = −4(P − U²)P².
 *
 * (Proof: write f = Q_z·g with Q_z = x² − 2sx + |z|² and g a real
 * quadratic, and split g = t·Q_z + g₀ with g₀ apolar to Q_z. Then
 * U = 2y²t and P = |g(z)|² = |g₀(z)|², and by invariance the identities
 * need only be computed at z = i. They are checked in test/quartic.test.ts.)
 *
 * WHY THE SHAPE MUST BE BOUNDED. For fixed z and fixed δ the cofactors
 * g = tQ_z + g₀, t → ∞, are all admissible: quartics whose second pair of
 * roots closes in on z. There are infinitely many integer ones in every
 * window (they accumulate at quadratic irrationals), so no bound on δ
 * alone gives a finite catalogue. Bounding |χ| ≤ τ does:
 *
 *     τ = 1       exactly the quartics with two real roots;
 *     τ > 1       also those with two pairs at hyperbolic distance
 *                 ≥ arcoth τ from each other.
 *
 * The stars with δ ≤ Δ and |χ| ≤ τ number (πτ/40)·Δ⁵ per unit hyperbolic
 * area (test/quartic.test.ts), so D = 5 in the ink laws of style/sizeLaw.ts.
 * That is for a fixed window as Δ → ∞. It is not uniform towards the real
 * axis, where the family is almost entirely reducible — (qx − p)²·Q(x)
 * has bounded δ for infinitely many quadratics Q with a root near p/q —
 * and what one draws is the irreducible stars (catalogue/transport.ts).
 *
 * ENUMERATION. The head (a₄, a₃, a₂) is confined by the formulas above:
 *
 *     |a₃ + 4a₄s| ≤ √P/y,     |2a₄y² − U| ≤ √P,     |U| ≤ τ√P,
 *
 * with U − a₂ = 3a₃s + 6a₄s² a parabola in s. For each head, a₁ ranges
 * over an interval computed from the tail map, and the tail scan gives
 * a₀. As for cubics, the window is cut into bands in y.
 */
import { tailScan } from "../fibre/tailScan.ts";
import { contains, type Window } from "../fibre/window.ts";
import { discriminantExact } from "../poly/discriminant.ts";
import { evalJet } from "../poly/poly.ts";
import { solve } from "../roots/solve.ts";
import { type Catalogue, clipToShell, inShell, powerRange, type Shell, type Star, type Visit } from "./star.ts";

const SLACK = 1e-9;
const floorUp = (x: number): number => Math.floor(x + SLACK * (1 + Math.abs(x)));
const ceilDown = (x: number): number => Math.ceil(x - SLACK * (1 + Math.abs(x)));
const SUSPICIOUS_SLOPE = 1e-3;
const REAL_TOLERANCE = 1e-9;

/** U = f″(s)/2 for a quartic star. */
export function quarticU(star: Star): number {
  const { f, s } = star;
  return f[2] + 3 * f[3] * s + 6 * f[4] * s * s;
}

/** The shape χ = U/√P of a quartic star; √P = δ/2 = |f′(z)|/2y. */
export function quarticShape(star: Star): number {
  return quarticU(star) / (star.slope / (2 * star.y));
}

/** The invariants I and J of ax⁴ + bx³ + cx² + dx + e (27·disc = 4I³ − J²). */
export function quarticInvariants(f: ArrayLike<number>): [I: number, J: number] {
  const [e, d, c, b, a] = [f[0], f[1], f[2], f[3], f[4]];
  return [12 * a * e - 3 * b * d + c * c, 72 * a * c * e + 9 * b * c * d - 27 * a * d * d - 27 * e * b * b - 2 * c ** 3];
}

/**
 * Whether |χ| ≤ τ. For τ = 1 the boundary χ = ±1 is populated — it is the
 * quartics with a double real root — so the test is made on an integer:
 * |χ| ≤ 1 ⟺ P − U² ≥ 0 ⟺ disc f ≤ 0, and 27·disc f = 4I³ − J².
 */
export function quarticWithinShape(star: Star, tau: number): boolean {
  if (tau === 1) {
    const [I, J] = quarticInvariants(star.f);
    // Exact in float64 while 4|I|³ and J² stay below 2⁵³.
    if (Math.abs(I) < 1e5 && Math.abs(J) < 9e7) return 4 * I * I * I - J * J <= 0;
    return discriminantExact(star.f) <= 0n;
  }
  return Math.abs(quarticU(star)) <= tau * (star.slope / (2 * star.y));
}

/**
 * The least δ of an integer quartic star of shape |χ| ≤ τ: from |disc| ≥ 1,
 * 4·|P − U²|·P² ≥ 1 with |P − U²| ≤ max(1, τ² − 1)·P.
 */
export const quarticDeltaMin = (tau: number): number => 2 * (4 * Math.max(1, tau * tau - 1)) ** (-1 / 6);

export function quartics(shell: Shell, options: { tau?: number } = {}): Catalogue {
  const tau = options.tau ?? 1;
  return (window: Window, visit): void => {
    const W = clipToShell(window, shell, quarticDeltaMin(tau));
    if (!W) return;
    if (W.y0 <= 0) {
      throw new Error("quartics: this shell holds infinitely many stars near the real axis; raise the window's y0");
    }
    for (let lo = W.y0; ; lo *= 2) {
      const band: Window = { s0: W.s0, s1: W.s1, y0: lo, y1: Math.min(2 * lo, W.y1) };
      scanBand(shell, tau, band, lo === W.y0, visit);
      if (band.y1 === W.y1) break;
    }
  };
}

/** [min, max] of the cubic c₃s³ + c₂s² + c₁s over [u, v]. */
function cubicRange(c3: number, c2: number, c1: number, u: number, v: number): [number, number] {
  const at = (s: number): number => ((c3 * s + c2) * s + c1) * s;
  let [min, max] = at(u) < at(v) ? [at(u), at(v)] : [at(v), at(u)];
  // Critical points: 3c₃s² + 2c₂s + c₁ = 0.
  const disc = c2 * c2 - 3 * c3 * c1;
  if (disc >= 0 && c3 !== 0) {
    for (const sign of [-1, 1]) {
      const s = (-c2 + sign * Math.sqrt(disc)) / (3 * c3);
      if (s > u && s < v) {
        min = Math.min(min, at(s));
        max = Math.max(max, at(s));
      }
    }
  }
  return [min, max];
}

function scanBand(shell: Shell, tau: number, band: Window, closedBelow: boolean, visit: Visit): void {
  const e = shell.exponent;
  const f = new Float64Array(5);
  const pencil = [0, 0, 0, 0, 0];
  const re = new Float64Array(4);
  const im = new Float64Array(4);
  const jet = new Float64Array(4);
  const star: Star = { f, s: 0, y: 0, slope: 0 };

  // δ ≤ hi·y^e in the band: √P ≤ rootP, and then |U| ≤ τ·rootP.
  const rootP = ((shell.hi * powerRange(e, band.y0, band.y1)[1]) / 2) * (1 + SLACK);
  const uMax = tau * rootP;
  const [y02, y12] = [band.y0 * band.y0, band.y1 * band.y1];
  const m = rootP / band.y0; // |a₃ + 4a₄s| ≤ √P/y

  // |2a₄y² − U| ≤ √P and |U| ≤ τ√P give 2a₄y² ≤ (1 + τ)√P.
  for (let a4 = 1; a4 <= floorUp(((1 + tau) * rootP) / (2 * y02)); a4++) {
    // U lies within √P of 2a₄y², and within [−τ√P, τ√P].
    const uLo = Math.max(-uMax, 2 * a4 * y02 - rootP);
    const uHi = Math.min(uMax, 2 * a4 * y12 + rootP);
    if (uLo > uHi) continue;

    for (let a3 = ceilDown(-4 * a4 * band.s1 - m); a3 <= floorUp(-4 * a4 * band.s0 + m); a3++) {
      // The part of the band this (a₄, a₃) can reach.
      const sub: Window = {
        s0: Math.max(band.s0, (-m - a3) / (4 * a4)),
        s1: Math.min(band.s1, (m - a3) / (4 * a4)),
        y0: band.y0,
        y1: band.y1,
      };
      if (sub.s0 > sub.s1) continue;

      // a₂ = U − q(s), q(s) = 3a₃s + 6a₄s², a parabola opening upward.
      const q = (s: number): number => (3 * a3 + 6 * a4 * s) * s;
      const vertex = -a3 / (4 * a4);
      const qMin = vertex >= sub.s0 && vertex <= sub.s1 ? q(vertex) : Math.min(q(sub.s0), q(sub.s1));
      const qMax = Math.max(q(sub.s0), q(sub.s1));

      f[4] = pencil[4] = a4;
      f[3] = pencil[3] = a3;
      for (let a2 = ceilDown(uLo - qMax); a2 <= floorUp(uHi - qMin); a2++) {
        f[2] = pencil[2] = a2;
        // With the head complete, U = a₂ + q(s) ∈ [uLo, uHi] pins s to one
        // or two intervals: between the roots of q = uHi − a₂, outside
        // those of q = uLo − a₂ (roots (−3a₃ ± √(9a₃² + 24a₄·c))/12a₄).
        const upper = 9 * a3 * a3 + 24 * a4 * (uHi - a2);
        if (upper < 0) continue;
        const reachHi = Math.sqrt(upper) / (12 * a4) + SLACK;
        const outer: [number, number] = [Math.max(sub.s0, vertex - reachHi), Math.min(sub.s1, vertex + reachHi)];
        const lower = 9 * a3 * a3 + 24 * a4 * (uLo - a2);
        const pieces: Array<[number, number]> = [];
        if (lower <= 0) pieces.push(outer);
        else {
          const reachLo = Math.sqrt(lower) / (12 * a4) - SLACK;
          pieces.push([outer[0], Math.min(outer[1], vertex - reachLo)], [Math.max(outer[0], vertex + reachLo), outer[1]]);
        }

        for (const [sA, sB] of pieces) {
          if (sA > sB) continue;
          // |2a₄y² − U| ≤ √P pins y² as well.
          const uA = Math.max(uLo, a2 + (vertex >= sA && vertex <= sB ? q(vertex) : Math.min(q(sA), q(sB))));
          const uB = Math.min(uHi, a2 + Math.max(q(sA), q(sB)));
          const yA2 = Math.max(y02, (uA - rootP) / (2 * a4));
          const yB2 = Math.min(y12, (uB + rootP) / (2 * a4));
          if (yA2 > yB2) continue;
          const piece: Window = { s0: sA, s1: sB, y0: Math.sqrt(yA2), y1: Math.sqrt(yB2) };

          // The tail map: a₁ = −2a₂s − 3a₃s² − 4a₄s³ + (a₃ + 4a₄s)·y².
          const [cMin, cMax] = cubicRange(-4 * a4, -3 * a3, -2 * a2, sA, sB);
          const [w0, w1] = [a3 + 4 * a4 * sA, a3 + 4 * a4 * sB];
          const wyMin = Math.min(w0 * yA2, w0 * yB2, w1 * yA2, w1 * yB2);
          const wyMax = Math.max(w0 * yA2, w0 * yB2, w1 * yA2, w1 * yB2);

          for (let a1 = ceilDown(cMin + wyMin); a1 <= floorUp(cMax + wyMax); a1++) {
            f[1] = pencil[1] = a1;
            tailScan(pencil, piece, (a0) => {
              f[0] = a0;
              solve(f, re, im);
              for (let i = 0; i < 4; i++) {
                const s = re[i];
                const y = im[i];
                if (y <= REAL_TOLERANCE * (1 + Math.abs(s))) continue;
                // In this piece (so that a quartic with roots in two pieces
                // gives each star once), and in this band.
                if (s < sA || s > sB || !contains(band, s, y) || (y === band.y0 && !closedBelow)) continue;
                evalJet(f, s, y, jet);
                const slope = Math.hypot(jet[2], jet[3]);
                if (slope < SUSPICIOUS_SLOPE && discriminantExact(f) === 0n) continue;
                star.s = s;
                star.y = y;
                star.slope = slope;
                if (inShell(shell, slope / y, y) && quarticWithinShape(star, tau)) visit(star);
              }
            });
          }
        }
      }
    }
  }
}
