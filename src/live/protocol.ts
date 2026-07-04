/**
 * Main-thread ↔ render-worker protocol. Requests carry a generation number;
 * the worker streams instance chunks tagged with it and abandons work the
 * moment a newer generation arrives. All picture parameters cross as plain
 * data (workers can't receive closures — style here is the named preset's
 * parameters).
 */

export interface RenderRequest {
  type: "render";
  generation: number;
  view: { centerRe: number; centerIm: number; height: number };
  viewportW: number;
  viewportH: number;
  style: {
    sizeScale: number;
    radiusCap: number;
    /** Fraction of screen pixels the picture may ink; depth stops when spent. */
    inkBudget: number;
  };
}

export interface ChunkMessage {
  type: "chunk";
  generation: number;
  /** Interleaved instances: [x, y, radiusWorld, r, g, b] × count (transferable). */
  instances: Float32Array;
  count: number;
}

export interface DoneMessage {
  type: "done";
  generation: number;
  polynomials: number;
  /** Depth level reached when the ink budget was spent (or the guard). */
  aReached: number;
  /** Ink actually spent, as a fraction of screen pixels. */
  inkFraction: number;
  ms: number;
}

export type WorkerMessage = ChunkMessage | DoneMessage;
