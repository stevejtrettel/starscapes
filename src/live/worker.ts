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
import { cubicIrreducible, discriminant } from "../core/invariants.ts";
import { coneQuadratics } from "../core/search/cone.ts";
import { coneMonicCubics } from "../core/search/coneMonicCubic.ts";
import { solveCubicBatch } from "../core/solve/cubic.ts";
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
  if (job.family === "monicCubic") return renderMonicCubicJob(job);
  return renderQuadraticJob(job);
}

/**
 * Monic cubics, live: view-cone population (docs/monic-cubic-sampling.md),
 * disc¼ sizing (the uniformity locus, doc §7), irreducible only. The whole
 * view computes in milliseconds at explorer scale (E13), so no streaming
 * blocks are needed — one job, chunked only by batch size.
 *
 * Zoom-adaptive scale: under disc¼, ink ∝ c^{5/2}·(H/h)^{1/2} (§7.3 with
 * ρ ∝ √(c/p)), so constant perceived weight needs c(h) = c₀·(h/h₀)^{1/5} —
 * the fifth-root analogue of the quadratics' cube root.
 */
const DUST_R_CUBIC = 4; // print-texture depth multiplier on ρ (labeled)

async function renderMonicCubicJob(job: RenderRequest): Promise<void> {
  const t0 = performance.now();
  const { view, style } = job;
  // Instance positions are RELATIVE to the view center (protocol.ts): an
  // absolute float32 coordinate quantizes at ~|z|·6e-8, visible jitter at
  // deep zoom; the offset survives the cast because it is window-sized.
  const anchorRe = view.centerRe;
  const anchorIm = view.centerIm;

  const cEff = style.sizeScale * (view.height / HOME_HEIGHT) ** (1 / 5);
  const p = view.height / job.viewportH;
  const rho = DUST_R_CUBIC * Math.sqrt((DUST_FACTOR * cEff) / (2 * p));

  const pad = cEff; // generous vs the largest escaping dot (labeled heuristic)
  const worldW = view.height * (job.viewportW / job.viewportH);
  const window = {
    left: view.centerRe - worldW / 2 - pad,
    top: view.centerIm + view.height / 2 + pad,
    worldW: worldW + 2 * pad,
    worldH: view.height + 2 * pad,
  };

  const slots = allocRootSlots(4096, 3);
  const realRoots = new Float64Array(3);
  let polynomials = 0;

  polynomials = coneMonicCubics(window, rho, (coeffs, count) => {
    solveCubicBatch(coeffs, count, slots);
    const instances = new Float32Array(count * 6);
    let n = 0;
    for (let i = 0; i < count; i++) {
      const off = i * 4;
      const disc = discriminant(coeffs, off, 3);
      if (disc >= 0) continue; // need a complex pair

      let nReal = 0;
      let re = 0;
      let im = -1;
      for (let k = 0; k < slots.count[i]; k++) {
        const y = slots.im[i * 3 + k];
        if (y === 0) realRoots[nReal++] = slots.re[i * 3 + k];
        else if (y > 0) {
          re = slots.re[i * 3 + k];
          im = y;
        }
      }
      if (im <= 0) continue;
      if (!cubicIrreducible(coeffs, off, realRoots, nReal)) continue;

      // disc¼ law (uniformity locus): r_world = c/|disc|^{1/4}, capped.
      const rWorld = Math.min(style.radiusCap * im, cEff / Math.sqrt(Math.sqrt(-disc)));
      const o = n * 6;
      instances[o] = re - anchorRe;
      instances[o + 1] = im - anchorIm;
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

  const done: DoneMessage = {
    type: "done",
    generation: job.generation,
    polynomials,
    aMax: Math.round(rho), // depth readout: the real-root reach ρ
    ms: performance.now() - t0,
  };
  self.postMessage(done);
}

async function renderQuadraticJob(job: RenderRequest): Promise<void> {
  const t0 = performance.now();
  const { view, style } = job;
  // Anchor-relative positions — see renderMonicCubicJob and protocol.ts.
  const anchorRe = view.centerRe;
  const anchorIm = view.centerIm;

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
        instances[o] = slots.re[i * 2] - anchorRe;
        instances[o + 1] = im - anchorIm;
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
