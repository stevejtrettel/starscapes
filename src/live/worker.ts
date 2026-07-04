/**
 * The render worker: view-cone enumeration → solve → style, marched one
 * depth level (leading coefficient) at a time, shallow → deep, under an
 * INK BUDGET: each dot's pixel area is accumulated, and the march stops
 * after the depth level that spends β · screen pixels (experiment E6).
 *
 * Properties, by construction rather than by formula: perceived weight is
 * constant at every zoom; the budget buys the most visually significant
 * dots first (depth order = size order under the hyperbolic law); depth
 * adapts to the window (near the axis, smaller dots ⇒ deeper march)
 * automatically; the population is deterministic and level-granular, so a
 * saved recipe reproduces it exactly.
 */
import { discriminant } from "../core/invariants.ts";
import { coneQuadratics } from "../core/search/cone.ts";
import { solveQuadraticBatch } from "../core/solve/quadratic.ts";
import { allocRootSlots } from "../core/solve/types.ts";
import type { ChunkMessage, DoneMessage, RenderRequest } from "./protocol.ts";

const DEPTH_GUARD = 100_000; // runaway backstop, not a cost ceiling
const LEVELS_PER_YIELD = 32;
const DOT_MIN_PX = 0.5; // matches the GL renderer's minimum-radius clamp

let pending: RenderRequest | null = null;
let running = false;

self.onmessage = (e: MessageEvent<RenderRequest>) => {
  pending = e.data;
  if (!running) void run();
};

async function run(): Promise<void> {
  running = true;
  while (pending) {
    const job = pending;
    pending = null;
    await renderJob(job);
  }
  running = false;
}

const yieldToMessages = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

async function renderJob(job: RenderRequest): Promise<void> {
  const t0 = performance.now();
  const { view, style } = job;
  const pxPerWorld = job.viewportH / view.height;
  const inkBudgetPx = style.inkBudget * job.viewportW * job.viewportH;

  // Window fattened by the largest possible dot radius (sizeScale/2 at a = 1),
  // so dots centered just outside the view still get drawn.
  const pad = style.sizeScale / 2;
  const worldW = view.height * (job.viewportW / job.viewportH);
  const window = {
    left: view.centerRe - worldW / 2 - pad,
    top: view.centerIm + view.height / 2 + pad,
    worldW: worldW + 2 * pad,
    worldH: view.height + 2 * pad,
  };

  const slots = allocRootSlots(4096, 2);
  let inkPx = 0;
  let polynomials = 0;
  let aReached = 0;

  for (let a = 1; a <= DEPTH_GUARD; a++) {
    polynomials += coneQuadratics(window, a, a, (coeffs, count) => {
      solveQuadraticBatch(coeffs, count, slots);
      const instances = new Float32Array(count * 6);
      let n = 0;
      for (let i = 0; i < count; i++) {
        const disc = discriminant(coeffs, i * 3, 2);
        if (disc >= 0) continue; // UHP picture: complex pairs only
        const im = slots.im[i * 2]; // UHP member first
        const rHyp = Math.min(style.radiusCap, style.sizeScale / Math.sqrt(-disc));
        const rWorld = rHyp * im;
        const rPx = Math.max(rWorld * pxPerWorld, DOT_MIN_PX);
        inkPx += Math.PI * rPx * rPx;
        const o = n * 6;
        instances[o] = slots.re[i * 2];
        instances[o + 1] = im;
        instances[o + 2] = rWorld;
        instances[o + 3] = 0.05;
        instances[o + 4] = 0.05;
        instances[o + 5] = 0.05;
        n++;
      }
      if (n > 0) {
        const msg: ChunkMessage = {
          type: "chunk",
          generation: job.generation,
          instances: instances.subarray(0, n * 6),
          count: n,
        };
        self.postMessage(msg, { transfer: [instances.buffer] });
      }
    });
    aReached = a;

    // Level-granular budget stop: the whole level is in, then we assess.
    if (inkPx >= inkBudgetPx) break;

    if (a % LEVELS_PER_YIELD === 0) {
      await yieldToMessages();
      if (pending) return; // a newer view superseded this job
    }
  }

  const done: DoneMessage = {
    type: "done",
    generation: job.generation,
    polynomials,
    aReached,
    inkFraction: inkPx / (job.viewportW * job.viewportH),
    ms: performance.now() - t0,
  };
  self.postMessage(done);
}
