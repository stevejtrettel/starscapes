/**
 * Colourings: a colour for each star, from an invariant of its polynomial.
 *
 * Colours are chosen in OKLCH — lightness, chroma, hue in a perceptually
 * even space — so that a ramp's steps look equal and a hue wheel has
 * constant brightness. All are dark enough to read on a white ground.
 *
 *   ink            one colour.
 *   leading        the leading coefficient a_d (dark = small).
 *   discriminant   the invariant δ, i.e. the discriminant for d ≤ 3.
 *   height         the naive height max |aₖ|.
 *   shape          quartics: the shape χ (catalogue/quartics.ts) — the angle
 *                  at z between the rays to the two real roots, on a hue
 *                  wheel; quartics with a second pair of roots in a ramp.
 *   real-root      cubics: the real root r. It lives on the circle
 *                  ℝ ∪ {∞} = ∂ℍ, on which PSL₂(ℝ) acts, so it is shown on a
 *                  hue wheel through the angle 2·atan(r) (HST Fig. 1c).
 */
import { realRoot } from "../catalogue/cubics.ts";
import { quarticShape } from "../catalogue/quartics.ts";
import { delta, type Star } from "../catalogue/star.ts";
import { height } from "../poly/poly.ts";

export const COLOURINGS = ["ink", "leading", "discriminant", "height", "real-root", "shape"] as const;
export type Colouring = (typeof COLOURINGS)[number];

/** Writes the star's colour, components in [0, 1], to rgb[0..2]. */
export type Paint = (star: Star, rgb: Float32Array | Float64Array) => void;

/** OKLCH (L ∈ [0, 1], chroma, hue in turns) → sRGB, clipped to [0, 1]. */
export function oklch(L: number, chroma: number, hue: number): [number, number, number] {
  const a = chroma * Math.cos(2 * Math.PI * hue);
  const b = chroma * Math.sin(2 * Math.PI * hue);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const encode = (x: number): number =>
    Math.min(1, Math.max(0, x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055));
  return [
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const STEPS = 256;
const table = (colourAt: (t: number) => [number, number, number]): Float32Array => {
  const out = new Float32Array(STEPS * 3);
  for (let i = 0; i < STEPS; i++) out.set(colourAt(i / (STEPS - 1)), i * 3);
  return out;
};
/** Dark violet → magenta → amber, lightness rising: for quantities where small means simple. */
const RAMP = table((t) => oklch(0.28 + 0.44 * t, 0.15, (280 + 140 * t) / 360));
/** A hue wheel of constant lightness: for quantities on a circle. */
const WHEEL = table((t) => oklch(0.55, 0.16, t));

const INK = 0.05;

/** 1 − (unit/x)^(1/2): 0 at x = unit, tending to 1 — a ramp position for an unbounded quantity. */
const saturating = (x: number, unit: number): number => 1 - Math.sqrt(unit / Math.max(x, unit));

export function paint(colouring: Colouring): Paint {
  const from = (lut: Float32Array, position: (star: Star) => number): Paint => (star, rgb) => {
    const i = 3 * Math.min(STEPS - 1, Math.max(0, Math.round(position(star) * (STEPS - 1))));
    rgb[0] = lut[i];
    rgb[1] = lut[i + 1];
    rgb[2] = lut[i + 2];
  };
  const ink: Paint = (_star, rgb) => {
    rgb[0] = rgb[1] = rgb[2] = INK;
  };
  switch (colouring) {
    case "ink":
      return ink;
    case "leading":
      return from(RAMP, (star) => saturating(star.f[star.f.length - 1], 1));
    case "discriminant":
      return from(RAMP, (star) => saturating(delta(star), 1.7));
    case "height":
      return from(RAMP, (star) => saturating(height(star.f), 1));
    case "real-root": {
      const wheel = from(WHEEL, (star) => 0.5 + Math.atan(realRoot(star)) / Math.PI);
      return (star, rgb) => (star.f.length === 4 ? wheel(star, rgb) : ink(star, rgb));
    }
    case "shape": {
      // χ = cos(θ/2): the angle θ ∈ (0, 2π) between the rays to the two real
      // roots goes round the wheel. A second pair (|χ| > 1) is drawn in the
      // ramp's dark end, lighter the closer the pairs are.
      const wheel = from(WHEEL, (star) => Math.acos(quarticShape(star)) / Math.PI);
      const ramp = from(RAMP, (star) => 0.6 * (1 - 1 / Math.abs(quarticShape(star))));
      return (star, rgb) => {
        if (star.f.length !== 5) ink(star, rgb);
        else if (Math.abs(quarticShape(star)) <= 1) wheel(star, rgb);
        else ramp(star, rgb);
      };
    }
  }
}
