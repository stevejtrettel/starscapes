/**
 * First cubic picture: integer cubics in a box, upper-half-plane roots,
 * √|disc| hyperbolic sizing. Zero engine changes from the quadratic print —
 * the degree-generality check.
 */

import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { forwardBox } from "../../src/core/search/forward.ts";
import { discLaw } from "../../src/core/sizing.ts";
import { print } from "../../src/pipeline/print.ts";

// c·y/√|disc| — the steep (γ, δ) = (2, 2) point at degree 3 (sizing.ts).
const law = discLaw({ alpha: 0.5, beta: 1, c: 0.05, degree: 3 });

console.log("cubics:");
print("cubics", {
  view: { center: [0, 1.0], height: 2.4 },
  image: { width: 1400, compositing: "opaque" },
  picture: () => ({
    collection: forwardBox(integerPolynomials({ degree: 3 }), 10),
    draw(poly, dot) {
      for (const root of poly.roots) {
        if (root.im <= 0) continue;
        dot(root, law.size(root), 0.05, 0.05, 0.05);
      }
    },
  }),
});
