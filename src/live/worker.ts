/**
 * The render worker: bind the family's backward strategy to the view,
 * stream Φ, solve, style, ship instances. The sampling laws (visibility
 * depth, reach, pad, constant-ink zoom scale) live in core with the
 * strategies (src/core/search/); the sizing laws are the named rules of
 * core/sizing.ts and the styling loop is the shared style pass
 * (core/stylePass.ts) — the worker owns only the live instrument's own
 * business: the per-family definitions below, the home view, and the chunk
 * protocol.
 *
 * Jobs run to completion: E9's constant-ink law holds the population flat
 * (~tens of thousands of dots at every zoom), so every job is
 * milliseconds-scale and supersession between jobs is all the cancellation
 * the instrument needs.
 */
import { constantInkScaleQuadratic, viewConeQuadratics } from "../core/search/cone.ts";
import {
  constantInkScaleMonicCubic,
  viewConeMonicCubics,
} from "../core/search/coneMonicCubic.ts";
import type { SearchStrategy } from "../core/search/types.ts";
import { classic, discLaw, type SizingRule } from "../core/sizing.ts";
import { solveCubicBatch } from "../core/solve/cubic.ts";
import { solveQuadraticBatch } from "../core/solve/quadratic.ts";
import { allocRootSlots, type RootSlots } from "../core/solve/types.ts";
import { solid } from "../core/coloring.ts";
import { irreducibleOnly, type RootFilter, upperHalfPlane } from "../core/style.ts";
import { styleBatch } from "../core/stylePass.ts";
import type { ChunkMessage, DoneMessage, LiveFamily, RenderRequest } from "./protocol.ts";

const HOME_HEIGHT = 2.6; // h₀: the view at which c(h) = the style's sizeScale
const INK = solid(0.05, 0.05, 0.05); // the one live color, until coloring rules are settled

interface FamilyDef {
  readonly strategy: SearchStrategy;
  /** Constant-ink zoom law: effective scale at height h from the dial c₀.
   *  (c₀ crosses the protocol in the family's traditional disc-form
   *  constant; sizing() converts to the declared f′ form.) */
  scaleAt(c0: number, h: number): number;
  solve(coeffs: Float64Array, count: number, slots: RootSlots): void;
  /** The live sizing rule at effective scale cEff. */
  sizing(cEff: number, cap: number): SizingRule;
  readonly filters: readonly RootFilter[];
}

const FAMILIES: Record<LiveFamily, FamilyDef> = {
  quadratic: {
    strategy: viewConeQuadratics(),
    scaleAt: (c0, h) => constantInkScaleQuadratic(c0, h, HOME_HEIGHT),
    solve: solveQuadraticBatch,
    // The E8-validated look: classic (γ, δ) = (1, 1), c·y/|f′(z)| = c/√|disc| hyperbolic.
    sizing: (c, cap) => classic(c, { cap }),
    filters: [upperHalfPlane],
  },
  monicCubic: {
    strategy: viewConeMonicCubics(),
    scaleAt: (c0, h) => constantInkScaleMonicCubic(c0, h, HOME_HEIGHT),
    solve: solveCubicBatch,
    // The uniformity locus in its disc¼ dress: c/|disc|^¼ (= uniform(c·√2)).
    sizing: (c, cap) => discLaw({ alpha: 0.25, beta: 0, c, degree: 3, cap }),
    filters: [upperHalfPlane, irreducibleOnly],
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
  const sizing = def.sizing(cEff, job.style.radiusCap);
  const style = { sizing, coloring: INK };
  const worldW = view.height * (job.viewportW / job.viewportH);
  const population = def.strategy.populationFor({
    window: {
      left: view.centerRe - worldW / 2,
      top: view.centerIm + view.height / 2,
      worldW,
      worldH: view.height,
    },
    worldPerPixel: view.height / job.viewportH,
    sizing,
  });

  const degree = def.strategy.family.degree;
  const slots = allocRootSlots(4096, degree);

  const polynomials = population.enumerate((coeffs, count) => {
    def.solve(coeffs, count, slots);
    const instances = new Float32Array(count * 6);
    let n = 0;
    styleBatch(coeffs, count, degree, slots, def.filters, style, (re, im, rWorld, r, g, b) => {
      const o = n * 6;
      instances[o] = re - anchorRe;
      instances[o + 1] = im - anchorIm;
      instances[o + 2] = rWorld;
      instances[o + 3] = r;
      instances[o + 4] = g;
      instances[o + 5] = b;
      n++;
    });
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
