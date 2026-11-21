/**
 * The render worker: enumerates the stars of the requested view and
 * streams them to the page as discs, largest first.
 *
 * "Largest first" is the plan of render/picture.ts: the catalogue cut into
 * shells of radius [r, 2r), each a δ-shell (catalogue/star.ts) enumerated
 * on its own, so the picture appears in order of visual weight and a
 * superseded request is dropped between shells.
 */
import { realRoot } from "../catalogue/cubics.ts";
import type { Star } from "../catalogue/star.ts";
import { windowOf } from "../fibre/window.ts";
import { hasRationalRoot } from "../poly/rationalRoot.ts";
import { plan } from "../render/picture.ts";
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

  // Largest stars first; a newer request supersedes this one between steps.
  // For a finite family the margin is capped at half the view: its
  // catalogue has no size structure to exploit, and without the cap a deep
  // zoom would enumerate everything within the largest conceivable radius.
  const W = windowOf(view, request.viewportW / request.viewportH);
  const maxMargin = scape.population === null ? view.height / 2 : Infinity;
  for (const step of plan(scape, W, pixel, request.faintest, maxMargin)) {
    scape.stars(step.rMin, step.rMax)(step.window, send);
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
