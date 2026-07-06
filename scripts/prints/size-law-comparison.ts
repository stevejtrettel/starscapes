/**
 * Size-law comparison: the four natural candidates for the quadratic
 * starscape sizing, to match against the paper. Same data, same view;
 * only the size law varies.
 */

import { solid } from "../../src/core/coloring.ts";
import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { box } from "../../src/core/search/forward.ts";
import { classic, discLaw } from "../../src/core/sizing.ts";
import { type Style, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

// The world-unit laws carry cap: Infinity — their historical 0.5 WORLD cap
// was provably inert (r ≤ s/√3 ≪ 0.5), while the hyperbolic default 0.5·y
// would newly clamp them near the axis and change the comparison.
const INK = solid(0.05, 0.05, 0.05);
const laws: Array<{ name: string; style: Style }> = [
  {
    name: "hyp-disc", // r_hyp = s/|disc| (first light) — (γ, δ) = (2, 1)
    style: { sizing: discLaw({ alpha: 1, beta: 1, c: 0.06, degree: 2 }), coloring: INK },
  },
  {
    name: "hyp-sqrtdisc", // r_hyp = s/√|disc| — classic, (γ, δ) = (1, 1)
    style: { sizing: classic(0.035), coloring: INK },
  },
  {
    name: "world-disc", // r = s/|disc| — (γ, δ) = (2, 0)
    style: { sizing: discLaw({ alpha: 1, beta: 0, c: 0.06, degree: 2, cap: Infinity }), coloring: INK },
  },
  {
    name: "world-sqrtdisc", // r = s/√|disc| — (γ, δ) = (1, 0)
    style: { sizing: discLaw({ alpha: 0.5, beta: 0, c: 0.035, degree: 2, cap: Infinity }), coloring: INK },
  },
];

for (const { name, style } of laws) {
  const result = renderPrint({
    family: integerPolynomials({ degree: 2 }),
    search: box(40),
    filters: [upperHalfPlane],
    style,
    view: { center: [0, 1.1], height: 2.6 },
    image: { width: 900, compositing: "opaque" },
  });
  const out = `outputs/size-law-${name}.png`;
  writePng(out, result.rgb, result.width, result.height);
  console.log(`${name}: ${result.stats.drawn} drawn → ${out}`);
}
