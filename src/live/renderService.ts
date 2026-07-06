/**
 * Main-thread client of the render worker: one call per view change, a
 * generation counter to identify the current picture, callbacks for chunks
 * and completion. Stale messages (older generations) are dropped here so
 * consumers never see them. The worker comes from a caller-supplied SPAWN
 * FACTORY — a demo passes its own module as the worker via the literal
 * `new Worker(new URL("./main.ts", import.meta.url), { type: "module" })`,
 * the one form Vite's static analysis bundles correctly in dev AND build.
 */
import type { Camera } from "./camera.ts";
import type { RenderRequest, WorkerMessage } from "./protocol.ts";

export interface RenderCallbacks {
  /**
   * First chunk of a generation arrives with `first: true` — swap buffers
   * then. Instance positions are relative to (anchorRe, anchorIm), the
   * generation's view center (see protocol.ts).
   */
  onChunk(
    instances: Float32Array, count: number, first: boolean,
    anchorRe: number, anchorIm: number,
  ): void;
  onDone(stats: { polynomials: number; population: string; ms: number }): void;
}

export interface RenderService {
  request(camera: Camera, viewportW: number, viewportH: number, params?: unknown): void;
}

export function createRenderService(
  spawn: () => Worker,
  callbacks: RenderCallbacks,
): RenderService {
  const worker = spawn();
  let generation = 0;
  let seenFirstOf = 0;
  // The current generation's anchor (its request's view center). Stale
  // generations are dropped above the callback, so this always matches.
  let anchorRe = 0;
  let anchorIm = 0;

  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;
    if (msg.generation !== generation) return; // stale job, drop
    if (msg.type === "chunk") {
      const first = seenFirstOf !== generation;
      seenFirstOf = generation;
      callbacks.onChunk(msg.instances, msg.count, first, anchorRe, anchorIm);
    } else {
      callbacks.onDone({ polynomials: msg.polynomials, population: msg.population, ms: msg.ms });
    }
  };

  return {
    request(camera, viewportW, viewportH, params) {
      generation++;
      anchorRe = camera.centerRe;
      anchorIm = camera.centerIm;
      const req: RenderRequest = {
        type: "render",
        generation,
        view: { centerRe: camera.centerRe, centerIm: camera.centerIm, height: camera.height },
        viewportW,
        viewportH,
        ...(params !== undefined ? { params } : {}),
      };
      worker.postMessage(req);
    },
  };
}
