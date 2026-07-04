/** PNG output. Node-only (pngjs + fs) — never imported from src/core or src/render. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PNG } from "pngjs";

/** Write row-major 3-byte-per-pixel RGB to a PNG file. */
export function writePng(path: string, rgb: Uint8ClampedArray, width: number, height: number): void {
  const png = new PNG({ width, height });
  for (let i = 0, n = width * height; i < n; i++) {
    png.data[i * 4] = rgb[i * 3];
    png.data[i * 4 + 1] = rgb[i * 3 + 1];
    png.data[i * 4 + 2] = rgb[i * 3 + 2];
    png.data[i * 4 + 3] = 255;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
}
