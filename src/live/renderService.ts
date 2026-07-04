/**
 * Main-thread client of the render worker: one call per view change, a
 * generation counter to identify the current picture, callbacks for chunks
 * and completion. Stale messages (older generations) are dropped here so
 * consumers never see them.
 */
import type { Camera } from "./camera.ts";
import type { RenderRequest, WorkerMessage } from "./protocol.ts";

export interface RenderCallbacks {
  /** First chunk of a generation arrives with `first: true` — swap buffers then. */
  onChunk(instances: Float32Array, count: number, first: boolean): void;
  onDone(stats: { polynomials: number; aReached: number; inkFraction: number; ms: number }): void;
}

export interface RenderService {
  request(camera: Camera, viewportW: number, viewportH: number): void;
}

export function createRenderService(
  style: { sizeScale: number; radiusCap: number; inkBudget: number },
  callbacks: RenderCallbacks,
): RenderService {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  let generation = 0;
  let seenFirstOf = 0;

  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;
    if (msg.generation !== generation) return; // stale job, drop
    if (msg.type === "chunk") {
      const first = seenFirstOf !== generation;
      seenFirstOf = generation;
      callbacks.onChunk(msg.instances, msg.count, first);
    } else {
      callbacks.onDone({
        polynomials: msg.polynomials,
        aReached: msg.aReached,
        inkFraction: msg.inkFraction,
        ms: msg.ms,
      });
    }
  };

  return {
    request(camera, viewportW, viewportH) {
      generation++;
      const req: RenderRequest = {
        type: "render",
        generation,
        view: { centerRe: camera.centerRe, centerIm: camera.centerIm, height: camera.height },
        viewportW,
        viewportH,
        style,
      };
      worker.postMessage(req);
    },
  };
}
