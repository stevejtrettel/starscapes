/**
 * The explorer: camera + GL disks on the main thread, backward sampler in
 * the render worker. Every view change requests a fresh render; old dots
 * stay on screen (re-projected by the vertex shader) until the new view's
 * first chunk arrives, so motion never blanks. Zoom depth is derived in the
 * worker from the view — zooming summons more mathematics.
 */
import { type Camera, pan, zoomAt } from "./camera.ts";
import { createDiskRenderer, FLOATS_PER_INSTANCE } from "./gl/disks.ts";
import { createRenderService } from "./renderService.ts";

const canvas = document.getElementById("view") as HTMLCanvasElement;
const hud = document.getElementById("hud") as HTMLDivElement;
const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL2 unavailable");

const STYLE = { sizeScale: 0.035, radiusCap: 0.5, inkBudget: 0.25 };
const renderer = createDiskRenderer(gl, { radiusCap: STYLE.radiusCap });
let camera: Camera = { centerRe: 0, centerIm: 1.1, height: 2.6 };

let repaint = true;   // GL redraw wanted (camera moved or data arrived)
let research = true;  // view changed: ask the worker for a fresh picture
let status = "computing…";

const service = createRenderService(STYLE, {
  onChunk(instances, count, first) {
    if (first) renderer.begin(); // swap to the new view's data
    renderer.append(instances, count);
    if (count * FLOATS_PER_INSTANCE > instances.length) {
      throw new Error("chunk shorter than its count");
    }
    repaint = true;
  },
  onDone({ polynomials, aReached, inkFraction, ms }) {
    status =
      `${polynomials} polys · depth a ≤ ${aReached} · ` +
      `ink ${(100 * inkFraction).toFixed(0)}% · ${ms.toFixed(0)} ms`;
    repaint = true;
  },
});

// --- Interactions -----------------------------------------------------------
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
  repaint = true;
  research = true;
});
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const factor = Math.exp(-e.deltaY * 0.0015);
  camera = zoomAt(
    camera, factor, e.offsetX, e.offsetY,
    canvas.clientWidth, canvas.clientHeight,
  );
  repaint = true;
  research = true;
}, { passive: false });

// --- Frame loop -------------------------------------------------------------
function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    repaint = true;
    research = true;
  }
}

function frame(): void {
  resize();
  if (research) {
    research = false;
    status = "computing…";
    service.request(camera, canvas.clientWidth, canvas.clientHeight);
  }
  if (repaint) {
    repaint = false;
    renderer.draw(camera, canvas.clientWidth, canvas.clientHeight);
    hud.textContent =
      `integer quadratics · view-cone · ${renderer.count} roots · ${status} · ` +
      `center ${camera.centerRe.toFixed(6)} + ${camera.centerIm.toFixed(6)}i · ` +
      `height ${camera.height.toExponential(2)}`;
  }
  requestAnimationFrame(frame);
}
frame();
