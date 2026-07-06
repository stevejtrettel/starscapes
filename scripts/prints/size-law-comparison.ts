/**
 * Size-law comparison: the four natural candidates for the quadratic
 * starscape sizing, to match against the paper. Same data, same view;
 * only the size law varies.
 */

import { integerPolynomials } from "../../src/core/family/lattice.ts";
import { forwardBox } from "../../src/core/search/forward.ts";
import { classic, discLaw, type SizingRule } from "../../src/core/sizing.ts";
import { print } from "../../src/pipeline/print.ts";

// The world-unit laws carry cap: Infinity — their historical 0.5 WORLD cap
// was provably inert (r ≤ s/√3 ≪ 0.5), while the hyperbolic default 0.5·y
// would newly clamp them near the axis and change the comparison.
const laws: Array<{ name: string; law: SizingRule }> = [
  {
    name: "hyp-disc", // r_hyp = s/|disc| (first light) — (γ, δ) = (2, 1)
    law: discLaw({ alpha: 1, beta: 1, c: 0.06, degree: 2 }),
  },
  {
    name: "hyp-sqrtdisc", // r_hyp = s/√|disc| — classic, (γ, δ) = (1, 1)
    law: classic(0.035),
  },
  {
    name: "world-disc", // r = s/|disc| — (γ, δ) = (2, 0)
    law: discLaw({ alpha: 1, beta: 0, c: 0.06, degree: 2, cap: Infinity }),
  },
  {
    name: "world-sqrtdisc", // r = s/√|disc| — (γ, δ) = (1, 0)
    law: discLaw({ alpha: 0.5, beta: 0, c: 0.035, degree: 2, cap: Infinity }),
  },
];

for (const { name, law } of laws) {
  console.log(`size-law-${name}:`);
  print(`size-law-${name}`, {
    view: { center: [0, 1.1], height: 2.6 },
    image: { width: 900, compositing: "opaque" },
    picture: () => ({
      collection: forwardBox(integerPolynomials({ degree: 2 }), 40),
      draw(poly, dot) {
        for (const root of poly.roots) {
          if (root.im <= 0) continue;
          dot(root, law.size(root), 0.05, 0.05, 0.05);
        }
      },
    }),
  });
}
