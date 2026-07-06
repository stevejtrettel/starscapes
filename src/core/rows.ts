/**
 * PolyRow / RootRow: the sentence surface's view of one solved batch
 * (design.md, Level 3 — "sentences, not specs"). The subject of a sentence
 * is the POLYNOMIAL: `poly` carries the polynomial-level columns and
 * `poly.roots`; a root reaches its polynomial-level facts back through
 * `root.poly` (facts stay named columns, never raw coefficient access).
 *
 * Hot-loop discipline (conventions.md, kernel dialect): ONE PolyCursor and
 * `degree` RootCursors exist per pass, advanced across the batch — never
 * allocated per polynomial. Every derived column is a MEMOIZED GETTER
 * computed on first read and invalidated when the cursor advances (a
 * generation counter — O(1) advance), so a picture never pays for an
 * invariant it doesn't read; a solid-ink print never computes a
 * discriminant. Rows are views into reused storage: read them inside
 * `draw`, never retain them.
 */
import { cubicIrreducible, discriminant, fprimeAt, height, quadraticIrreducible } from "./invariants.ts";
import type { RootSlots } from "./solve/types.ts";

export interface PolyRow {
  readonly degree: number;
  /** The leading coefficient (canonical sign: positive for the lattice
   *  families) — depth, for colorings like byLead. */
  readonly lead: number;
  /** Ascending coefficients — a view, valid until the cursor advances. */
  readonly coeffs: Float64Array;
  readonly disc: number;
  /** Naive height: max |coefficient|. */
  readonly height: number;
  /** Irreducible over ℚ (exact — invariants.ts). Degrees 2 and 3 only;
   *  reading it at another degree throws (the test arrives with the
   *  degree's solver work). */
  readonly irreducible: boolean;
  /** The distinct roots, solver order (real ascending, then UHP-first
   *  conjugate pairs) — a reused array, valid until the cursor advances. */
  readonly roots: readonly RootRow[];
}

export interface RootRow {
  readonly re: number;
  readonly im: number;
  readonly mult: number;
  /** |f′(z)| at this root — |a_d|·∏|z − w| over the co-roots; 0 at a
   *  multiple root. The power-law sizing coordinate (sizing.ts). */
  readonly fprime: number;
  /** Back-reference to the polynomial: `root.poly.disc` etc. */
  readonly poly: PolyRow;
}

class RootCursor implements RootRow {
  re = 0;
  im = 0;
  mult = 0;
  private fprimeMemo = 0;
  private fprimeGen = -1;
  private readonly owner: PolyCursor;
  /** This cursor's fixed slot index within the polynomial. */
  private readonly k: number;

  constructor(owner: PolyCursor, k: number) {
    this.owner = owner;
    this.k = k;
  }

  get poly(): PolyRow {
    return this.owner;
  }

  get fprime(): number {
    const o = this.owner;
    if (this.fprimeGen !== o.gen) {
      this.fprimeMemo = fprimeAt(o.slots, o.degree, o.index, this.k, Math.abs(o.lead));
      this.fprimeGen = o.gen;
    }
    return this.fprimeMemo;
  }
}

/** The one writer of the rows: drawPass advances it; demos only ever see
 *  the PolyRow face. */
export class PolyCursor implements PolyRow {
  gen = 0;
  index = 0;
  lead = 1;
  slots!: RootSlots;
  readonly roots: RootCursor[] = [];

  private batch!: Float64Array;
  private off = 0;
  private readonly allRoots: RootCursor[] = [];
  private readonly realScratch: Float64Array;

  private coeffsMemo!: Float64Array;
  private coeffsGen = -1;
  private discMemo = 0;
  private discGen = -1;
  private heightMemo = 0;
  private heightGen = -1;
  private irrMemo = true;
  private irrGen = -1;

  readonly degree: number;

  constructor(degree: number) {
    this.degree = degree;
    for (let k = 0; k < degree; k++) this.allRoots.push(new RootCursor(this, k));
    this.realScratch = new Float64Array(degree);
  }

  /** Point the rows at polynomial i of a solved batch. */
  advance(batch: Float64Array, off: number, slots: RootSlots, i: number): void {
    this.gen++;
    this.batch = batch;
    this.off = off;
    this.slots = slots;
    this.index = i;
    this.lead = batch[off + this.degree];
    const base = i * this.degree;
    const count = slots.count[i];
    for (let k = 0; k < count; k++) {
      const root = this.allRoots[k];
      root.re = slots.re[base + k];
      root.im = slots.im[base + k];
      root.mult = slots.mult[base + k];
      this.roots[k] = root;
    }
    this.roots.length = count;
  }

  get coeffs(): Float64Array {
    if (this.coeffsGen !== this.gen) {
      this.coeffsMemo = this.batch.subarray(this.off, this.off + this.degree + 1);
      this.coeffsGen = this.gen;
    }
    return this.coeffsMemo;
  }

  get disc(): number {
    if (this.discGen !== this.gen) {
      this.discMemo = discriminant(this.batch, this.off, this.degree);
      this.discGen = this.gen;
    }
    return this.discMemo;
  }

  get height(): number {
    if (this.heightGen !== this.gen) {
      this.heightMemo = height(this.batch, this.off, this.degree + 1);
      this.heightGen = this.gen;
    }
    return this.heightMemo;
  }

  get irreducible(): boolean {
    if (this.irrGen !== this.gen) {
      if (this.degree === 2) {
        this.irrMemo = quadraticIrreducible(this.disc);
      } else if (this.degree === 3) {
        // Gather the polynomial's real roots for the rational-root test.
        const base = this.index * this.degree;
        let nReal = 0;
        for (let k = 0; k < this.slots.count[this.index]; k++) {
          if (this.slots.im[base + k] === 0) this.realScratch[nReal++] = this.slots.re[base + k];
        }
        this.irrMemo = cubicIrreducible(this.batch, this.off, this.realScratch, nReal);
      } else {
        throw new Error(`PolyRow.irreducible: no irreducibility test for degree ${this.degree}`);
      }
      this.irrGen = this.gen;
    }
    return this.irrMemo;
  }
}
