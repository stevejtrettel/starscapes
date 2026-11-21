/**
 * Named starscapes: a family, a size law, a home view, and whether to keep
 * only irreducible polynomials. Shared by the explorer and the print script.
 */
import type { View } from "./fibre/window.ts";
import { type StarscapeSpec, starscape } from "./starscape.ts";
import { euclidean, hyperbolic, type SizeLaw, zoomExponent } from "./style/sizeLaw.ts";

export interface Preset {
  readonly title: string;
  readonly spec: StarscapeSpec;
  readonly home: View;
  /** Cubics only: drop polynomials with a rational root. */
  readonly irreducible: boolean;
}

export const PRESETS = {
  quadratics: {
    title: "integer quadratics",
    // Hyperbolic radius c/√|disc|: the classical quadratic starscape.
    spec: { family: { kind: "quadratics" }, law: hyperbolic(0.035, 1) },
    home: { centre: [0, 1.1], height: 2.6 },
    irreducible: false,
  },
  "quadratics-even": {
    title: "integer quadratics, evenly inked",
    // Radius c·y^(2/3)/√|disc|: β = wκ/D = 2/3 evens the ink down the page.
    spec: { family: { kind: "quadratics" }, law: { c: 0.035, beta: 2 / 3, kappa: 1, cap: 0.5 } },
    home: { centre: [0, 1.1], height: 2.6 },
    irreducible: false,
  },
  cubics: {
    title: "integer cubics",
    // Hyperbolic radius ∝ |disc|^(−1/3), the root-discriminant law (κ = 4/3).
    spec: { family: { kind: "cubics", monic: false }, law: hyperbolic(0.04, 4 / 3) },
    home: { centre: [0, 1.0], height: 2.4 },
    irreducible: true,
  },
  "cubics-even": {
    title: "integer cubics, evenly inked",
    // The same κ = 4/3 with β = wκ/D = 2/3.
    spec: { family: { kind: "cubics", monic: false }, law: { c: 0.04, beta: 2 / 3, kappa: 4 / 3, cap: 0.5 } },
    home: { centre: [0, 1.0], height: 2.4 },
    irreducible: true,
  },
  "monic-cubics": {
    title: "monic integer cubics",
    // Euclidean radius c/δ = c/(4|disc|)^(1/4): nearly even (ink ∝ y^(−1/2)).
    spec: { family: { kind: "cubics", monic: true }, law: euclidean(0.028, 1) },
    home: { centre: [0, 1.0], height: 2.4 },
    irreducible: true,
  },
  quartics: {
    title: "integer quartics of height ≤ 5",
    spec: { family: { kind: "box", degree: 4, height: 5, monic: false }, law: hyperbolic(0.04, 1) },
    home: { centre: [0, 1.0], height: 2.4 },
    irreducible: false,
  },
  quintics: {
    title: "integer quintics of height ≤ 3",
    spec: { family: { kind: "box", degree: 5, height: 3, monic: false }, law: hyperbolic(0.04, 1) },
    home: { centre: [0, 1.0], height: 2.4 },
    irreducible: false,
  },
  "cubic-plane": {
    // The planar family of Harriss–Stange–Trettel, Figure 1b.
    title: "ax³ + cx² + bx + c",
    spec: {
      family: { kind: "plane", basis: [[0, 0, 0, 1], [0, 1], [1, 0, 1]], a: [1, 40], height: 40 },
      law: hyperbolic(0.08, 4 / 3),
    },
    home: { centre: [0, 1.0], height: 2.0 },
    irreducible: false,
  },
  "depressed-cubics": {
    title: "depressed cubics x³ + bx + c",
    spec: {
      family: { kind: "plane", basis: [[0, 0, 0, 1], [0, 1], [1]], a: [1, 1], height: 400 },
      law: euclidean(0.05, 1),
    },
    home: { centre: [0, 2.2], height: 4.6 },
    irreducible: false,
  },
  "reciprocal-quartics": {
    title: "reciprocal quartics a(x⁴ + 1) + b(x³ + x) + cx²",
    spec: {
      family: { kind: "plane", basis: [[1, 0, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1]], a: [1, 30], height: 60 },
      law: hyperbolic(0.05, 1),
    },
    home: { centre: [0, 1.0], height: 2.0 },
    irreducible: false,
  },
} as const satisfies Record<string, Preset>;

export type PresetName = keyof typeof PRESETS;

/** A preset's size constant c is quoted for its home view drawn this many pixels tall. */
const REFERENCE_HEIGHT = 1000;

/**
 * The preset's law at a given pixel size (in ℂ): c ∝ pixel^γ with the
 * family's zoom exponent γ (style/sizeLaw.ts), so that a zoomed view or a
 * larger print carries the same ink as the home view rather than
 * saturating. Laws whose ink converges, and finite families, are left
 * unchanged (γ = 0).
 */
export function lawAt(preset: Preset, pixel: number): SizeLaw {
  const { law } = preset.spec;
  const { population } = starscape(preset.spec);
  const gamma = population === null ? 0 : zoomExponent(law, population);
  return { ...law, c: law.c * (pixel / (preset.home.height / REFERENCE_HEIGHT)) ** gamma };
}
