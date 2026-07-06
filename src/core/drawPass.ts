/**
 * The draw pass: one solved batch → styled dots, the SINGLE transcription of
 * the per-polynomial loop shared by the print pipeline and the live worker
 * (successor to stylePass.ts's per-root loop). The author's `draw` sentence
 * does the filtering, sizing, and coloring; this pass owns only the cursor
 * discipline (rows.ts) and the one drop rule on `dot`: non-finite or ≤ 0
 * radii are skipped (a multiple root under an uncapped power law has
 * |f′(z)| = 0 ⇒ radius ∞ — flagged by dropping, never drawn). Consumers
 * differ only in what `emit` does with a dot (deposit into a raster; append
 * to a GPU instance buffer).
 */
import { PolyCursor } from "./rows.ts";
import type { Dot, Scene } from "./scene.ts";
import type { RootSlots } from "./solve/types.ts";

export type DotSink = (
  re: number, im: number, rWorld: number,
  red: number, green: number, blue: number,
) => void;

/**
 * Run the sentence over every polynomial of a solved batch, emitting
 * surviving dots. Returns the number of roots visited (drawn count is the
 * caller's emit count).
 */
export function drawBatch(
  coeffs: Float64Array, count: number, degree: number, slots: RootSlots,
  draw: Scene["draw"],
  emit: DotSink,
): number {
  const stride = degree + 1;
  const cursor = new PolyCursor(degree);
  const dot: Dot = (at, rWorld, r, g, b) => {
    if (!(rWorld > 0) || !Number.isFinite(rWorld)) return;
    emit(at.re, at.im, rWorld, r, g, b);
  };
  let roots = 0;
  for (let i = 0; i < count; i++) {
    cursor.advance(coeffs, i * stride, slots, i);
    roots += slots.count[i];
    draw(cursor, dot);
  }
  return roots;
}
