/**
 * E14 — Is the 0.5 hyperbolic cap doing anything? (docs/experiments.md)
 * The two canonical cone frames, cap = 0.5 vs cap = ∞, everything else
 * identical; reports changed-pixel counts and writes both images per pair.
 * Usage: node cap-off.ts [W_PX]
 */
import { viewConeQuadratics } from "../../src/core/search/cone.ts";
import { viewConeMonicCubics } from "../../src/core/search/coneMonicCubic.ts";
import { classic, discLaw } from "../../src/core/sizing.ts";
import { irreducibleOnly, type RootFilter, type Style, solid, upperHalfPlane } from "../../src/core/style.ts";
import { writePng } from "../../src/offline/png.ts";
import { type PrintSpec, renderPrint } from "../../src/pipeline/print.ts";

const W_PX = Number(process.argv[2] ?? 1600);
const INK = solid(0.05, 0.05, 0.05);

function changedPixels(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 0; i < a.length; i += 3) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
  }
  return n;
}

interface Case {
  name: string;
  /** Style at the given cap (∞ = cap off). */
  styleAt(cap: number): Style;
  search: PrintSpec["search"];
  filters: RootFilter[];
  view: PrintSpec["view"];
}

const CASES: Case[] = [
  {
    name: "quad-classic-0.035",
    styleAt: (cap) => ({ sizing: classic(0.035, { cap }), color: INK }),
    search: viewConeQuadratics(),
    filters: [upperHalfPlane],
    view: { center: [0, 1.1], height: 2.6 },
  },
  {
    name: "cubic-disc4-0.03",
    styleAt: (cap) => ({
      sizing: discLaw({ alpha: 0.25, beta: 0, c: 0.03, degree: 3, cap }),
      color: INK,
    }),
    search: viewConeMonicCubics({ dustR: 4 }),
    filters: [upperHalfPlane, irreducibleOnly],
    view: { center: [0, 1.0], height: 2.4 },
  },
];

for (const c of CASES) {
  const images: Record<string, Uint8ClampedArray> = {};
  for (const [label, cap] of [["capped", 0.5], ["uncapped", Infinity]] as const) {
    const t0 = performance.now();
    const result = renderPrint({
      search: c.search,
      filters: c.filters,
      style: c.styleAt(cap),
      view: c.view,
      image: { width: W_PX, compositing: "opaque" },
    });
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
