/**
 * The explorer application, parameterized by family. Demos are thin
 * entries: each calls startExplorer with its family; everything else
 * (camera, worker streaming, GL disks, HUD) is shared here.
 */
import { type Camera, pan, zoomAt } from "./camera.ts";
import { createDiskRenderer, FLOATS_PER_INSTANCE } from "./gl/disks.ts";
import type { LiveFamily } from "./protocol.ts";
import { createRenderService } from "./renderService.ts";

const FAMILY_LABEL: Record<LiveFamily, string> = {
  quadratic: "integer quadratics",
  monicCubic: "monic cubics (irreducible, disc¼)",
};

export function startExplorer(family: LiveFamily): void {
  const canvas = document.getElementById("view") as HTMLCanvasElement;
  const hud = document.getElementById("hud") as HTMLDivElement;
  const gl = canvas.getContext("webgl2");
  if (!gl) throw new Error("WebGL2 unavailable");

  const STYLE = { sizeScale: 0.035, radiusCap: 0.5 };
  const renderer = createDiskRenderer(gl, { radiusCap: STYLE.radiusCap });
  let camera: Camera = { centerRe: 0, centerIm: 1.1, height: 2.6 };

  let repaint = true;   // GL redraw wanted (camera moved or data arrived)
  let research = true;  // view changed: ask the worker for a fresh picture
  let status = "computing…";

  const service = createRenderService(STYLE, {
    onChunk(instances, count, first, anchorRe, anchorIm) {
      if (count * FLOATS_PER_INSTANCE > instances.length) {
        throw new Error("chunk shorter than its count");
      }
      if (first) renderer.begin(anchorRe, anchorIm); // swap to the new view's data
      renderer.append(instances, count);
      repaint = true;
    },
    onDone({ polynomials, population, ms }) {
      status = `${population} · ${polynomials} polys · ${ms.toFixed(0)} ms`;
      repaint = true;
    },
  });

  // --- Interactions ---------------------------------------------------------
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
      service.request(camera, canvas.clientWidth, canvas.clientHeight, family);
    }
    if (repaint) {
      repaint = false;
      renderer.draw(camera, canvas.clientWidth, canvas.clientHeight);
      const overflow = renderer.dropped > 0
        ? ` · ⚠ ${renderer.dropped} dropped (instance buffer full)`
        : "";
      hud.textContent =
        `${FAMILY_LABEL[family]} · ${renderer.count} roots · ${status} · ` +
        `center ${camera.centerRe.toFixed(6)} + ${camera.centerIm.toFixed(6)}i · ` +
        `height ${camera.height.toExponential(2)}${overflow}`;
    }
    requestAnimationFrame(frame);
  }
  frame();
}
