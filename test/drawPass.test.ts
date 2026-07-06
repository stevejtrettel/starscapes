/**
 * The draw pass: the house equivalence standard — drawBatch driving a
 * sentence must emit EXACTLY what the pre-refactor per-root loop emits,
 * bit-for-bit, for every house picture shape (the reference below is that
 * loop, transcribed directly over the invariants); and the lazy row columns
 * must be correct across cursor advances (staleness is the failure mode
 * reused cursors invite). The pixel-level twin of this gate is
 * scripts/experiments/render-diff.ts.
 */
import { describe, expect, it } from "vitest";
import { byGaloisGroup } from "../src/core/coloring.ts";
import { drawBatch } from "../src/core/drawPass.ts";
import {
  cubicIrreducible,
  discriminant,
  fprimeAt,
  height,
  isPerfectSquare,
  quadraticIrreducible,
} from "../src/core/invariants.ts";
import type { PolyRow, RootRow } from "../src/core/rows.ts";
import { classic, discLaw, type SizingRule } from "../src/core/sizing.ts";
import { solveCubicBatch } from "../src/core/solve/cubic.ts";
import { solveQuadraticBatch } from "../src/core/solve/quadratic.ts";
import { allocRootSlots, type RootSlots } from "../src/core/solve/types.ts";

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** A random solved batch of integer polynomials (canonical sign). */
function solvedBatch(degree: 2 | 3, n: number, seed: number): { coeffs: Float64Array; slots: RootSlots } {
  const rand = lcg(seed);
  const stride = degree + 1;
  const coeffs = new Float64Array(n * stride);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < degree; k++) coeffs[i * stride + k] = Math.floor(rand() * 61) - 30;
    coeffs[i * stride + degree] = degree === 3 ? 1 : 1 + Math.floor(rand() * 20);
  }
  const slots = allocRootSlots(n, degree);
  if (degree === 2) solveQuadraticBatch(coeffs, n, slots);
  else solveCubicBatch(coeffs, n, slots);
  return { coeffs, slots };
}

type Emitted = number[][];
const collector = (): { out: Emitted; emit: (...args: number[]) => void } => {
  const out: Emitted = [];
  return { out, emit: (...args: number[]) => out.push(args) };
};

/**
 * The pre-refactor per-root loop (stylePass.ts, retired), transcribed
 * directly over the invariants as this test's reference: per polynomial —
 * disc, irreducibility (optionally dropping); per UHP root — fprime, the
 * law's final radius, the non-finite/≤ 0 drop, an optional Galois class
 * color, emit.
 */
function referenceEmit(
  coeffs: Float64Array, count: number, degree: 2 | 3, slots: RootSlots,
  opts: { irreducibleOnly?: boolean; galoisPalette?: ReadonlyArray<readonly number[]> },
  law: SizingRule,
  emit: (...args: number[]) => void,
): void {
  const stride = degree + 1;
  const realRoots = new Float64Array(degree);
  for (let i = 0; i < count; i++) {
    const off = i * stride;
    const base = i * degree;
    const leadAbs = Math.abs(coeffs[off + degree]);
    const disc = discriminant(coeffs, off, degree);
    let irr: boolean;
    if (degree === 2) {
      irr = quadraticIrreducible(disc);
    } else {
      let nReal = 0;
      for (let k = 0; k < slots.count[i]; k++) {
        if (slots.im[base + k] === 0) realRoots[nReal++] = slots.re[base + k];
      }
      irr = cubicIrreducible(coeffs, off, realRoots, nReal);
    }
    if (opts.irreducibleOnly && !irr) continue;
    const rgb = opts.galoisPalette
      ? opts.galoisPalette[irr ? (isPerfectSquare(disc) ? 1 : 2) : 0]
      : [0.05, 0.05, 0.05];
    for (let k = 0; k < slots.count[i]; k++) {
      const im = slots.im[base + k];
      if (im <= 0) continue;
      const fprime = fprimeAt(slots, degree, i, k, leadAbs);
      const r = law.size({ re: slots.re[base + k], im, mult: slots.mult[base + k], fprime } as RootRow);
      if (!(r > 0) || !Number.isFinite(r)) continue;
      emit(slots.re[base + k], im, r, rgb[0], rgb[1], rgb[2]);
    }
  }
}

describe("drawBatch ≡ the pre-refactor per-root loop", () => {
  it("quadratics: UHP filter, classic law, solid ink — identical emissions", () => {
    const { coeffs, slots } = solvedBatch(2, 500, 20260706);
    const law = classic(0.035);

    const ref = collector();
    referenceEmit(coeffs, 500, 2, slots, {}, law, ref.emit);

    const neu = collector();
    const roots = drawBatch(coeffs, 500, 2, slots, (poly, dot) => {
      for (const root of poly.roots) {
        if (root.im <= 0) continue;
        dot(root, law.size(root), 0.05, 0.05, 0.05);
      }
    }, neu.emit);

    let slotSum = 0;
    for (let i = 0; i < 500; i++) slotSum += slots.count[i];
    expect(roots).toBe(slotSum);
    expect(neu.out).toEqual(ref.out);
    expect(neu.out.length).toBeGreaterThan(0);
  });

  it("monic cubics: UHP + irreducible, disc¼ law — identical emissions", () => {
    const { coeffs, slots } = solvedBatch(3, 500, 7);
    const law = discLaw({ alpha: 0.25, beta: 0, c: 0.03, degree: 3 });

    const ref = collector();
    referenceEmit(coeffs, 500, 3, slots, { irreducibleOnly: true }, law, ref.emit);

    const neu = collector();
    drawBatch(coeffs, 500, 3, slots, (poly, dot) => {
      if (!poly.irreducible) return; // per-poly, decided once
      for (const root of poly.roots) {
        if (root.im <= 0) continue;
        dot(root, law.size(root), 0.05, 0.05, 0.05);
      }
    }, neu.emit);

    expect(neu.out).toEqual(ref.out);
    expect(neu.out.length).toBeGreaterThan(0);
  });

  it("polynomial-fact coloring: byGaloisGroup via the scratch idiom — identical emissions", () => {
    const { coeffs, slots } = solvedBatch(3, 500, 99);
    const law = discLaw({ alpha: 0.25, beta: 0, c: 0.03, degree: 3 });
    const coloring = byGaloisGroup(3);

    const ref = collector();
    referenceEmit(coeffs, 500, 3, slots, { galoisPalette: coloring.palette! }, law, ref.emit);

    // The production sentence — byGaloisGroup + the author-owned scratch.
    const rgb = new Float64Array(3);
    const neu = collector();
    drawBatch(coeffs, 500, 3, slots, (poly, dot) => {
      for (const root of poly.roots) {
        if (root.im <= 0) continue;
        coloring.color(root, rgb);
        dot(root, law.size(root), rgb[0], rgb[1], rgb[2]);
      }
    }, neu.emit);

    expect(neu.out).toEqual(ref.out);
  });

  it("drops non-finite radii (multiple root under an uncapped law)", () => {
    const coeffs = new Float64Array([1, -2, 1]); // (x−1)²
    const slots = allocRootSlots(1, 2);
    solveQuadraticBatch(coeffs, 1, slots);
    const law = classic(0.02, { cap: Infinity });
    const neu = collector();
    drawBatch(coeffs, 1, 2, slots, (poly, dot) => {
      for (const root of poly.roots) dot(root, law.size(root), 0, 0, 0);
    }, neu.emit);
    expect(neu.out).toEqual([]);
  });
});

describe("lazy row columns across cursor advances", () => {
  // x²+1 (disc −4, irreducible, height 1), then x²−3x+2 = (x−1)(x−2)
  // (disc 1, reducible, height 3), then (x−1)² (double root, count 1).
  const coeffs = new Float64Array([1, 0, 1, 2, -3, 1, 1, -2, 1]);
  const slots = allocRootSlots(3, 2);
  solveQuadraticBatch(coeffs, 3, slots);

  it("disc/height/irreducible/coeffs/fprime are per-polynomial fresh, repeated reads stable", () => {
    const seen: Array<{
      disc: number; height: number; irr: boolean; lead: number;
      coeffs: number[]; rootCount: number; fprimes: number[]; sameView: boolean;
    }> = [];
    drawBatch(coeffs, 3, 2, slots, (poly) => {
      const firstRead = poly.coeffs;
      const secondRead = poly.coeffs;
      seen.push({
        disc: poly.disc,
        height: poly.height,
        irr: poly.irreducible,
        lead: poly.lead,
        coeffs: Array.from(firstRead),
        rootCount: poly.roots.length,
        fprimes: poly.roots.map((r) => r.fprime),
        sameView: firstRead === secondRead, // the memo hands back one view
      });
    }, () => {});

    expect(seen.map((s) => s.disc)).toEqual([-4, 1, 0]);
    expect(seen.map((s) => s.height)).toEqual([1, 3, 2]);
    expect(seen.map((s) => s.irr)).toEqual([true, false, false]);
    expect(seen.map((s) => s.rootCount)).toEqual([2, 2, 1]);
    expect(seen[0].coeffs).toEqual([1, 0, 1]);
    expect(seen[1].coeffs).toEqual([2, -3, 1]);
    // |f′| at each root, against the direct invariant on the same slots.
    for (let i = 0; i < 3; i++) {
      const direct = [];
      for (let k = 0; k < slots.count[i]; k++) direct.push(fprimeAt(slots, 2, i, k, 1));
      expect(seen[i].fprimes).toEqual(direct);
    }
    expect(seen.every((s) => s.sameView)).toBe(true);
    // Values match the direct invariant calls on the raw batch.
    for (let i = 0; i < 3; i++) {
      expect(seen[i].disc).toBe(discriminant(coeffs, i * 3, 2));
      expect(seen[i].height).toBe(height(coeffs, i * 3, 3));
    }
  });

  it("root.poly is the back-reference to the live cursor", () => {
    drawBatch(coeffs, 1, 2, slots, (poly) => {
      let backRef: PolyRow | undefined;
      for (const root of poly.roots) backRef = root.poly;
      expect(backRef).toBe(poly);
    }, () => {});
  });
});
