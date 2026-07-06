/**
 * Coloring rules: the color half of a style (design.md, Level 3 —
 * "Coloring rules in code", settled 2026-07-06).
 *
 * A coloring rule maps a root's row to r, g, b — a function per root of
 * the data on that root, same input as sizing rules and filters. Like
 * sizing, a rule is an always-callable function plus OPTIONAL declared
 * structure, and the structure is what legends and HUDs derive from:
 *
 *   `classes` + `palette` — the rule is a CLASSIFICATION (the common
 *     case): classify(row) picks a code, palette maps code → color. The
 *     classification declares its WHOLE domain (an explicit "reducible"
 *     class rather than assuming an irreducibleOnly filter upstream); a
 *     class the picture filters away simply never appears.
 *
 *   `scalar { label, domain, transform }` — the rule is a ramp over a
 *     quantity (height, |f′|, depth). The domain is DECLARED, never
 *     inferred from the frame: color meaning is absolute — a height-40
 *     polynomial is the same color at every zoom, live and in print —
 *     and out-of-domain values clamp to the ramp ends. (Frame-relative
 *     normalization is rejected for meaning, the E6–E12 lesson; the
 *     develop-stage tone map's percentile is a rendering concern only.)
 *
 * Bare `color(row, out)` functions remain the opaque escape hatch —
 * fully drawable, nothing derivable.
 */
import { isPerfectSquare } from "./invariants.ts";
import type { RootRow } from "./style.ts";

export type Rgb = readonly [number, number, number];

export interface ColoringRule {
  /** Writes r, g, b in [0, 1] into out[0..2] — all the style pass calls. */
  color(row: RootRow, out: Float64Array): void;
  /** Present iff the rule is a classification: the code table. */
  readonly classes?: readonly string[];
  /** Present with `classes`: code → color, same length. */
  readonly palette?: readonly Rgb[];
  /** Present iff the rule is a ramp over a declared quantity. */
  readonly scalar?: {
    readonly label: string;
    readonly domain: readonly [number, number];
    readonly transform: "linear" | "log";
  };
}

/** The trivial rule: one ink everywhere. */
export function solid(r: number, g: number, b: number): ColoringRule {
  return {
    color: (_row, out) => {
      out[0] = r;
      out[1] = g;
      out[2] = b;
    },
  };
}

/**
 * A classification: classify(row) ∈ [0, classes.length) picks the class,
 * palette (same length, checked loudly) supplies the colors. classify is
 * where the mathematics lives; palettes swap without touching it.
 */
export function byClass(opts: {
  classes: readonly string[];
  classify(row: RootRow): number;
  palette: readonly Rgb[];
}): ColoringRule {
  const { classes, classify, palette } = opts;
  if (palette.length !== classes.length) {
    throw new Error(
      `byClass: palette has ${palette.length} colors for ${classes.length} ` +
        `classes [${classes.join(", ")}] — every class needs its color`,
    );
  }
  return {
    classes,
    palette,
    color: (row, out) => {
      const k = classify(row);
      const p = palette[k];
      if (p === undefined) {
        throw new Error(
          `byClass: classify returned ${k}, outside [0, ${classes.length}) of [${classes.join(", ")}]`,
        );
      }
      out[0] = p[0];
      out[1] = p[1];
      out[2] = p[2];
    },
  };
}

/** A ramp: t ∈ [0, 1] → color. */
export type Ramp = (t: number, out: Float64Array) => void;

/** Linear interpolation from one ink to another. */
export function lerpRamp(from: Rgb, to: Rgb): Ramp {
  return (t, out) => {
    out[0] = from[0] + (to[0] - from[0]) * t;
    out[1] = from[1] + (to[1] - from[1]) * t;
    out[2] = from[2] + (to[2] - from[2]) * t;
  };
}

/**
 * A ramp over a declared quantity. `of(row)` is pushed through the
 * declared domain and transform into t ∈ [0, 1] (clamped — out-of-domain
 * values sit at the ramp ends, visibly), then colored by the ramp.
 */
export function byScalar(opts: {
  label: string;
  of(row: RootRow): number;
  domain: readonly [number, number];
  transform?: "linear" | "log";
  ramp: Ramp;
}): ColoringRule {
  const { label, of, domain, ramp } = opts;
  const transform = opts.transform ?? "linear";
  const [lo, hi] = domain;
  if (!(hi > lo)) throw new Error(`byScalar(${label}): domain [${lo}, ${hi}] needs lo < hi`);
  if (transform === "log" && lo <= 0) {
    throw new Error(`byScalar(${label}): log transform needs a positive domain, got [${lo}, ${hi}]`);
  }
  const tLo = transform === "log" ? Math.log(lo) : lo;
  const span = (transform === "log" ? Math.log(hi) : hi) - tLo;
  return {
    scalar: { label, domain: [lo, hi], transform },
    color: (row, out) => {
      const v = of(row);
      const t = ((transform === "log" ? Math.log(v) : v) - tLo) / span;
      ramp(t < 0 ? 0 : t > 1 ? 1 : t, out);
    },
  };
}

// ── The named library ─────────────────────────────────────────────────────

/** Print-friendly defaults for the Galois classes (Steve's eyes may veto). */
const GALOIS_PALETTE: readonly Rgb[] = [
  [0.62, 0.62, 0.62], // reducible — recedes to gray
  [0.8, 0.42, 0.02], //  cyclic — amber
  [0.1, 0.25, 0.6], //   full symmetric — deep blue
];

/**
 * Color by Galois group of the root's polynomial over ℚ. Exact throughout
 * (integer disc below 2⁵³ — conventions.md):
 *
 *   degree 2 — ["reducible", "C₂"]: irreducible quadratics all have
 *     group C₂ (real or complex field alike).
 *   degree 3 — ["reducible", "C₃", "S₃"]: an irreducible cubic has group
 *     C₃ iff disc is a perfect square (then necessarily disc > 0, the
 *     totally-real case), else S₃. disc = 0 forces a repeated — hence
 *     rational — root, so it lands in "reducible" via row.irreducible.
 *
 * The "reducible" class is part of the declared domain: pair with
 * irreducibleOnly if you don't want it drawn, and it never appears.
 */
export function byGaloisGroup(degree: 2 | 3, palette?: readonly Rgb[]): ColoringRule {
  if (degree === 2) {
    return byClass({
      classes: ["reducible", "C₂"],
      palette: palette ?? [GALOIS_PALETTE[0], GALOIS_PALETTE[2]],
      classify: (row) => (row.irreducible ? 1 : 0),
    });
  }
  return byClass({
    classes: ["reducible", "C₃", "S₃"],
    palette: palette ?? GALOIS_PALETTE,
    classify: (row) => (row.irreducible ? (isPerfectSquare(row.disc) ? 1 : 2) : 0),
  });
}

/** Color by the sign of the discriminant — degree-generic root-type
 *  classes (deg 2: real pair / double / complex pair; deg 3: three real /
 *  repeated / one real + pair). */
export function byDiscSign(palette?: readonly Rgb[]): ColoringRule {
  return byClass({
    classes: ["Δ > 0", "Δ = 0", "Δ < 0"],
    palette: palette ?? GALOIS_PALETTE,
    classify: (row) => (row.disc > 0 ? 0 : row.disc === 0 ? 1 : 2),
  });
}

/** Color by naive height (declared domain, log by default — heights span
 *  orders of magnitude). */
export function byHeight(
  domain: readonly [number, number],
  ramp: Ramp = lerpRamp([0.85, 0.85, 0.85], [0.05, 0.05, 0.05]),
): ColoringRule {
  return byScalar({ label: "height", of: (row) => row.height, domain, transform: "log", ramp });
}

/** Color by leading coefficient — depth, for the full lattice families. */
export function byLead(
  domain: readonly [number, number],
  ramp: Ramp = lerpRamp([0.85, 0.85, 0.85], [0.05, 0.05, 0.05]),
): ColoringRule {
  return byScalar({ label: "leading coefficient", of: (row) => row.lead, domain, transform: "log", ramp });
}
