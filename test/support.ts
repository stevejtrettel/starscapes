/** Shared test helpers: seeded randomness and a brute-force star oracle. */
import type { Star } from "../src/catalogue/star.ts";
import { contains, type Window } from "../src/fibre/window.ts";
import { discriminantExact } from "../src/poly/discriminant.ts";
import { evalJet, type Poly } from "../src/poly/poly.ts";
import { solve } from "../src/roots/solve.ts";

/** Deterministic uniform numbers in [0, 1), so failures reproduce. */
export function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x80000000;
  };
}

export const key = (f: Poly): string => Array.from(f).join(",");

/** "coefficients @ root" with the root rounded, to compare stars across methods. */
export const starKey = (star: Star): string => `${key(star.f)} @ ${star.s.toFixed(9)},${star.y.toFixed(9)}`;

/**
 * Every star in W among the polynomials of the given coefficient ranges
 * (ascending; each range inclusive), by solving each one.
 */
export function bruteStars(
  ranges: ReadonlyArray<readonly [number, number]>,
  W: Window,
  keep: (star: Star) => boolean = () => true,
): Set<string> {
  const d = ranges.length - 1;
  const f = new Float64Array(d + 1);
  const re = new Float64Array(d);
  const im = new Float64Array(d);
  const jet = new Float64Array(4);
  const star: Star = { f, s: 0, y: 0, slope: 0 };
  const found = new Set<string>();
  for (let k = 0; k <= d; k++) f[k] = ranges[k][0];
  for (;;) {
    if (f[d] !== 0) {
      solve(f, re, im);
      for (let i = 0; i < d; i++) {
        if (im[i] <= 1e-9 || !contains(W, re[i], im[i])) continue;
        evalJet(f, re[i], im[i], jet);
        star.s = re[i];
        star.y = im[i];
        star.slope = Math.hypot(jet[2], jet[3]);
        // A star needs f′(z) ≠ 0; near zero, decide exactly (disc f = 0).
        if (star.slope < 1e-3 && discriminantExact(f) === 0n) continue;
        if (keep(star)) found.add(starKey(star));
      }
    }
    let k = 0;
    while (k <= d && f[k] === ranges[k][1]) {
      f[k] = ranges[k][0];
      k++;
    }
    if (k > d) return found;
    f[k]++;
  }
}

export function collect(run: (visit: (star: Star) => void) => void): string[] {
  const keys: string[] = [];
  run((star) => keys.push(starKey(star)));
  return keys;
}
