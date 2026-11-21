/**
 * Messages between the page and the render worker. Everything is plain
 * data. A request carries a generation number; the worker tags what it
 * sends back, and abandons a request when a newer one arrives.
 */
import type { Recipe } from "../recipe.ts";

export interface RenderRequest {
  readonly generation: number;
  /** What to draw. Its view is the window wanted; its size law is quoted at any pixel size. */
  readonly recipe: Recipe;
  /** Viewport size in CSS pixels. */
  readonly viewportW: number;
  readonly viewportH: number;
}

/** Floats per disc: [x, y, radius, r, g, b]. */
export const FLOATS_PER_DISC = 6;

export interface ChunkMessage {
  readonly type: "chunk";
  readonly generation: number;
  /**
   * Discs, FLOATS_PER_DISC each. Positions are relative to the request's
   * view centre: float32 cannot hold an absolute coordinate at deep zoom,
   * but an offset the size of the window survives the cast.
   */
  readonly discs: Float32Array;
  readonly count: number;
}

export interface DoneMessage {
  readonly type: "done";
  readonly generation: number;
  readonly stars: number;
  readonly milliseconds: number;
  /** Set when the catalogue refused the view (e.g. too many stars to enumerate). */
  readonly error?: string;
}

export type WorkerMessage = ChunkMessage | DoneMessage;
