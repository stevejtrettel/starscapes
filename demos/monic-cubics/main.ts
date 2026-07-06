/**
 * The monic-cubics explorer, as one sentence: Φ₃ᵐᵒⁿ at the derived
 * visibility reach, the disc¼ uniformity-locus law at its constant-ink zoom
 * scale (the fifth-root analogue of the quadratic cube root,
 * monic-cubic-sampling.md §7.3), irreducible only, upper-half-plane pairs.
 */
import {
  constantInkScaleMonicCubic,
  viewConeMonicCubics,
  visibleReachMonicCubics,
} from "../../src/core/search/coneMonicCubic.ts";
import { discLaw } from "../../src/core/sizing.ts";
import { explore } from "../../src/live/explore.ts";

const HOME = { centerRe: 0, centerIm: 1.1, height: 2.6 };

explore({
  title: "monic cubics (irreducible, disc¼)",
  home: HOME,
  radiusCap: 0.5,
  spawn: () => new Worker(new URL("./main.ts", import.meta.url), { type: "module" }),
  picture(view) {
    const c = constantInkScaleMonicCubic(0.035, view.height, HOME.height); // §7.3: constant ink
    const law = discLaw({ alpha: 0.25, beta: 0, c, degree: 3, cap: 0.5 }); // the uniformity locus
    return {
      collection: viewConeMonicCubics({
        window: view.window,
        rho: visibleReachMonicCubics(c, view.worldPerPixel), // monic-cubic-sampling.md §3
        pad: c, // generous vs the largest escaping dot (labeled heuristic)
      }),
      draw(poly, dot) {
        if (!poly.irreducible) return; // per-poly, decided once
        for (const root of poly.roots) {
          if (root.im <= 0) continue;
          dot(root, law.size(root), 0.05, 0.05, 0.05);
        }
      },
    };
  },
});
