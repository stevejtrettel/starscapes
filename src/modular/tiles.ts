/**
 * The tiles of the modular tessellation that meet a window.
 *
 * γ𝔉 meets W iff 𝔉 meets γ⁻¹W, and γ⁻¹W lies in a box that `imageBox`
 * computes exactly. Testing that box against the strip {|s| ≤ 1/2,
 * y ≥ √3/2} containing 𝔉 accepts every tile that meets W and a few that
 * do not; the tiles meeting a connected set are connected under adjacency,
 * so a breadth-first search from the tile of any point of W finds them all.
 *
 * Finitely many tiles meet a window with y₀ > 0: a tile reaching height y
 * has |c| ≤ y^(−1/2).
 */
import type { Window } from "../fibre/window.ts";
import { imageBox, inverse, type Matrix, multiply, normalise, reduce, S, T, T_INVERSE } from "./mobius.ts";

export const SQRT3_2 = Math.sqrt(3) / 2;

/**
 * The part of a box that can lie in 𝔉, or null. The box is first widened
 * by a relative 10⁻⁹: it is the image of a window computed in floating
 * point, and a point on the window's edge, or on the boundary of 𝔉, must
 * not be lost to rounding. (Callers decide membership exactly afterwards.)
 */
export function clipToDomain(box: Window): Window | null {
  const slack = 1e-9;
  const clipped = {
    s0: Math.max(box.s0 - slack * (1 + Math.abs(box.s0)), -0.5 - slack),
    s1: Math.min(box.s1 + slack * (1 + Math.abs(box.s1)), 0.5 + slack),
    y0: Math.max(box.y0 * (1 - slack), SQRT3_2 - slack),
    y1: box.y1 * (1 + slack),
  };
  return clipped.s0 <= clipped.s1 && clipped.y0 <= clipped.y1 ? clipped : null;
}

/**
 * Every γ ∈ PSL₂(ℤ) (normalised) whose tile γ𝔉 meets W, together with the
 * part of 𝔉's strip that γ⁻¹W can occupy. Requires W.y0 > 0.
 */
export function tilesMeeting(W: Window): Array<{ gamma: Matrix; pullback: Window }> {
  if (!(W.y0 > 0)) throw new Error("tilesMeeting: the window must lie strictly above the real axis");
  const start = reduce((W.s0 + W.s1) / 2, (W.y0 + W.y1) / 2);
  const seen = new Set<string>([start.join()]);
  const queue: Matrix[] = [start];
  const tiles: Array<{ gamma: Matrix; pullback: Window }> = [];

  for (let head = 0; head < queue.length; head++) {
    const gamma = queue[head];
    const pullback = clipToDomain(imageBox(inverse(gamma), W));
    if (!pullback) continue;
    tiles.push({ gamma, pullback });
    for (const generator of [T, T_INVERSE, S]) {
      const next = normalise(multiply(gamma, generator));
      const key = next.join();
      if (!seen.has(key)) {
        seen.add(key);
        queue.push(next);
      }
    }
  }
  return tiles;
}
