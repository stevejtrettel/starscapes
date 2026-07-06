/**
 * The style pass: one solved batch → styled dots, the SINGLE transcription
 * of the per-root loop (row filling, filters, sizing with the hyperbolic
 * cap, color) shared by the print pipeline and the live worker. Consumers
 * differ only in what they do with a styled dot (deposit into a raster;
 * append to a GPU instance buffer).
 *
 * Cap semantics (sizing.ts): radius ≤ cap · y, applied NaN-safely so that
 * cap = Infinity with y = 0 (Infinity·0 = NaN) keeps the law's radius —
 * uncapped real-axis dots draw at their law size. Non-finite or ≤ 0 radii
 * are dropped (a multiple root under an uncapped power law has
 * |f′(z)| = 0 ⇒ radius ∞ — flagged by dropping, never drawn).
 */
import { cubicIrreducible, discriminant, fprimeAt, height, quadraticIrreducible } from "./invariants.ts";
import type { RootSlots } from "./solve/types.ts";
import type { MutableRootRow, RootFilter, Style } from "./style.ts";

export type StyledDotSink = (
  re: number, im: number, rWorld: number,
  red: number, green: number, blue: number,
) => void;

const colorOut = new Float64Array(3); // module scratch — single-threaded kernels

/**
 * Style every root of a solved batch, emitting survivors. Returns the
 * number of roots visited (drawn count is the caller's emit count).
 */
export function styleBatch(
  coeffs: Float64Array, count: number, degree: number, slots: RootSlots,
  filters: readonly RootFilter[], style: Style,
  emit: StyledDotSink,
): number {
  const stride = degree + 1;
  const { sizing } = style;
  const row: MutableRootRow = {
    degree, re: 0, im: 0, mult: 0, disc: 0, lead: 1, fprime: 0, height: 0, irreducible: true,
  };
  const realRoots = new Float64Array(degree);
  let roots = 0;

  for (let i = 0; i < count; i++) {
    const off = i * stride;
    row.disc = discriminant(coeffs, off, degree);
    row.height = height(coeffs, off, stride);
    const base = i * degree;
    row.lead = coeffs[off + degree];
    const leadAbs = Math.abs(row.lead);

    if (degree === 2) {
      row.irreducible = quadraticIrreducible(row.disc);
    } else if (degree === 3) {
      // Gather the polynomial's real roots for the rational-root test.
      let nReal = 0;
      for (let k = 0; k < slots.count[i]; k++) {
        if (slots.im[base + k] === 0) realRoots[nReal++] = slots.re[base + k];
      }
      row.irreducible = cubicIrreducible(coeffs, off, realRoots, nReal);
    } else {
      throw new Error(`styleBatch: no irreducibility test for degree ${degree}`);
    }

    slot: for (let k = 0; k < slots.count[i]; k++) {
      roots++;
      row.re = slots.re[base + k];
      row.im = slots.im[base + k];
      row.mult = slots.mult[base + k];
      // fprime is filled AFTER filters (style.ts contract): most roots are
      // filtered, and its co-root sqrt loop is the pass's one real cost.
      row.fprime = NaN;
      for (const keep of filters) if (!keep(row)) continue slot;
      row.fprime = fprimeAt(slots, degree, i, k, leadAbs);

      let r = sizing.size(row);
      const capR = sizing.cap * Math.abs(row.im); // NaN when cap=∞, y=0 — comparison below is then false
      if (capR < r) r = capR;
      if (!(r > 0) || !Number.isFinite(r)) continue;

      style.coloring.color(row, colorOut);
      emit(row.re, row.im, r, colorOut[0], colorOut[1], colorOut[2]);
    }
  }
  return roots;
}
