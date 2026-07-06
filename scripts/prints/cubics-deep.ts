/**
 * High-resolution cubic starscape: the classic full frame via forward box
 * search (view-blind is right when the view is the whole frame), at print
 * scale. Integer cubics ax³ + bx² + cx + d, upper-half-plane roots,
 * √|disc| hyperbolic sizing, opaque compositing — with and without the
 * irreducible cut.
 */

import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { forwardBox } from "../../src/core/search/forward.ts";
import { discLaw } from "../../src/core/sizing.ts";
import { print } from "../../src/pipeline/print.ts";

const BOUND = 30; // 30 · 61³ ≈ 6.8M cubics
const SIZE = 3600;

// c·y/√|disc| — the steep (γ, δ) = (2, 2) point at degree 3 (sizing.ts).
const law = discLaw({ alpha: 0.5, beta: 1, c: 0.03, degree: 3 });

for (const irreducibleCut of [false, true]) {
  const name = irreducibleCut ? "irreducible" : "all";
  console.log(`cubics-deep (${name}):`);
  print(`cubics-deep-${name}`, {
    view: { center: [0, 1.0], height: 2.4 },
    image: { width: SIZE, compositing: "opaque" },
    picture: () => ({
      collection: forwardBox(integerPolynomials({ degree: 3 }), BOUND),
      draw(poly, dot) {
        if (irreducibleCut && !poly.irreducible) return;
        for (const root of poly.roots) {
          if (root.im <= 0) continue;
          dot(root, law.size(root), 0.05, 0.05, 0.05);
        }
      },
    }),
  });
}
