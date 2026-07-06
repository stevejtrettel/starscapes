/**
 * The render worker's half of a live demo: on each request, build the
 * ViewInfo, call the demo's picture, then collect → solve → draw → ship
 * anchor-relative instance chunks. Jobs run to completion: the constant-ink
 * law holds populations flat (~tens of thousands of dots at every zoom), so
 * every job is milliseconds-scale and supersession between jobs is all the
 * cancellation the instrument needs.
 */
import { drawBatch } from "../core/drawPass.ts";
import type { Scene, ViewInfo } from "../core/scene.ts";
import { solveCubicBatch } from "../core/solve/cubic.ts";
import { solveQuadraticBatch } from "../core/solve/quadratic.ts";
import { allocRootSlots } from "../core/solve/types.ts";
import type { ChunkMessage, DoneMessage, RenderRequest } from "./protocol.ts";

/** A live picture may read demo params (plain data crossing the protocol);
 *  a params-less Picture fits — the extra argument is simply unread. */
export type LivePicture = (view: ViewInfo, params: unknown) => Scene;

export function runRenderLoop(picture: LivePicture): void {
  let pending: RenderRequest | null = null;
  let running = false;

  self.onmessage = (e: MessageEvent<RenderRequest>) => {
    pending = e.data;
    if (!running) run();
  };

  function run(): void {
    running = true;
    while (pending) {
      const job = pending;
      pending = null;
      renderJob(job);
    }
    running = false;
  }

  function renderJob(job: RenderRequest): void {
    const t0 = performance.now();
    const { view } = job;
    // Instance positions are RELATIVE to the view center (protocol.ts): an
    // absolute float32 coordinate quantizes at ~|z|·6e-8, visible jitter at
    // deep zoom; the offset survives the cast because it is window-sized.
    const anchorRe = view.centerRe;
    const anchorIm = view.centerIm;

    const worldW = view.height * (job.viewportW / job.viewportH);
    const scene = picture(
      {
        window: {
          left: view.centerRe - worldW / 2,
          top: view.centerIm + view.height / 2,
          worldW,
          worldH: view.height,
        },
        worldPerPixel: view.height / job.viewportH,
        height: view.height,
      },
      job.params,
    );

    const degree = scene.collection.family.degree;
    const slots = allocRootSlots(4096, degree);
    const solve =
      degree === 2 ? solveQuadraticBatch : degree === 3 ? solveCubicBatch : undefined;
    if (!solve) throw new Error(`no solver for degree ${degree} yet`);

    const polynomials = scene.collection.collect((coeffs, count) => {
      solve(coeffs, count, slots);
      // Sized for one dot per polynomial (the standard UHP pictures); a
      // sentence emitting more just flushes mid-batch and keeps going.
      let instances = new Float32Array(count * 6);
      let n = 0;
      const flush = (): void => {
        if (n === 0) return;
        const msg: ChunkMessage = {
          type: "chunk",
          generation: job.generation,
          instances: instances.subarray(0, n * 6),
          count: n,
        };
        self.postMessage(msg, { transfer: [instances.buffer] });
        instances = new Float32Array(count * 6);
        n = 0;
      };
      drawBatch(coeffs, count, degree, slots, scene.draw, (re, im, rWorld, r, g, b) => {
        if (n * 6 === instances.length) flush();
        const o = n * 6;
        instances[o] = re - anchorRe;
        instances[o + 1] = im - anchorIm;
        instances[o + 2] = rWorld;
        instances[o + 3] = r;
        instances[o + 4] = g;
        instances[o + 5] = b;
        n++;
      });
      flush();
    });

    const done: DoneMessage = {
      type: "done",
      generation: job.generation,
      polynomials,
      population: scene.collection.describe(),
      ms: performance.now() - t0,
    };
    self.postMessage(done);
  }
}
