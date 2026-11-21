/**
 * The render worker: enumerates the stars of the requested view and
 * streams them to the page as discs, largest first.
 *
 * "Largest first" is a partition of the catalogue into shells of radius
 * [r, 2r): each is a δ-shell (catalogue/star.ts), enumerated on its own,
 * so the picture appears in order of visual weight and a superseded
 * request is dropped between shells. Because a family's population grows
 * like a power of 1/r, re-deriving each shell from scratch costs only a
 * bounded factor over a single pass.
 */
import { realRoot } from "../catalogue/cubics.ts";
import type { Star } from "../catalogue/star.ts";
import { windowOf } from "../fibre/window.ts";
import { hasRationalRoot } from "../poly/rationalRoot.ts";
import { reach } from "../render/picture.ts";
import { type Starscape, starscape } from "../starscape.ts";
import { type ChunkMessage, type DoneMessage, FLOATS_PER_DISC, type RenderRequest } from "./protocol.ts";

const DISCS_PER_CHUNK = 16384;
const INK = 0.05;

let pending: RenderRequest | null = null;
let busy = false;

self.onmessage = (event: MessageEvent<RenderRequest>): void => {
  pending = event.data;
  if (!busy) void drain();
};

async function drain(): Promise<void> {
  busy = true;
  while (pending) {
    const request = pending;
    pending = null;
    await render(request);
  }
  busy = false;
}

/** Lets a newer request reach onmessage. */
const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function render(request: RenderRequest): Promise<void> {
  const started = performance.now();
  const scape: Starscape = starscape(request.spec);
  const { view } = request;
  const pixel = view.height / request.viewportH;
  const W = reach(scape, windowOf(view, request.viewportW / request.viewportH), pixel);
  const rMin = request.faintest * pixel;

  let discs = new Float32Array(DISCS_PER_CHUNK * FLOATS_PER_DISC);
  let filled = 0;
  let stars = 0;
  const flush = (): void => {
    if (filled === 0) return;
    const message: ChunkMessage = { type: "chunk", generation: request.generation, discs, count: filled };
    self.postMessage(message, { transfer: [discs.buffer] });
    discs = new Float32Array(DISCS_PER_CHUNK * FLOATS_PER_DISC);
    filled = 0;
  };
  const send = (star: Star): void => {
    if (request.irreducible && star.f.length === 4 && hasRationalRoot(star.f, realRoot(star))) return;
    const o = filled * FLOATS_PER_DISC;
    discs[o] = star.s - view.centre[0];
    discs[o + 1] = star.y - view.centre[1];
    discs[o + 2] = scape.radius(star);
    discs[o + 3] = discs[o + 4] = discs[o + 5] = INK;
    stars++;
    if (++filled === DISCS_PER_CHUNK) flush();
  };

  // Radii rMin·2ᵏ, descending from the largest radius any star here can have.
  // A finite family has no shell structure worth exploiting: one pass.
  const top = scape.radiusBound(W.y1);
  const shells = scape.population === null ? 1 : Math.max(1, Math.ceil(Math.log2(top / rMin)));
  for (let k = shells - 1; k >= 0; k--) {
    const lo = rMin * 2 ** k;
    scape.stars(lo, k === shells - 1 ? Infinity : 2 * lo)(W, send);
    flush();
    await breathe();
    if (pending) return;
  }

  const done: DoneMessage = {
    type: "done",
    generation: request.generation,
    stars,
    milliseconds: performance.now() - started,
  };
  self.postMessage(done);
}
