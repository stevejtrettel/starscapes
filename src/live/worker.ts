/**
 * The render worker: bind the family's backward strategy to the view,
 * stream Φ, solve, style, ship instances. The sampling laws (visibility
 * depth, reach, pad, constant-ink zoom scale) live in core with the
 * strategies (src/core/search/, design.md Level 3 "Search strategies in
 * code"); what remains here is the live instrument's own business — the
 * home view, the per-family style loops (their move to named style laws is
 * a future settled conversation), and the chunk protocol.
 *
 * Jobs run to completion: E9's constant-ink law holds the population flat
 * (~tens of thousands of dots at every zoom), so every job is
 * milliseconds-scale and supersession between jobs is all the cancellation
 * the instrument needs. (The old A_PER_BLOCK mid-job yield predated E9.)
 */
import { cubicIrreducible, discriminant } from "../core/invariants.ts";
import { constantInkScaleQuadratic, viewConeQuadratics } from "../core/search/cone.ts";
import {
  constantInkScaleMonicCubic,
  viewConeMonicCubics,
} from "../core/search/coneMonicCubic.ts";
import type { SearchStrategy } from "../core/search/types.ts";
import { solveCubicBatch } from "../core/solve/cubic.ts";
import { solveQuadraticBatch } from "../core/solve/quadratic.ts";
import { allocRootSlots, type RootSlots } from "../core/solve/types.ts";
import type { ChunkMessage, DoneMessage, LiveFamily, RenderRequest } from "./protocol.ts";

const HOME_HEIGHT = 2.6; // h₀: the view at which c(h) = the style's sizeScale
const INK = 0.05; // the one live color, until styles become named presets

interface FamilyDef {
  readonly strategy: SearchStrategy;
  /** Constant-ink zoom law for this family's live size law. */
  scaleAt(c0: number, h: number): number;
  solve(coeffs: Float64Array, count: number, slots: RootSlots): void;
  /** Style one solved batch into `out` (anchor-relative positions);
   *  returns the instance count. */
  style(
    coeffs: Float64Array, count: number, slots: RootSlots,
    cEff: number, radiusCap: number, anchorRe: number, anchorIm: number,
    out: Float32Array,
  ): number;
}

/** Hyperbolic sizing c/√|disc| — the E8-validated quadratic look. */
function styleQuadratics(
  coeffs: Float64Array, count: number, slots: RootSlots,
  cEff: number, radiusCap: number, anchorRe: number, anchorIm: number,
  out: Float32Array,
): number {
  let n = 0;
  for (let i = 0; i < count; i++) {
    const disc = discriminant(coeffs, i * 3, 2);
    if (disc >= 0) continue; // UHP picture: complex pairs only
    const im = slots.im[i * 2]; // UHP member first
    const rHyp = Math.min(radiusCap, cEff / Math.sqrt(-disc));
    const o = n * 6;
    out[o] = slots.re[i * 2] - anchorRe;
    out[o + 1] = im - anchorIm;
    out[o + 2] = rHyp * im;
    out[o + 3] = INK;
    out[o + 4] = INK;
    out[o + 5] = INK;
    n++;
  }
  return n;
}

const realRoots = new Float64Array(3); // reused by the cubic rational-root test

/** disc¼ sizing (the uniformity locus, monic-cubic-sampling.md §7),
 *  irreducible only. */
function styleMonicCubics(
  coeffs: Float64Array, count: number, slots: RootSlots,
  cEff: number, radiusCap: number, anchorRe: number, anchorIm: number,
  out: Float32Array,
): number {
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

    const rWorld = Math.min(radiusCap * im, cEff / Math.sqrt(Math.sqrt(-disc)));
    const o = n * 6;
    out[o] = re - anchorRe;
    out[o + 1] = im - anchorIm;
    out[o + 2] = rWorld;
    out[o + 3] = INK;
    out[o + 4] = INK;
    out[o + 5] = INK;
    n++;
  }
  return n;
}

const FAMILIES: Record<LiveFamily, FamilyDef> = {
  quadratic: {
    strategy: viewConeQuadratics(),
    scaleAt: (c0, h) => constantInkScaleQuadratic(c0, h, HOME_HEIGHT),
    solve: solveQuadraticBatch,
    style: styleQuadratics,
  },
  monicCubic: {
    strategy: viewConeMonicCubics(),
    scaleAt: (c0, h) => constantInkScaleMonicCubic(c0, h, HOME_HEIGHT),
    solve: solveCubicBatch,
    style: styleMonicCubics,
  },
};

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
  const def = FAMILIES[job.family];
  const { view } = job;
  // Instance positions are RELATIVE to the view center (protocol.ts): an
  // absolute float32 coordinate quantizes at ~|z|·6e-8, visible jitter at
  // deep zoom; the offset survives the cast because it is window-sized.
  const anchorRe = view.centerRe;
  const anchorIm = view.centerIm;

  const cEff = def.scaleAt(job.style.sizeScale, view.height);
  const worldW = view.height * (job.viewportW / job.viewportH);
  const population = def.strategy.populationFor({
    window: {
      left: view.centerRe - worldW / 2,
      top: view.centerIm + view.height / 2,
      worldW,
      worldH: view.height,
    },
    worldPerPixel: view.height / job.viewportH,
    sizeScale: cEff,
  });

  const degree = def.strategy.family.degree;
  const slots = allocRootSlots(4096, degree);

  const polynomials = population.enumerate((coeffs, count) => {
    def.solve(coeffs, count, slots);
    const instances = new Float32Array(count * 6);
    const n = def.style(
      coeffs, count, slots, cEff, job.style.radiusCap, anchorRe, anchorIm, instances,
    );
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
    population: population.describe(),
    ms: performance.now() - t0,
  };
  self.postMessage(done);
}
