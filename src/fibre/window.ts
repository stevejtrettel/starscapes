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

/**
 * A view: what a picture or a camera looks at. Plain data, shared by the
 * print pipeline and the live explorer.
 */
export interface View {
  /** Centre of the picture in ℂ, as [Re, Im]. */
  readonly centre: readonly [number, number];
  /** Height of the picture in ℂ; the width follows the aspect ratio. */
  readonly height: number;
}

/** The part of the closed upper half plane a view shows at the given aspect ratio (width/height). */
export function windowOf(view: View, aspect = 1): Window {
  const halfW = (view.height * aspect) / 2;
  return {
    s0: view.centre[0] - halfW,
    s1: view.centre[0] + halfW,
    y0: Math.max(0, view.centre[1] - view.height / 2),
    y1: view.centre[1] + view.height / 2,
  };
}
