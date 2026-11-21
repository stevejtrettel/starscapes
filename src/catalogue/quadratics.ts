/**
 * The quadratic catalogue: all stars (ax² + bx + c, z), a ≥ 1, in a δ-shell.
 *
 * A quadratic with root z = s + iy in the upper half plane is
 * a·(x² − 2sx + s² + y²), so
 *
 *     b = −2as,      c = a(s² + y²),      δ = |f′(z)| = 2ay = √|disc|.
 *
 * The enumeration is the tail scan made explicit: for each head a the
 * coefficient b pins s, and c then runs over the integers of an interval
 * determined by the y-range. The shell bounds a through δ = 2ay.
 */
import { contains, type Window } from "../fibre/window.ts";
import { type Catalogue, clipToShell, powerRange, type Shell, type Star } from "./star.ts";

/** δ = √|disc| ≥ √3 for every integer quadratic with a non-real root. */
const DELTA_MIN = Math.sqrt(3);

/** Relative widening of real bounds before rounding to integers. */
const SLACK = 1e-9;
const floorUp = (x: number): number => Math.floor(x + SLACK * (1 + Math.abs(x)));
const ceilDown = (x: number): number => Math.ceil(x - SLACK * (1 + Math.abs(x)));

/**
 * Shell membership lo·y^e < δ ≤ hi·y^e with δ = 2ay, written as
 * lo·y^(e−1) < 2a ≤ hi·y^(e−1): for e = 1 this compares integers with the
 * bounds, so a star exactly on the boundary (2a = hi) is decided exactly.
 */
function memberOfShell(shell: Shell, a: number, y: number): boolean {
  const scale = shell.exponent === 1 ? 1 : y ** (shell.exponent - 1);
  return 2 * a > shell.lo * scale && 2 * a <= shell.hi * scale;
}

export function quadratics(shell: Shell): Catalogue {
  return (window: Window, visit): void => {
    const e = shell.exponent;
    const W = clipToShell(window, shell, DELTA_MIN);
    if (!W) return;

    // lo·y^(e−1) < 2a ≤ hi·y^(e−1) for some y in the window.
    const [gMin, gMax] = powerRange(e - 1, W.y0, W.y1);
    const aMax = floorUp((shell.hi * gMax) / 2);
    if (!Number.isFinite(aMax)) {
      throw new Error("quadratics: this shell holds infinitely many stars near the real axis; raise the window's y0");
    }
    const aMin = Math.max(1, ceilDown((shell.lo * gMin) / 2));

    const f = new Float64Array(3);
    const star: Star = { f, s: 0, y: 0, slope: 0 };

    for (let a = aMin; a <= aMax; a++) {
      // The heights at which this a lies in the shell: an interval, since
      // y^(e−1) is monotone.
      let yA = W.y0;
      let yB = W.y1;
      if (e < 1) {
        yB = Math.min(yB, (shell.hi / (2 * a)) ** (1 / (1 - e)));
        yA = Math.max(yA, (shell.lo / (2 * a)) ** (1 / (1 - e)));
      } else if (e > 1) {
        yA = Math.max(yA, ((2 * a) / shell.hi) ** (1 / (e - 1)));
        if (shell.lo > 0) yB = Math.min(yB, ((2 * a) / shell.lo) ** (1 / (e - 1)));
      }
      if (yA > yB * (1 + SLACK)) continue;

      f[2] = a;
      for (let b = ceilDown(-2 * a * W.s1); b <= floorUp(-2 * a * W.s0); b++) {
        const base = (b * b) / (4 * a); // a·s²
        f[1] = b;
        for (let c = ceilDown(base + a * yA * yA); c <= floorUp(base + a * yB * yB); c++) {
          const D = 4 * a * c - b * b; // −disc, an exact integer
          if (D <= 0) continue;
          const slope = Math.sqrt(D);
          const s = -b / (2 * a);
          const y = slope / (2 * a);
          if (!contains(W, s, y) || !memberOfShell(shell, a, y)) continue;
          f[0] = c;
          star.s = s;
          star.y = y;
          star.slope = slope;
          visit(star);
        }
      }
    }
  };
}
