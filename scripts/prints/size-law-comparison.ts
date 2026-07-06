/**
 * Size-law comparison: the four natural candidates for the quadratic
 * starscape sizing, to match against the paper. Same data, same view;
 * only the size law varies.
 */
import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { box } from "../../src/core/search/forward.ts";
import { type Style, solid, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

const laws: Array<{ name: string; style: Style }> = [
  {
    name: "hyp-disc", // r_hyp = s/|disc|  (first light)
    style: {
      sizeUnits: "hyperbolic",
      size: (r) => Math.min(0.5, 0.06 / Math.abs(r.disc)),
      color: solid(0.05, 0.05, 0.05),
    },
  },
  {
    name: "hyp-sqrtdisc", // r_hyp = s/√|disc|  (= s/|f'(root)| up to |a|)
    style: {
      sizeUnits: "hyperbolic",
      size: (r) => Math.min(0.5, 0.035 / Math.sqrt(Math.abs(r.disc))),
      color: solid(0.05, 0.05, 0.05),
    },
  },
  {
    name: "world-disc", // r = s/|disc|
    style: {
      sizeUnits: "world",
      size: (r) => Math.min(0.5, 0.06 / Math.abs(r.disc)),
      color: solid(0.05, 0.05, 0.05),
    },
  },
  {
    name: "world-sqrtdisc", // r = s/√|disc|
    style: {
      sizeUnits: "world",
      size: (r) => Math.min(0.5, 0.035 / Math.sqrt(Math.abs(r.disc))),
      color: solid(0.05, 0.05, 0.05),
    },
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
