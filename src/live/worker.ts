/**
 * The render worker: enumerates the stars of the requested view and
 * streams them to the page as discs, largest first.
 *
 * "Largest first" is the plan of render/picture.ts: the catalogue cut into
 * shells of radius [r, 2r), each a δ-shell (catalogue/star.ts) enumerated
 * on its own, so the picture appears in order of visual weight and a
 * superseded request is dropped between shells.
 */
import type { Star } from "../catalogue/star.ts";
import { windowOf } from "../fibre/window.ts";
import { keeps, lawAt } from "../recipe.ts";
import { plan } from "../render/picture.ts";
import { type Starscape, starscape } from "../starscape.ts";
import { paint } from "../style/colour.ts";
import { type ChunkMessage, type DoneMessage, FLOATS_PER_DISC, type RenderRequest } from "./protocol.ts";

const DISCS_PER_CHUNK = 16384;

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
  const { recipe } = request;
  const { view } = recipe;
  const pixel = view.height / request.viewportH;
  const scape: Starscape = starscape({ family: recipe.spec.family, law: lawAt(recipe, pixel) });
  const keep = keeps(recipe);
  const colour = paint(recipe.colouring);
  const rgb = new Float32Array(3);

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
    if (!keep(star)) return;
    const o = filled * FLOATS_PER_DISC;
    discs[o] = star.s - view.centre[0];
    discs[o + 1] = star.y - view.centre[1];
    discs[o + 2] = scape.radius(star);
    colour(star, rgb);
    discs.set(rgb, o + 3);
    stars++;
    if (++filled === DISCS_PER_CHUNK) flush();
  };

  // Largest stars first; a newer request supersedes this one between steps.
  const W = windowOf(view, request.viewportW / request.viewportH);
  let error: string | undefined;
  try {
    for (const step of plan(scape, W, pixel, recipe.faintest)) {
      scape.stars(step.rMin, step.rMax)(step.window, send);
      flush();
      await breathe();
      if (pending) return;
    }
  } catch (reason) {
    error = reason instanceof Error ? reason.message : String(reason);
  }

  const done: DoneMessage = {
    type: "done",
    generation: request.generation,
    stars,
    milliseconds: performance.now() - started,
    ...(error === undefined ? {} : { error }),
  };
  self.postMessage(done);
}
