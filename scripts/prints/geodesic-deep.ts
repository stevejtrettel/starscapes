/**
 * High-quality offline render of the geodesic window from the live
 * explorer — the same picture law (zoom-adaptive scale c(h), E9), resolved
 * at PRINT depth: the visibility law with print pixels gives ~5× the live
 * march depth, so the sub-pixel dust of the live view becomes resolved
 * tiny dots and the existence halos tighten by the same factor
 * (distance ≥ 1/2A). View-cone population at the print depth, everything
 * drawn, opaque compositing, 2× supersampling.
 */

import { constantInkScaleQuadratic, viewConeQuadratics, visibleDepthQuadratics } from "../../src/core/search/cone.ts";
import { classic } from "../../src/core/sizing.ts";
import { print } from "../../src/pipeline/print.ts";

const VIEW = { center: [0.6, 0.8] as const, height: 0.15 };
const SIZE = 3600; // square print, px
const C0 = 0.035;
const HOME_HEIGHT = 2.6;

const cEff = constantInkScaleQuadratic(C0, VIEW.height, HOME_HEIGHT); // the live picture's scale at this window
const law = classic(cEff);

console.log(`geodesic-deep: ${SIZE}px, c = ${cEff.toFixed(4)}`);
print("geodesic-deep", {
  view: VIEW,
  image: { width: SIZE, compositing: "opaque" },
  picture: (view) => ({
    collection: viewConeQuadratics({
      window: view.window,
      aMax: visibleDepthQuadratics(cEff, view.worldPerPixel),
      pad: cEff / 2,
    }),
    draw(poly, dot) {
      for (const root of poly.roots) {
        if (root.im <= 0) continue;
        dot(root, law.size(root), 0.05, 0.05, 0.05);
      }
    },
  }),
});
