/**
 * Main-thread ↔ render-worker protocol. Requests carry a generation number;
 * the worker streams instance chunks tagged with it and abandons work the
 * moment a newer generation arrives. Only PLAIN DATA crosses: the camera,
 * the viewport, and optional demo params — the Picture itself lives in the
 * demo module, which both contexts import (explore.ts self-spawns it).
 */

export interface RenderRequest {
  type: "render";
  generation: number;
  view: { centerRe: number; centerIm: number; height: number };
  viewportW: number;
  viewportH: number;
  /** Demo-specific plain data (slider values, dials) — handed to the
   *  picture as its second argument. Structured-cloneable only. */
  params?: unknown;
}

export interface ChunkMessage {
  type: "chunk";
  generation: number;
  /**
   * Interleaved instances: [x, y, radiusWorld, r, g, b] × count
   * (transferable). x, y are RELATIVE to the request's view center (the
   * generation's anchor): float32 cannot hold absolute deep-zoom
   * coordinates, but window-relative offsets survive the cast.
   */
  instances: Float32Array;
  count: number;
}

export interface DoneMessage {
  type: "done";
  generation: number;
  polynomials: number;
  /** The bound collection's provenance, e.g. "Φ_cone(W, A = 812)" —
   *  Collection.describe() with the derived cutoffs frozen in. */
  population: string;
  ms: number;
}

export type WorkerMessage = ChunkMessage | DoneMessage;
