/**
 * Main-thread ↔ render-worker protocol. Requests carry a generation number;
 * the worker streams instance chunks tagged with it and abandons work the
 * moment a newer generation arrives. All picture parameters cross as plain
 * data (workers can't receive closures — style here is the named preset's
 * parameters).
 */

export type LiveFamily = "quadratic" | "monicCubic";

export interface RenderRequest {
  type: "render";
  generation: number;
  family: LiveFamily;
  view: { centerRe: number; centerIm: number; height: number };
  viewportW: number;
  viewportH: number;
  style: { sizeScale: number; radiusCap: number };
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
  /** March depth for this view (derived from zoom — see worker). */
  aMax: number;
  ms: number;
}

export type WorkerMessage = ChunkMessage | DoneMessage;
