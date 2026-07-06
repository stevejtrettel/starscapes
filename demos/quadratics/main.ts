/**
 * The integer-quadratics explorer, as one sentence: Φ_cone at the derived
 * visibility depth, the classic hyperbolic law at the E9 constant-ink zoom
 * scale, upper-half-plane roots in the house ink.
 */
import { constantInkScaleQuadratic, viewConeQuadratics, visibleDepthQuadratics } from "../../src/core/search/cone.ts";
import { classic } from "../../src/core/sizing.ts";
import { explore } from "../../src/live/explore.ts";

const HOME = { centerRe: 0, centerIm: 1.1, height: 2.6 };

explore({
  title: "integer quadratics",
  home: HOME,
  radiusCap: 0.5,
  spawn: () => new Worker(new URL("./main.ts", import.meta.url), { type: "module" }),
  picture(view) {
    const c = constantInkScaleQuadratic(0.035, view.height, HOME.height); // E9: constant ink
    const law = classic(c, { cap: 0.5 }); // the E8-validated look, (γ, δ) = (1, 1)
    return {
      collection: viewConeQuadratics({
        window: view.window,
        aMax: visibleDepthQuadratics(c, view.worldPerPixel), // live-sampling.md §2
        pad: c / 2, // escape pad = the biggest dot (a = 1)
      }),
      draw(poly, dot) {
        for (const root of poly.roots) {
          if (root.im <= 0) continue; // one of each conjugate pair
          dot(root, law.size(root), 0.05, 0.05, 0.05);
        }
      },
    };
  },
});
