/**
 * First light: integer quadratics in a box — the classic test case.
 * Roots of ax² + bx + c, |a|,|b|,|c| ≤ 40, upper half plane, sized by the
 * January hyperbolic-radius law c/|disc| — the (γ, δ) = (2, 1) point,
 * steeper in depth than classic(c) — both compositing modes.
 */

import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { forwardBox } from "../../src/core/search/forward.ts";
import { discLaw } from "../../src/core/sizing.ts";
import { print } from "../../src/pipeline/print.ts";

const law = discLaw({ alpha: 1, beta: 1, c: 0.06, degree: 2 });

for (const compositing of ["opaque", "additive"] as const) {
  console.log(`first-light (${compositing}):`);
  print(`first-light-${compositing}`, {
    view: { center: [0, 1.1], height: 2.6 },
    image: { width: 1600, compositing },
    picture: () => ({
      collection: forwardBox(integerPolynomials({ degree: 2 }), 40),
      draw(poly, dot) {
        for (const root of poly.roots) {
          if (root.im <= 0) continue; // one of each conjugate pair
          dot(root, law.size(root), 0.05, 0.05, 0.05);
        }
      },
    }),
  });
}
