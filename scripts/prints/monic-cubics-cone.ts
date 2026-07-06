/**
 * The monic cubic starscape, uniformly viewed: the classic frame drawn from
 * the backward view-cone strategy Φ₃ᵐᵒⁿ(W, ρ) — every monic integer cubic
 * with a complex root in the window and real root within ρ of it
 * (docs/monic-cubic-sampling.md; E13) — through the shared print pipeline.
 * Irreducible only, UHP pairs. No box, hence no nebulae; no saturation by
 * theorem. DUST_R multiplies the visibility cutoff for print texture
 * (population ∝ ρ³ makes dust cheap — labeled aesthetic dial).
 * Usage: node monic-cubics-cone.ts [DUST_R] [c] [disc|fprime|disc4] [W] [H]
 * Sizing laws (q = √|disc|/2y = f′(r)): disc = hyperbolic c/√|disc|
 * (steep, vertically even); fprime = c·y/|f′(z)| (vivid, top-heavy);
 * disc4 = c/|disc|^¼ — the geometric mean: harmonic in depth AND
 * vertically even (the uniformity locus, doc §7).
 */

import { solid } from "../../src/core/coloring.ts";
import { viewConeMonicCubics } from "../../src/core/search/coneMonicCubic.ts";
import { classic, discLaw, type SizingRule } from "../../src/core/sizing.ts";
import { irreducibleOnly, type Style, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

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

const style: Style = {
  sizing: laws[SIZING],
  coloring: solid(0.05, 0.05, 0.05),
};

// The reach derivation holds for the disc¼ / uniform law; the disc and
// fprime comparisons draw their laws over that reference population —
// explicit via deriveFrom, matching what the comparison prints always did.
const search = viewConeMonicCubics({
  dustR: DUST_R,
  deriveFrom: laws.disc4,
});

console.log(`monic-cubics-cone: ${W_PX}x${H_PX}px, c = ${C_SZ}, ${SIZING}, R = ${DUST_R}`);
const t0 = performance.now();

const result = renderPrint({
  search,
  filters: [upperHalfPlane, irreducibleOnly],
  style,
  view: { center: [0, 1.0], height: 2.4 },
  image: { width: W_PX, height: H_PX, compositing: "opaque" },
});

const tRender = performance.now();
console.log(
  `  ${result.stats.population} — ${result.stats.polynomials} candidates, ` +
  `${result.stats.drawn} drawn — ${((tRender - t0) / 1000).toFixed(1)} s`,
);

const out = `outputs/monic-cubics-cone-${DUST_R}-${C_SZ}-${SIZING}-${W_PX}x${H_PX}.png`;
writePng(out, result.rgb, W_PX, H_PX);
console.log(`  written — ${((performance.now() - tRender) / 1000).toFixed(1)} s → ${out}`);
