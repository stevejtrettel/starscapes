/**
 * The monic cubic starscape, uniformly viewed: the classic frame drawn from
 * the backward view-cone Φ₃ᵐᵒⁿ(W, ρ) — every monic integer cubic with a
 * complex root in the window and real root within ρ of it
 * (docs/monic-cubic-sampling.md; E13). Irreducible only, UHP pairs. No box,
 * hence no nebulae; no saturation by theorem. DUST_R multiplies the
 * visibility cutoff for print texture (population ∝ ρ³ makes dust cheap —
 * labeled aesthetic dial).
 * Usage: node monic-cubics-cone.ts [DUST_R] [c] [disc|fprime|disc4] [W] [H]
 * Sizing laws (q = √|disc|/2y = f′(r)): disc = hyperbolic c/√|disc|
 * (steep, vertically even); fprime = c·y/|f′(z)| (vivid, top-heavy);
 * disc4 = c/|disc|^¼ — the geometric mean: harmonic in depth AND
 * vertically even (the uniformity locus, doc §7). The reach derivation
 * holds for disc4, so the disc/fprime comparisons draw their laws over the
 * disc4-derived population — two visible values below, matching what the
 * comparison prints always did.
 */

import { viewConeMonicCubics, visibleReachMonicCubics } from "../../src/core/search/coneMonicCubic.ts";
import { classic, discLaw, type SizingRule } from "../../src/core/sizing.ts";
import { print } from "../../src/pipeline/print.ts";

const DUST_R = Number(process.argv[2] ?? 4);
const C_SZ = Number(process.argv[3] ?? 0.03);
const SIZING = (process.argv[4] ?? "disc") as "disc" | "fprime" | "disc4";
const W_PX = Number(process.argv[5] ?? 3600);
const H_PX = Number(process.argv[6] ?? W_PX);

/** The three laws as declared rules (sizing.ts; conversions in its doc). */
const laws: Record<typeof SIZING, SizingRule> = {
  disc: discLaw({ alpha: 0.5, beta: 1, c: C_SZ, degree: 3 }), // (γ, δ) = (2, 2), steep
  fprime: classic(C_SZ), //                                      (γ, δ) = (1, 1), vivid
  disc4: discLaw({ alpha: 0.25, beta: 0, c: C_SZ, degree: 3 }), // (1, ½), the uniformity locus
};
const law = laws[SIZING];

console.log(`monic-cubics-cone: ${W_PX}x${H_PX}px, c = ${C_SZ}, ${SIZING}, R = ${DUST_R}`);
print(`monic-cubics-cone-${DUST_R}-${C_SZ}-${SIZING}-${W_PX}x${H_PX}`, {
  view: { center: [0, 1.0], height: 2.4 },
  image: { width: W_PX, height: H_PX, compositing: "opaque" },
  picture: (view) => ({
    collection: viewConeMonicCubics({
      window: view.window,
      rho: visibleReachMonicCubics(C_SZ, view.worldPerPixel, DUST_R), // disc4-law reach
      pad: C_SZ, // generous vs the largest escaping dot (labeled heuristic)
    }),
    draw(poly, dot) {
      if (!poly.irreducible) return; // per-poly, decided once
      for (const root of poly.roots) {
        if (root.im <= 0) continue;
        dot(root, law.size(root), 0.05, 0.05, 0.05);
      }
    },
  }),
});
