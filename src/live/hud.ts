/**
 * The HUD readout line: title, live counts, the population's frozen
 * provenance, the camera, and the instance-overflow warning. One format,
 * so every demo's HUD reads the same.
 */
import type { Camera } from "./camera.ts";

export function hudReadout(opts: {
  title: string;
  count: number;
  status: string;
  camera: Camera;
  dropped: number;
}): string {
  const overflow = opts.dropped > 0
    ? ` · ⚠ ${opts.dropped} dropped (instance buffer full)`
    : "";
  return (
    `${opts.title} · ${opts.count} roots · ${opts.status} · ` +
    `center ${opts.camera.centerRe.toFixed(6)} + ${opts.camera.centerIm.toFixed(6)}i · ` +
    `height ${opts.camera.height.toExponential(2)}${overflow}`
  );
}
