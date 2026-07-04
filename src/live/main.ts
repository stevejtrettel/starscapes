/**
 * Explorer skeleton (phase 3, chunk 1): camera + GL disks + interactions,
 * fed by a small main-thread forward render so the plumbing is visible and
 * feelable. Chunk 2 replaces the data source with the worker-hosted
 * backward sampler; this wiring stays.
 */
import { integerPolynomials } from "../core/family/lattice.ts";
import { discriminant } from "../core/invariants.ts";
import { box, enumerateBox } from "../core/search/forward.ts";
import { solveQuadraticBatch } from "../core/solve/quadratic.ts";
import { allocRootSlots } from "../core/solve/types.ts";
import { type Camera, pan, zoomAt } from "./camera.ts";
import { createDiskRenderer, FLOATS_PER_INSTANCE } from "./gl/disks.ts";

const canvas = document.getElementById("view") as HTMLCanvasElement;
const hud = document.getElementById("hud") as HTMLDivElement;
const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL2 unavailable");

const renderer = createDiskRenderer(gl);
let camera: Camera = { centerRe: 0, centerIm: 1.1, height: 2.6 };

// --- Placeholder data source: box(15) quadratics on the main thread ------
const SIZE_SCALE = 0.035;
const RADIUS_CAP = 0.5;
{
  const family = integerPolynomials({ degree: 2 });
  const chunk = new Float32Array(4096 * 2 * FLOATS_PER_INSTANCE);
  const slots = allocRootSlots(4096, 2);
  renderer.begin();
  enumerateBox(family, box(15), (coeffs, count) => {
    solveQuadraticBatch(coeffs, count, slots);
    let n = 0;
    for (let i = 0; i < count; i++) {
      const disc = discriminant(coeffs, i * 3, 2);
      if (disc >= 0) continue; // upper-half-plane picture: complex pairs only
      const im = slots.im[i * 2]; // UHP member is first
      const rHyp = Math.min(RADIUS_CAP, SIZE_SCALE / Math.sqrt(-disc));
      const o = n * FLOATS_PER_INSTANCE;
      chunk[o] = slots.re[i * 2];
      chunk[o + 1] = im;
      chunk[o + 2] = rHyp * im; // hyperbolic units → world radius
      chunk[o + 3] = 0.05;
      chunk[o + 4] = 0.05;
      chunk[o + 5] = 0.05;
      n++;
    }
    renderer.append(chunk, n);
  });
}

// --- Interactions ----------------------------------------------------------
let dirty = true;
let dragging = false;

canvas.addEventListener("mousedown", () => {
  dragging = true;
});
window.addEventListener("mouseup", () => {
  dragging = false;
});
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  camera = pan(camera, e.movementX, e.movementY, canvas.clientHeight);
  dirty = true;
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const factor = Math.exp(-e.deltaY * 0.0015);
  camera = zoomAt(
    camera, factor, e.offsetX, e.offsetY,
    canvas.clientWidth, canvas.clientHeight,
  );
  dirty = true;
}, { passive: false });

// --- Frame loop -------------------------------------------------------------
function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    dirty = true;
  }
}

function frame(): void {
  resize();
  if (dirty) {
    dirty = false;
    renderer.draw(camera, canvas.clientWidth, canvas.clientHeight);
    hud.textContent =
      `integer quadratics · box(15) placeholder · ${renderer.count} roots · ` +
      `center ${camera.centerRe.toFixed(4)} + ${camera.centerIm.toFixed(4)}i · ` +
      `height ${camera.height.toExponential(2)}`;
  }
  requestAnimationFrame(frame);
}
frame();
