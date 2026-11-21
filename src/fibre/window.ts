/**
 * A window: the closed rectangle [s₀, s₁] × [y₀, y₁] in the closed upper
 * half plane (y₀ ≥ 0), in the coordinates z = s + iy.
 */
export interface Window {
  readonly s0: number;
  readonly s1: number;
  readonly y0: number;
  readonly y1: number;
}

export function contains(W: Window, s: number, y: number): boolean {
  return s >= W.s0 && s <= W.s1 && y >= W.y0 && y <= W.y1;
}

/** W enlarged by `margin` on every side, clipped to the upper half plane. */
export function pad(W: Window, margin: number): Window {
  return {
    s0: W.s0 - margin,
    s1: W.s1 + margin,
    y0: Math.max(0, W.y0 - margin),
    y1: W.y1 + margin,
  };
}

/** The window with the given centre and height whose width follows the aspect ratio. */
export function windowAt(centre: readonly [number, number], height: number, aspect = 1): Window {
  const halfW = (height * aspect) / 2;
  return {
    s0: centre[0] - halfW,
    s1: centre[0] + halfW,
    y0: Math.max(0, centre[1] - height / 2),
    y1: centre[1] + height / 2,
  };
}
