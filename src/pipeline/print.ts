/**
 * The print harness: the script surface over the pure renderer (render.ts).
 * Owns the clock, the stats line (with Φ's frozen provenance), the derived
 * legend, and the outputs/ path — a print script is argv parsing, a
 * Picture, and one call. Sweeps and comparisons stay ordinary script code
 * in the caller; scripts wanting raw buffers use render() directly.
 */
import type { Picture } from "../core/scene.ts";
import { writePng } from "../offline/png.ts";
import { type ImageSpec, type RenderResult, render, type View } from "./render.ts";

export interface PrintSpec {
  view: View;
  image: ImageSpec;
  picture: Picture;
}

export function print(name: string, spec: PrintSpec): RenderResult & { path: string } {
  const t0 = performance.now();
  const result = render(spec.view, spec.image, spec.picture);
  const tRender = performance.now();
  const path = `outputs/${name}.png`;
  writePng(path, result.rgb, result.width, result.height);
  const tWrite = performance.now();

  if (result.legend !== undefined) console.log(`  legend: ${result.legend}`);
  const { polynomials, roots, drawn, population } = result.stats;
  console.log(
    `  ${population} — ${polynomials} polynomials, ${roots} roots, ${drawn} drawn — ` +
      `${((tRender - t0) / 1000).toFixed(1)} s render, ` +
      `${((tWrite - tRender) / 1000).toFixed(1)} s write → ${path}`,
  );
  return { ...result, path };
}
