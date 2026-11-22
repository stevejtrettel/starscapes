/**
 * The Galois group of an irreducible integer polynomial of degree 2 to 5,
 * as a transitive permutation group of its roots (up to conjugacy).
 *
 * Every test is decided on integers. Approximate roots are used only to
 * nominate candidates — for a rational root of a resolvent — which are
 * then checked exactly.
 *
 *     d = 2    C₂.
 *     d = 3    C₃ if disc f is a square, else S₃.
 *     d = 4    by the resolvent cubic R and disc f (Kappe–Warren):
 *                R irreducible            A₄ if disc is a square, else S₄;
 *                R has 3 rational roots   V₄;
 *                R has 1 rational root r  C₄ or D₄, below.
 *     d = 5    by the sextic resolvent of the Frobenius group F₂₀ and disc f:
 *                no rational root         A₅ if disc is a square, else S₅;
 *                a simple rational root   F₂₀ if disc is not a square,
 *                                         else D₅ or C₅, below.
 *
 * QUARTICS. For f monic, f = x⁴ + bx³ + cx² + dx + e, the resolvent cubic
 *
 *     R(x) = x³ − cx² + (bd − 4e)x − (b²e − 4ce + d²)
 *
 * has the roots α₁α₂ + α₃α₄, α₁α₃ + α₂α₄, α₁α₄ + α₂α₃, and when it has
 * exactly one rational root r, Gal f = C₄ iff x² − rx + e and
 * x² + bx + (c − r) both split over ℚ(√disc) (Kappe–Warren 1989).
 *
 * QUINTICS. For f monic and depressed, x⁵ + px³ + qx² + rx + s, the
 * function
 *
 *     θ = Σ x₁²(x₂x₅ + x₃x₄)    (over the 5 rotations of the indices)
 *
 * has stabiliser F₂₀ = AGL₁(𝔽₅) in S₅, so its 6 conjugates are the roots of
 * a sextic R with integer coefficients, and Gal f ⊆ F₂₀ (f is solvable by
 * radicals) iff R has a rational root — provided the root is simple;
 * otherwise f is first changed by a Tschirnhaus transformation. R is a
 * polynomial in p, q, r, s, weighted homogeneous (weights 2, 3, 4, 5); its
 * coefficients were found by exact interpolation and checked on other
 * quintics by scripts/derive/f20-resolvent.py, and test/galois.test.ts
 * checks the groups it gives against Frobenius statistics.
 *
 * C₅ AGAINST D₅. D₅ contains elements of cycle type (2, 2, 1), C₅ does
 * not; half of all primes show one for D₅ (Chebotarev). A pattern (2, 2, 1)
 * mod some p proves D₅. C₅ is declared after 200 good primes without one —
 * the one statement here that is not a proof: a D₅ quintic passes that
 * test with probability about 2⁻²⁰⁰.
 */

import { solve } from "../roots/solve.ts";
import { discriminantExact } from "./discriminant.ts";
import { factorDegrees, primesBelow } from "./frobenius.ts";
import type { Poly } from "./poly.ts";

export type GaloisGroup = "C2" | "C3" | "S3" | "C4" | "V4" | "D4" | "A4" | "S4" | "C5" | "D5" | "F20" | "A5" | "S5";

/** The transitive groups of each degree, smallest first. */
export const GALOIS_GROUPS: Readonly<Record<number, readonly GaloisGroup[]>> = {
  2: ["C2"],
  3: ["C3", "S3"],
  4: ["C4", "V4", "D4", "A4", "S4"],
  5: ["C5", "D5", "F20", "A5", "S5"],
};

/** Approximate values of a resolvent's roots above this are not trusted to round. */
const ROUNDABLE = 2 ** 45;

export function isSquare(n: bigint): boolean {
  if (n < 0n) return false;
  if (n < 2n) return true;
  // Newton's method for ⌊√n⌋, from a start above it: the float estimate,
  // enlarged past its rounding error, or a power of 2 beyond float range.
  const estimate = Math.sqrt(Number(n));
  let x = Number.isFinite(estimate)
    ? BigInt(Math.ceil(estimate * (1 + 2 ** -40))) + 2n
    : 1n << BigInt(Math.ceil(n.toString(2).length / 2) + 1);
  for (;;) {
    const y = (x + n / x) / 2n;
    if (y >= x) break;
    x = y;
  }
  return x * x === n;
}

/** Σ c_k m^k, coefficients ascending. */
function evaluate(c: readonly bigint[], m: bigint): bigint {
  let v = 0n;
  for (let k = c.length - 1; k >= 0; k--) v = v * m + c[k];
  return v;
}

/**
 * The Galois group of f, irreducible over ℚ, of degree 2 to 5. Undefined
 * when the coefficients are too large for the approximate roots to
 * nominate a resolvent's root reliably (a carried form deep in a cusp).
 */
export function galoisGroup(f: Poly): GaloisGroup | undefined {
  const d = f.length - 1;
  if (d === 2) return "C2";
  if (d === 3) return isSquare(discriminantExact(f)) ? "C3" : "S3";
  if (d === 4) return quarticGroup(f);
  if (d === 5) return quinticGroup(f);
  throw new Error("galoisGroup: degrees 2 to 5 only");
}

const re = new Float64Array(5);
const im = new Float64Array(5);

function quarticGroup(f: Poly): GaloisGroup | undefined {
  const a = BigInt(f[4]);
  // x⁴ + bx³ + cx² + dx + e = a³·f(x/a), whose roots are a·αᵢ.
  const b = BigInt(f[3]);
  const c = BigInt(f[2]) * a;
  const d = BigInt(f[1]) * a * a;
  const e = BigInt(f[0]) * a * a * a;
  const R = [-(b * b * e - 4n * c * e + d * d), b * d - 4n * e, -c, 1n];

  solve(f, re, im);
  const lead = f[4];
  const roots: Array<[number, number]> = [0, 1, 2, 3].map((i) => [lead * re[i], lead * im[i]]);
  const rational = new Set<bigint>();
  for (const [i, j, k, l] of [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]]) {
    const [x, y] = add(mul(roots[i], roots[j]), mul(roots[k], roots[l]));
    if (Math.hypot(x, y) > ROUNDABLE) return undefined;
    const m = BigInt(Math.round(x));
    if (evaluate(R, m) === 0n) rational.add(m);
  }

  const disc = discriminantExact(f);
  if (rational.size === 0) return isSquare(disc) ? "A4" : "S4";
  if (rational.size === 3) return "V4";
  const [r] = rational;
  // δ splits over ℚ(√disc) iff δ is 0, a square, or disc times a square.
  const splits = (delta: bigint): boolean => delta === 0n || isSquare(delta) || isSquare(delta * disc);
  return splits(r * r - 4n * e) && splits(b * b - 4n * (c - r)) ? "C4" : "D4";
}

type Complex = [number, number];
const mul = (u: Complex, v: Complex): Complex => [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]];
const add = (u: Complex, v: Complex): Complex => [u[0] + v[0], u[1] + v[1]];

/** The F₂₀-invariant θ of five numbers. */
function theta(x: readonly Complex[]): Complex {
  const sq = (u: Complex): Complex => mul(u, u);
  const term = (i: number, j: number, k: number, l: number, m: number): Complex =>
    mul(sq(x[i]), add(mul(x[j], x[k]), mul(x[l], x[m])));
  return [term(0, 1, 4, 2, 3), term(1, 0, 2, 3, 4), term(2, 0, 4, 1, 3), term(3, 0, 1, 2, 4), term(4, 0, 3, 1, 2)].reduce(add);
}

/** Representatives of S₅/F₂₀: θ at these orderings of the roots are the 6 roots of the resolvent. */
const COSETS = [
  [0, 1, 2, 3, 4], [0, 1, 2, 4, 3], [0, 1, 3, 2, 4], [0, 1, 3, 4, 2], [0, 1, 4, 2, 3], [0, 1, 4, 3, 2],
];

/** The sextic resolvent of x⁵ + px³ + qx² + rx + s, coefficients ascending. */
function sexticResolvent(p: bigint, q: bigint, r: bigint, s: bigint): bigint[] {
  const p2 = p * p, p3 = p2 * p, p4 = p3 * p, p5 = p4 * p, p6 = p5 * p, p7 = p6 * p;
  const q2 = q * q, q3 = q2 * q, q4 = q3 * q, q5 = q4 * q, q6 = q5 * q, q8 = q6 * q2;
  const r2 = r * r, r3 = r2 * r, r4 = r3 * r, r5 = r4 * r, r6 = r5 * r;
  const s2 = s * s, s3 = s2 * s, s4 = s3 * s;
  return [
    -27n * p7 * s2 + 18n * p6 * q * r * s - 4n * p6 * r3 - 4n * p5 * q3 * s + p5 * q2 * r2 - 99n * p5 * r * s2
      - 150n * p4 * q2 * s2 + 196n * p4 * q * r2 * s + 48n * p4 * r4 + 12n * p3 * q3 * r * s - 128n * p3 * q2 * r3
      + 1200n * p3 * r2 * s2 - 12n * p2 * q5 * s + 65n * p2 * q4 * r2 - 725n * p2 * q2 * r * s2 - 160n * p2 * q * r3 * s
      - 192n * p2 * r5 + 3125n * p2 * s4 - 13n * p * q6 * r - 125n * p * q4 * s2 + 590n * p * q3 * r2 * s
      - 16n * p * q2 * r4 - 1250n * p * q * r * s3 - 2000n * p * r3 * s2 + q8 - 124n * q5 * r * s + 17n * q4 * r3
      + 3250n * q2 * r2 * s2 - 1600n * q * r4 * s + 256n * r6 - 9375n * r * s4,
    -108n * p5 * s2 + 117n * p4 * q * r * s + 32n * p4 * r3 - 31n * p3 * q3 * s - 51n * p3 * q2 * r2
      + 525n * p3 * r * s2 + 19n * p2 * q4 * r - 325n * p2 * q2 * s2 + 260n * p2 * q * r2 * s - 256n * p2 * r4
      - 2n * p * q6 + 105n * p * q3 * r * s + 76n * p * q2 * r3 + 625n * p * q * s3 - 500n * p * r2 * s2
      - 58n * q5 * s + 3n * q4 * r2 + 2750n * q2 * r * s2 - 2400n * q * r3 * s + 512n * r5 - 3125n * s4,
    9n * p4 * r2 - 6n * p3 * q2 * r + p2 * q4 + 90n * p2 * q * r * s - 136n * p2 * r3 - 50n * p * q3 * s
      + 76n * p * q2 * r2 + 500n * p * r * s2 - 8n * q4 * r + 625n * q2 * s2 - 1400n * q * r2 * s + 400n * r4,
    -15n * p2 * q * s - 40n * p2 * r2 + 21n * p * q2 * r + 125n * p * s2 - 2n * q4 - 400n * q * r * s + 160n * r3,
    -6n * p2 * r + 2n * p * q2 - 50n * q * s + 40n * r2,
    8n * r,
    1n,
  ];
}

/**
 * A monic quintic with integer coefficients (ascending, c[5] = 1) and its
 * roots, made depressed: y = 5x + c₄ has the minimal polynomial
 * 5⁵·g((y − c₄)/5), which is monic with integer coefficients.
 */
function depress(c: readonly bigint[], roots: readonly Complex[]): { coefficients: bigint[]; roots: Complex[] } {
  const shift = -c[4];
  const out = [0n, 0n, 0n, 0n, 0n, 0n];
  // Σ c_k 5^(5−k) (y + shift)^k.
  const binomial = [[1n], [1n, 1n], [1n, 2n, 1n], [1n, 3n, 3n, 1n], [1n, 4n, 6n, 4n, 1n], [1n, 5n, 10n, 10n, 5n, 1n]];
  for (let k = 0; k <= 5; k++) {
    const scale = c[k] * 5n ** BigInt(5 - k);
    for (let j = 0; j <= k; j++) out[j] += scale * binomial[k][j] * shift ** BigInt(k - j);
  }
  const c4 = Number(c[4]);
  return { coefficients: out, roots: roots.map(([x, y]) => [5 * x + c4, 5 * y]) };
}

/**
 * The characteristic polynomial of β = y² + ky over ℚ(y), y a root of the
 * monic quintic h: from power sums of the roots (Newton's identities, both
 * ways), all in integers.
 */
function tschirnhaus(h: readonly bigint[], roots: readonly Complex[], k: bigint): { c: bigint[]; roots: Complex[] } {
  const s: bigint[] = [5n];
  for (let m = 1; m <= 10; m++) {
    let v = m <= 5 ? -BigInt(m) * h[5 - m] : 0n;
    for (let i = 1; i < m && i <= 5; i++) v -= h[5 - i] * s[m - i];
    s.push(v);
  }
  // t_j = Σ βᵢʲ = Σ_i C(j, i) k^(j−i) s_(j+i).
  const t: bigint[] = [5n];
  for (let j = 1; j <= 5; j++) {
    let v = 0n;
    let binom = 1n;
    for (let i = 0; i <= j; i++) {
      v += binom * k ** BigInt(j - i) * s[j + i];
      binom = (binom * BigInt(j - i)) / BigInt(i + 1);
    }
    t.push(v);
  }
  const e: bigint[] = [1n];
  for (let m = 1; m <= 5; m++) {
    let v = 0n;
    for (let i = 1; i <= m; i++) v += (i % 2 === 1 ? 1n : -1n) * e[m - i] * t[i];
    e.push(v / BigInt(m));
  }
  const c = [0, 1, 2, 3, 4, 5].map((j) => ((5 - j) % 2 === 0 ? 1n : -1n) * e[5 - j]);
  const kk = Number(k);
  return { c, roots: roots.map((y) => add(mul(y, y), [kk * y[0], kk * y[1]])) };
}

function quinticGroup(f: Poly): GaloisGroup | undefined {
  const a = BigInt(f[5]);
  // a⁴·f(x/a): monic, with roots a·αᵢ.
  let monic = [0, 1, 2, 3, 4, 5].map((k) => BigInt(f[k]) * a ** BigInt(Math.max(0, 4 - k)));
  monic[5] = 1n;
  solve(f, re, im);
  const lead = f[5];
  let roots: Complex[] = [0, 1, 2, 3, 4].map((i) => [lead * re[i], lead * im[i]]);

  let solvable = false;
  for (let k = 1n; ; k++) {
    const { coefficients: h, roots: y } = depress(monic, roots);
    const R = sexticResolvent(h[3], h[2], h[1], h[0]);
    const dR = R.slice(1).map((c, i) => BigInt(i + 1) * c);
    const found: bigint[] = [];
    for (const perm of COSETS) {
      const [x, v] = theta(perm.map((i) => y[i]));
      if (Math.hypot(x, v) > ROUNDABLE) return undefined;
      if (Math.abs(v) > 1e-6 * (1 + Math.abs(x))) continue;
      const m = BigInt(Math.round(x));
      if (evaluate(R, m) === 0n) found.push(m);
    }
    if (found.length === 0) break; // Gal f ⊄ F₂₀
    if (found.some((m) => evaluate(dR, m) !== 0n)) {
      solvable = true;
      break;
    }
    // A repeated root says nothing: transform and try again.
    if (k > 6n) return undefined;
    const next = tschirnhaus(monic, roots, k);
    monic = next.c;
    roots = next.roots;
  }

  const square = isSquare(discriminantExact(f));
  if (!solvable) return square ? "A5" : "S5";
  if (!square) return "F20";
  let good = 0;
  for (const p of primesBelow(5000)) {
    const degrees = factorDegrees(f, p);
    if (!degrees) continue;
    if (degrees.join(",") === "1,2,2") return "D5";
    if (++good >= 200) break;
  }
  return "C5";
}
