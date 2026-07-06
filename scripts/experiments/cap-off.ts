/**
 * E14 — Is the 0.5 hyperbolic cap doing anything? (docs/experiments.md)
 * The two canonical cone frames, cap = 0.5 vs cap = ∞, everything else
 * identical; reports changed-pixel counts and writes both images per pair.
 * Usage: node cap-off.ts [W_PX]
 */

import type { Picture } from "../../src/core/scene.ts";
import { viewConeQuadratics, visibleDepthQuadratics } from "../../src/core/search/cone.ts";
import { viewConeMonicCubics, visibleReachMonicCubics } from "../../src/core/search/coneMonicCubic.ts";
import { classic, discLaw } from "../../src/core/sizing.ts";
import { writePng } from "../../src/offline/png.ts";
import { render, type View } from "../../src/pipeline/render.ts";

const W_PX = Number(process.argv[2] ?? 1600);

function changedPixels(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < a.length; i += 3) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
  }
  return n;
}

interface Case {
  name: string;
  /** The picture at the given cap (∞ = cap off). */
  pictureAt(cap: number): Picture;
  view: View;
}

const CASES: Case[] = [
  {
    name: "quad-classic-0.035",
    view: { center: [0, 1.1], height: 2.6 },
    pictureAt: (cap) => (view) => {
      const law = classic(0.035, { cap });
      return {
        collection: viewConeQuadratics({
          window: view.window,
          aMax: visibleDepthQuadratics(0.035, view.worldPerPixel),
          pad: 0.035 / 2,
        }),
        draw(poly, dot) {
          for (const root of poly.roots) {
            if (root.im <= 0) continue;
            dot(root, law.size(root), 0.05, 0.05, 0.05);
          }
        },
      };
    },
  },
  {
    name: "cubic-disc4-0.03",
    view: { center: [0, 1.0], height: 2.4 },
    pictureAt: (cap) => (view) => {
      const law = discLaw({ alpha: 0.25, beta: 0, c: 0.03, degree: 3, cap });
      return {
        collection: viewConeMonicCubics({
          window: view.window,
          rho: visibleReachMonicCubics(0.03, view.worldPerPixel, 4),
          pad: 0.03,
        }),
        draw(poly, dot) {
          if (!poly.irreducible) return;
          for (const root of poly.roots) {
            if (root.im <= 0) continue;
            dot(root, law.size(root), 0.05, 0.05, 0.05);
          }
        },
      };
    },
  },
];

for (const c of CASES) {
  const images: Record<string, Uint8ClampedArray> = {};
  for (const [label, cap] of [["capped", 0.5], ["uncapped", Infinity]] as const) {
    const t0 = performance.now();
    const result = render(c.view, { width: W_PX, compositing: "opaque" }, c.pictureAt(cap));
    images[label] = result.rgb;
    const out = `outputs/e14-${c.name}-${label}.png`;
    writePng(out, result.rgb, result.width, result.height);
    console.log(
      `${c.name} ${label}: ${result.stats.drawn} drawn, ` +
      `${((performance.now() - t0) / 1000).toFixed(1)} s → ${out}`,
    );
  }
  const changed = changedPixels(images.capped, images.uncapped);
  console.log(
    `${c.name}: ${changed} of ${W_PX * W_PX} pixels differ ` +
    `(${((100 * changed) / (W_PX * W_PX)).toFixed(3)}%)`,
  );
}
