/** Named recipes: the pictures the explorer and the print script start from. */
import type { View } from "./fibre/window.ts";
import type { Recipe } from "./recipe.ts";
import type { StarscapeSpec } from "./starscape.ts";
import type { Colouring } from "./style/colour.ts";
import { euclidean, hyperbolic } from "./style/sizeLaw.ts";

/** A recipe at its home view, with c quoted for that view drawn 1000 pixels tall. */
function preset(
  title: string, spec: StarscapeSpec, view: View,
  options: { irreducible?: boolean; colouring?: Colouring } = {},
): Recipe {
  return {
    title,
    spec: { ...spec, irreducible: options.irreducible ?? false },
    pixel: view.height / 1000,
    view,
    colouring: options.colouring ?? "ink",
    faintest: 0.3,
  };
}

const CLASSIC: View = { centre: [0, 1.1], height: 2.6 };
const SQUARE: View = { centre: [0, 1.0], height: 2.4 };

export const PRESETS = {
  // Hyperbolic radius c/√|disc|: the classical quadratic starscape.
  quadratics: preset("integer quadratics", { family: { kind: "quadratics" }, law: hyperbolic(0.035, 1) }, CLASSIC),

  // Radius c·y^(2/3)/√|disc|: β = wκ/D = 2/3 evens the ink down the page.
  "quadratics-even": preset(
    "integer quadratics, evenly inked",
    { family: { kind: "quadratics" }, law: { c: 0.035, beta: 2 / 3, kappa: 1, cap: 0.5 } },
    CLASSIC,
  ),

  // Hyperbolic radius ∝ |disc|^(−1/3), the root-discriminant law (κ = 4/3).
  cubics: preset(
    "integer cubics",
    { family: { kind: "cubics", monic: false }, law: hyperbolic(0.04, 4 / 3) },
    SQUARE,
    { irreducible: true },
  ),

  // The same κ = 4/3 with β = wκ/D = 2/3.
  "cubics-even": preset(
    "integer cubics, evenly inked",
    { family: { kind: "cubics", monic: false }, law: { c: 0.04, beta: 2 / 3, kappa: 4 / 3, cap: 0.5 } },
    SQUARE,
    { irreducible: true },
  ),

  // Coloured by the real root, as in Harriss–Stange–Trettel, Figure 1c.
  "cubics-by-real-root": preset(
    "integer cubics, coloured by real root",
    { family: { kind: "cubics", monic: false }, law: { c: 0.04, beta: 2 / 3, kappa: 4 / 3, cap: 0.5 } },
    SQUARE,
    { irreducible: true, colouring: "real-root" },
  ),

  // Euclidean radius c/δ = c/(4|disc|)^(1/4): nearly even (ink ∝ y^(−1/2)).
  "monic-cubics": preset(
    "monic integer cubics",
    { family: { kind: "cubics", monic: true }, law: euclidean(0.028, 1) },
    SQUARE,
    { irreducible: true },
  ),

  // The irreducible integer quartics with two real roots (|χ| ≤ 1), sized
  // by δ: the analogue for degree 4 of the quadratic and cubic starscapes.
  // As there κ = D/3: each halving of the radius brings 8 times the stars.
  // The even-ink exponent would be β = wκ/D = 2/3, but irreducible
  // quartics of small δ fall well short of the asymptotic density, which
  // leaves the foot of the page empty; β = 1/2 fills it.
  quartics: preset(
    "irreducible integer quartics with two real roots",
    { family: { kind: "quartics", tau: 1 }, law: { c: 0.09, beta: 1 / 2, kappa: 5 / 3, cap: 0.5 } },
    SQUARE,
    { irreducible: true, colouring: "shape" },
  ),

  // With τ = 2: also the quartics with two pairs of complex roots at
  // hyperbolic distance ≥ arcoth 2 ≈ 0.55 from each other.
  "quartics-all": preset(
    "irreducible integer quartics of shape |χ| ≤ 2",
    { family: { kind: "quartics", tau: 2 }, law: { c: 0.07, beta: 1 / 2, kappa: 5 / 3, cap: 0.5 } },
    SQUARE,
    { irreducible: true, colouring: "shape" },
  ),

  "quartic-box": preset(
    "integer quartics of height ≤ 5",
    { family: { kind: "box", degree: 4, height: 5, monic: false }, law: hyperbolic(0.04, 1) },
    SQUARE,
  ),

  quintics: preset(
    "integer quintics of height ≤ 3",
    { family: { kind: "box", degree: 5, height: 3, monic: false }, law: hyperbolic(0.04, 1) },
    SQUARE,
  ),

  // High degree is only drawable zoomed in — a wide view of this family
  // holds about 10¹¹ stars — so the home view is a window a thousandth of
  // a unit across, enumerated by the lattice method.
  "sextics-deep": preset(
    "sextics with ‖f‖₂ ≤ 30, deep",
    { family: { kind: "ball", degree: 6, radius: 30, monic: false }, law: hyperbolic(5e-5, 1) },
    { centre: [0.3137, 0.8721], height: 1.2e-3 },
    { colouring: "leading" },
  ),

  // The planar family of Harriss–Stange–Trettel, Figure 1b.
  "cubic-plane": preset(
    "ax³ + cx² + bx + c",
    {
      family: { kind: "plane", basis: [[0, 0, 0, 1], [0, 1], [1, 0, 1]], a: [1, 40], height: 40 },
      law: hyperbolic(0.08, 4 / 3),
    },
    { centre: [0, 1.0], height: 2.0 },
    { colouring: "leading" },
  ),

  "depressed-cubics": preset(
    "depressed cubics x³ + bx + c",
    {
      family: { kind: "plane", basis: [[0, 0, 0, 1], [0, 1], [1]], a: [1, 1], height: 400 },
      law: euclidean(0.05, 1),
    },
    { centre: [0, 2.2], height: 4.6 },
  ),

  "reciprocal-quartics": preset(
    "reciprocal quartics a(x⁴ + 1) + b(x³ + x) + cx²",
    {
      family: { kind: "plane", basis: [[1, 0, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1]], a: [1, 30], height: 60 },
      law: hyperbolic(0.05, 1),
    },
    { centre: [0, 1.0], height: 2.0 },
    { colouring: "leading" },
  ),
} satisfies Record<string, Recipe>;

export type PresetName = keyof typeof PRESETS;
