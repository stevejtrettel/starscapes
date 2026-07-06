/**
 * `explore(...)`: the standard live demo as one function over the public
 * parts — runRenderLoop (worker half), createDiskRenderer,
 * createRenderService, attachPanZoom, hudReadout. PARTS CONTRACT
 * (conventions.md): explore may only contain code a demo could paste —
 * anything irreplaceable moves down into a part. A demo that wants sliders
 * or its own layout composes the parts directly instead (the law-browser
 * demo is the standing proof).
 *
 * A demo is ONE module imported by both contexts: its top-level explore()
 * call branches here — in the worker it runs the render loop; on the main
 * thread it spawns the same module as its worker via the demo's `spawn`
 * factory (the Vite-static `new Worker(new URL("./main.ts",
 * import.meta.url), { type: "module" })`).
 */
import type { Camera } from "./camera.ts";
import { createDiskRenderer, FLOATS_PER_INSTANCE } from "./gl/disks.ts";
import { hudReadout } from "./hud.ts";
import { attachPanZoom } from "./panZoom.ts";
import { createRenderService } from "./renderService.ts";
import { type LivePicture, runRenderLoop } from "./runRenderLoop.ts";

export interface ExploreOptions {
  title: string;
  home: Camera;
  picture: LivePicture;
  /** The demo's self-spawning worker factory (see file comment). */
  spawn: () => Worker;
  /** GL depth normalization for opaque size-ordering (disks.ts) — the
   *  sizing laws own their own caps; this only scales radius → depth. */
  radiusCap?: number;
}

export function explore(opts: ExploreOptions): void {
  if (typeof document === "undefined") {
    // Worker context: the demo module was spawned as its own worker.
    runRenderLoop(opts.picture);
    return;
  }

  const canvas = document.getElementById("view") as HTMLCanvasElement;
  const hud = document.getElementById("hud") as HTMLDivElement;
  const gl = canvas.getContext("webgl2");
  if (!gl) throw new Error("WebGL2 unavailable");

  const renderer = createDiskRenderer(gl, { radiusCap: opts.radiusCap ?? 0.5 });
  let camera: Camera = opts.home;

  let repaint = true;   // GL redraw wanted (camera moved or data arrived)
  let research = true;  // view changed: ask the worker for a fresh picture
  let status = "computing…";

  const service = createRenderService(opts.spawn, {
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

  attachPanZoom(canvas, () => camera, (next) => {
    camera = next;
    repaint = true;
    research = true;
  });

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
      hud.textContent = hudReadout({
        title: opts.title,
        count: renderer.count,
        status,
        camera,
        dropped: renderer.dropped,
      });
    }
    requestAnimationFrame(frame);
  }
  frame();
}
