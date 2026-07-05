/**
 * The render worker, simple (E8: the simple approach won): view-cone
 * enumeration → solve → style, marched in depth blocks (small leading
 * coefficients — the big dots — first), everything drawn. No budgets,
 * tiles, or charge accounting: E6–E8 showed every gap near geodesics came
 * from budget machinery, and the population itself (Φ_cone at the derived
 * depth) is what the eye wanted.
 *
 * Depth is v1's visible-dot law (labeled heuristic): a hyperbolic-law dot
 * from leading coefficient a has world radius c/2a independent of its
 * height, so visibility at this zoom means a ≤ c·viewportH/(2·height);
 * dust factor ×3.
 *
 * The size scale is ZOOM-ADAPTIVE (E9): total ink scales as c³/h, so
 * c(h) = c₀·(h/h₀)^⅓ holds perceived weight constant at every depth —
 * the home view (h₀ = 2.6) is unchanged, and a zoomed view is the same
 * visual budget spent on deeper polynomials (population is also ∝ c³/h,
 * hence flat). A deliberate choice of what the live instrument shows,
 * not a magnification of the wide picture (which must saturate).
 */
import { discriminant } from "../core/invariants.ts";
import { coneQuadratics } from "../core/search/cone.ts";
import { solveQuadraticBatch } from "../core/solve/quadratic.ts";
import { allocRootSlots } from "../core/solve/types.ts";
import type { ChunkMessage, DoneMessage, RenderRequest } from "./protocol.ts";

const A_PER_BLOCK = 64;
const DUST_FACTOR = 3;
const DEPTH_FLOOR = 5;
const HOME_HEIGHT = 2.6; // h₀: the view at which c(h) = the style's sizeScale

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

  // Zoom-adaptive size scale (see file comment).
  const cEff = style.sizeScale * Math.cbrt(view.height / HOME_HEIGHT);

  const aMax = Math.max(
    DEPTH_FLOOR,
    Math.ceil((DUST_FACTOR * cEff * job.viewportH) / (2 * view.height)),
  );

  // Window fattened by the largest possible dot radius (cEff/2 at a = 1),
  // so dots centered just outside the view still get drawn.
  const pad = cEff / 2;
  const worldW = view.height * (job.viewportW / job.viewportH);
  const window = {
    left: view.centerRe - worldW / 2 - pad,
    top: view.centerIm + view.height / 2 + pad,
    worldW: worldW + 2 * pad,
    worldH: view.height + 2 * pad,
  };

  const slots = allocRootSlots(4096, 2);
  let polynomials = 0;

  for (let aFrom = 1; aFrom <= aMax; aFrom += A_PER_BLOCK) {
    const aTo = Math.min(aMax, aFrom + A_PER_BLOCK - 1);

    polynomials += coneQuadratics(window, aFrom, aTo, (coeffs, count) => {
      solveQuadraticBatch(coeffs, count, slots);
      const instances = new Float32Array(count * 6);
      let n = 0;
      for (let i = 0; i < count; i++) {
        const disc = discriminant(coeffs, i * 3, 2);
        if (disc >= 0) continue; // UHP picture: complex pairs only
        const im = slots.im[i * 2]; // UHP member first
        const rHyp = Math.min(style.radiusCap, cEff / Math.sqrt(-disc));
        const o = n * 6;
        instances[o] = slots.re[i * 2];
        instances[o + 1] = im;
        instances[o + 2] = rHyp * im;
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

    await yieldToMessages();
    if (pending) return; // a newer view superseded this job
  }

  const done: DoneMessage = {
    type: "done",
    generation: job.generation,
    polynomials,
    aMax,
    ms: performance.now() - t0,
  };
  self.postMessage(done);
}
