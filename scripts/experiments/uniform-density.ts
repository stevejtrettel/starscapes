/**
 * Uniformity experiment: the `visual` criterion (root-space-constant tube)
 * plus adaptive march depth (aMax ∝ 1/y), against the fixed-ε baseline.
 * Prediction: the top-heavy dust gradient flattens and the near-axis
 * undersampling fills in.
 */

import { inverse, inverseQuadratics } from "../../src/core/search/inverse.ts";
import { classic } from "../../src/core/sizing.ts";
import { print } from "../../src/pipeline/print.ts";

const SIZE = 800;
const law = classic(0.035);

const search = inverse({
  aMax: 400,
  epsilon: 0.07,       // root-space scale: ε(z) = ε₀/‖(1, z, z²)‖
  criterion: "visual",
  adaptiveDepth: 9,    // march to a ≈ 9/y before the hard cap
});

console.log("uniform-visual:");
print("uniform-visual", {
  view: { center: [0, 1.1], height: 2.6 },
  image: { width: SIZE, compositing: "opaque" },
  picture: (view) => ({
    collection: inverseQuadratics(search, view.window, SIZE, SIZE),
    draw(poly, dot) {
      for (const root of poly.roots) {
        if (root.im <= 0) continue;
        dot(root, law.size(root), 0.05, 0.05, 0.05);
      }
    },
  }),
});
