/**
 * High-quality offline render of the geodesic window from the live
 * explorer — the same picture law (zoom-adaptive scale c(h), E9), resolved
 * at PRINT depth: the visibility law with print pixels gives ~5× the live
 * march depth, so the sub-pixel dust of the live view becomes resolved
 * tiny dots and the existence halos tighten by the same factor
 * (distance ≥ 1/2A). View-cone population (the strategy derives the print
 * depth from the classic law and the print's worldPerPixel), everything
 * drawn, opaque compositing, 2× supersampling.
 */
import { constantInkScaleQuadratic, viewConeQuadratics } from "../../src/core/search/cone.ts";
import { classic } from "../../src/core/sizing.ts";
import { solid, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { renderPrint } from "../../src/pipeline/print.ts";

const VIEW = { center: [0.6, 0.8] as const, height: 0.15 };
const SIZE = 3600; // square print, px
const C0 = 0.035;
const HOME_HEIGHT = 2.6;

const cEff = constantInkScaleQuadratic(C0, VIEW.height, HOME_HEIGHT); // the live picture's scale at this window

console.log(`geodesic-deep: ${SIZE}px, c = ${cEff.toFixed(4)}`);
const t0 = performance.now();

const result = renderPrint({
  search: viewConeQuadratics(),
  filters: [upperHalfPlane],
  style: { sizing: classic(cEff), color: solid(0.05, 0.05, 0.05) },
  view: VIEW,
  image: { width: SIZE, compositing: "opaque" },
});

const tRender = performance.now();
console.log(
  `  ${result.stats.population} — ${result.stats.polynomials} polynomials, ` +
  `${result.stats.drawn} drawn — ${((tRender - t0) / 1000).toFixed(1)} s`,
);

writePng("outputs/geodesic-deep.png", result.rgb, SIZE, SIZE);
console.log(`  written — ${((performance.now() - tRender) / 1000).toFixed(1)} s → outputs/geodesic-deep.png`);
