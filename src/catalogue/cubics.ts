/**
 * The cubic catalogue: all stars (ax³ + bx² + cx + d, z), a ≥ 1, in a
 * δ-shell — every integer cubic with a non-real root, or only the monic
 * ones.
 *
 * Write f = a(x − r)(x − z)(x − z̄) with z = s + iy. Then r = −b/a − 2s and
 *
 *     |f′(z)|² = 4y²·[(b + 3as)² + a²y²],      δ² = |f′(z)|²/y = 2√|disc f|.
 *
 * For fixed z this is a positive definite quadratic form in the head
 * (a, b), so a shell δ ≤ hi·y^e confines the head to an ellipse: finitely
 * many heads, found by two nested loops. Each head, with each admissible
 * c, is then a pencil ax³ + bx² + cx + t whose integer members with a root
 * in the window are listed by the tail scan (fibre/tailScan.ts).
 *
 * With e = 0 this is the set of integer binary cubic forms of negative
 * discriminant ≥ −hi⁴/4, located by their complex root: the SL₂(ℤ)-
 * invariant cubic starscape. Its density is π·hi⁴/16 stars per unit
 * hyperbolic area, and over a fundamental domain that count is Davenport's
 * (π²/24)·X for classes of forms with −X < disc < 0 (test/density.test.ts).
 */
import { type Crossings, createCrossings, sweep, widen } from "../fibre/tailScan.ts";
import { contains, type Window } from "../fibre/window.ts";
import { discriminant } from "../poly/discriminant.ts";
import { solveCubic } from "../roots/closedForm.ts";
import { type Catalogue, clipToShell, inShell, powerRange, type Shell, type Star, type Visit } from "./star.ts";

/** δ⁴ = 4|disc| ≥ 12: the least |disc| of a cubic with a non-real root is 3. */
const DELTA_MIN = 12 ** 0.25;

const SLACK = 1e-9;
const floorUp = (x: number): number => Math.floor(x + SLACK * (1 + Math.abs(x)));
const ceilDown = (x: number): number => Math.ceil(x - SLACK * (1 + Math.abs(x)));

export function cubics(shell: Shell, options: { monic?: boolean } = {}): Catalogue {
  return (window: Window, visit): void => {
    const W = clipToShell(window, shell, DELTA_MIN);
    if (!W) return;
    if (W.y0 <= 0) {
      throw new Error("cubics: this shell holds infinitely many stars near the real axis; raise the window's y0");
    }
    // The ellipse of admissible heads changes with the height, so the
    // window is cut into bands y ∈ (lo, 2·lo], on each of which it is
    // constant up to a bounded factor. A star belongs to the band
    // containing its root, so no star is visited twice.
    for (let lo = W.y0; lo < W.y1 || lo === W.y0; lo *= 2) {
      const band: Window = { s0: W.s0, s1: W.s1, y0: lo, y1: Math.min(2 * lo, W.y1) };
      scanBand(shell, options.monic === true, band, lo === W.y0, visit);
      if (band.y1 === W.y1) break;
    }
  };
}

/**
 * The crossings of the cubic pencil ax³ + bx² + cx + t with ∂W, in closed
 * form (the degree-3 instance of fibre/tailScan.ts: the edge polynomials
 * are quadratics and lines). With p = ax³ + bx² + cx and ζ = s + iy,
 *
 *     Im p(ζ)/y = p′(s) − a·y²,      Re p(ζ) = p(s) − (3as + b)·y².
 *
 * Requires y₀ > 0.
 */
export function cubicCrossings(a: number, b: number, c: number, W: Window, out: Crossings): void {
  out.count = 0;
  const [sLo, sHi] = widen(W.s0, W.s1);
  const [y2Lo, y2Hi] = widen(W.y0 * W.y0, W.y1 * W.y1);
  const cross = (s: number, y2: number, entering: boolean): void => {
    out.t[out.count] = -(((a * s + b) * s + c) * s - (3 * a * s + b) * y2);
    out.sign[out.count++] = entering ? 1 : -1;
  };

  // Horizontal edges: 3as² + 2bs + (c − a·y_e²) = 0. There Im p′(ζ) = 2y(3as + b),
  // so the root moves upward as t grows iff 3as + b > 0.
  for (let edge = 0; edge < 2; edge++) {
    const y2 = edge === 0 ? W.y0 * W.y0 : W.y1 * W.y1;
    const disc = b * b - 3 * a * (c - a * y2);
    if (disc <= 0) continue;
    const root = Math.sqrt(disc);
    for (let k = 0; k < 2; k++) {
      const s = (-b + (k === 0 ? -root : root)) / (3 * a);
      if (s < sLo || s > sHi) continue;
      const rising = 3 * a * s + b > 0; // dz/dt = −1/p′ has imaginary part Im p′/|p′|²
      cross(s, y2, edge === 0 ? rising : !rising);
    }
  }
  // Vertical edges: y² = p′(s_e)/a. There Re p′(ζ) = −2a·y² < 0, so the root
  // moves to the right as t grows: in through the left edge, out through the right.
  for (let edge = 0; edge < 2; edge++) {
    const s = edge === 0 ? W.s0 : W.s1;
    const y2 = ((3 * a * s + 2 * b) * s + c) / a;
    if (y2 >= y2Lo && y2 <= y2Hi) cross(s, y2, edge === 0);
  }
}

/** The stars of the shell in one band; `closedBelow` says whether y = band.y0 belongs to it. */
function scanBand(shell: Shell, monic: boolean, band: Window, closedBelow: boolean, visit: Visit): void {
  const e = shell.exponent;
  const f = new Float64Array(4);
  const re = new Float64Array(3);
  const im = new Float64Array(3);
  const star: Star = { f, s: 0, y: 0, slope: 0 };
  const crossings = createCrossings(8);

  // δ ≤ hi·y^e reads (b + 3as)² + a²y² ≤ E(y), with E(y) = hi²·y^(2e−1)/4.
  // First consequence: a² ≤ (hi²/4)·y^(2e−3) somewhere in the band.
  const aBound = floorUp((shell.hi / 2) * Math.sqrt(powerRange(2 * e - 3, band.y0, band.y1)[1]));
  const eMax = (shell.hi * shell.hi * powerRange(2 * e - 1, band.y0, band.y1)[1]) / 4;

  for (let a = 1; a <= (monic ? Math.min(1, aBound) : aBound); a++) {
    // Second consequence: |b + 3as| ≤ m, m² = max E − a²·y₀².
    const m2 = eMax - a * a * band.y0 * band.y0;
    if (m2 < 0) continue;
    const m = Math.sqrt(m2);

    for (let b = ceilDown(-3 * a * band.s1 - m); b <= floorUp(-3 * a * band.s0 + m); b++) {
      // The part of the band this head can reach.
      const sub: Window = {
        s0: Math.max(band.s0, (-b - m) / (3 * a)),
        s1: Math.min(band.s1, (-b + m) / (3 * a)),
        y0: band.y0,
        y1: band.y1,
      };
      if (sub.s0 > sub.s1) continue;

      // c = Ψ's first component: c(s, y) = a·y² + g(s), g(s) = −3as² − 2bs.
      const g = (s: number): number => -(3 * a * s + 2 * b) * s;
      const vertex = -b / (3 * a);
      const gMax = vertex >= sub.s0 && vertex <= sub.s1 ? (b * b) / (3 * a) : Math.max(g(sub.s0), g(sub.s1));
      const gMin = Math.min(g(sub.s0), g(sub.s1));

      f[3] = a;
      f[2] = b;
      for (let c = ceilDown(a * sub.y0 * sub.y0 + gMin); c <= floorUp(a * sub.y1 * sub.y1 + gMax); c++) {
        f[1] = c;
        cubicCrossings(a, b, c, sub, crossings);
        sweep(crossings, (d) => {
          f[0] = d;
          if (discriminant(f) >= 0) return; // no non-real root
          solveCubic(f, re, im);
          const s = re[1];
          const y = im[1];
          if (!contains(band, s, y) || (y === band.y0 && !closedBelow)) return;
          const slope = 2 * y * Math.hypot(b + 3 * a * s, a * y);
          if (!inShell(shell, slope / Math.sqrt(y), y)) return;
          star.s = s;
          star.y = y;
          star.slope = slope;
          visit(star);
        });
      }
    }
  }
}

/** The real root of a cubic star: r = −b/a − 2s, by Vieta. */
export function realRoot(star: Star): number {
  return -star.f[2] / star.f[3] - 2 * star.s;
}
