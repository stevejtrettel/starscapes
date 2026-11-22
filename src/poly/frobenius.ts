/**
 * Factorisation patterns modulo primes.
 *
 * DEDEKIND. For a prime p not dividing a_d·disc f, the degrees of the
 * irreducible factors of f mod p are the cycle type of the Frobenius at p,
 * a permutation of the roots of f in Gal(f).
 *
 * CHEBOTAREV. Every cycle type of an element of Gal(f) occurs, for a
 * proportion of primes equal to its proportion in the group.
 *
 * So a factorisation pattern mod p proves that Gal(f) contains an element
 * of that cycle type (which can rule groups out), and the set of patterns
 * over many primes identifies Gal(f) in degrees ≤ 5, where no two
 * transitive groups have the same set of cycle types. The second is a
 * statistical statement, not a proof, and is used as a test oracle.
 *
 * Arithmetic is in float64 with p < 2²⁶, so that products of residues
 * stay below 2⁵³.
 */

/** f mod p, ascending, with trailing zeros removed. */
function reduce(f: ArrayLike<number | bigint>, p: number): number[] {
  const P = BigInt(p);
  const out = Array.from(f, (c) => {
    const r = typeof c === "bigint" ? Number(((c % P) + P) % P) : ((c % p) + p) % p;
    return r;
  });
  return trim(out);
}

function trim(a: number[]): number[] {
  while (a.length > 0 && a[a.length - 1] === 0) a.pop();
  return a;
}

function inverse(a: number, p: number): number {
  // Extended Euclid.
  let [r0, r1, s0, s1] = [a, p, 1, 0];
  while (r1 !== 0) {
    const q = Math.floor(r0 / r1);
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  return ((s0 % p) + p) % p;
}

/** a mod m, m monic. */
function remainder(a: readonly number[], m: readonly number[], p: number): number[] {
  const r = a.slice();
  const n = m.length - 1;
  for (let k = r.length - 1; k >= n; k--) {
    const c = r[k];
    if (c === 0) continue;
    for (let j = 0; j <= n; j++) r[k - n + j] = (r[k - n + j] - ((c * m[j]) % p) + p) % p;
  }
  return trim(r.slice(0, Math.max(0, Math.min(r.length, n))));
}

/** Quotient of a by m (m monic). */
function quotient(a: readonly number[], m: readonly number[], p: number): number[] {
  const r = a.slice();
  const n = m.length - 1;
  const q = new Array<number>(Math.max(0, r.length - n)).fill(0);
  for (let k = r.length - 1; k >= n; k--) {
    const c = r[k];
    q[k - n] = c;
    if (c === 0) continue;
    for (let j = 0; j <= n; j++) r[k - n + j] = (r[k - n + j] - ((c * m[j]) % p) + p) % p;
  }
  return trim(q);
}

function multiplyMod(a: readonly number[], b: readonly number[], m: readonly number[], p: number): number[] {
  if (a.length === 0 || b.length === 0) return [];
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0) continue;
    for (let j = 0; j < b.length; j++) out[i + j] = (out[i + j] + ((a[i] * b[j]) % p)) % p;
  }
  return remainder(out, m, p);
}

function powerMod(base: readonly number[], e: number, m: readonly number[], p: number): number[] {
  let result = [1];
  let b = remainder(base, m, p);
  while (e > 0) {
    if (e % 2 === 1) result = multiplyMod(result, b, m, p);
    b = multiplyMod(b, b, m, p);
    e = Math.floor(e / 2);
  }
  return result;
}

function monic(a: readonly number[], p: number): number[] {
  const inv = inverse(a[a.length - 1], p);
  return a.map((c) => (c * inv) % p);
}

function gcd(a: readonly number[], b: readonly number[], p: number): number[] {
  let [x, y] = [trim(a.slice()), trim(b.slice())];
  while (y.length > 0) {
    const r = remainder(x, monic(y, p), p);
    [x, y] = [y, r];
  }
  return x.length === 0 ? x : monic(x, p);
}

/**
 * The degrees of the irreducible factors of f mod p, ascending, by
 * distinct-degree factorisation; null if p divides the leading
 * coefficient or f mod p has a repeated factor (p | disc f).
 */
export function factorDegrees(f: ArrayLike<number | bigint>, p: number): number[] | null {
  const n = f.length - 1;
  let g = reduce(f, p);
  if (g.length !== n + 1) return null;
  g = monic(g, p);
  const derivative = trim(g.slice(1).map((c, k) => (c * (k + 1)) % p));
  if (gcd(g, derivative, p).length > 1) return null;

  const degrees: number[] = [];
  let h = [0, 1]; // x
  for (let k = 1; 2 * k <= g.length - 1; k++) {
    h = powerMod(h, p, g, p);
    const hx = h.slice();
    while (hx.length < 2) hx.push(0);
    hx[1] = (hx[1] - 1 + p) % p;
    const common = gcd(g, trim(hx), p);
    const found = common.length - 1;
    for (let i = 0; i < found / k; i++) degrees.push(k);
    if (found > 0) {
      g = quotient(g, common, p);
      h = remainder(h, g, p);
    }
  }
  if (g.length - 1 > 0) degrees.push(g.length - 1);
  return degrees.sort((x, y) => x - y);
}

/** The primes below n. */
export function primesBelow(n: number): number[] {
  const sieve = new Uint8Array(n);
  const out: number[] = [];
  for (let i = 2; i < n; i++) {
    if (sieve[i]) continue;
    out.push(i);
    for (let j = i * i; j < n; j += i) sieve[j] = 1;
  }
  return out;
}

/** The cycle types of Frobenius at the good primes below n, as strings like "1,1,2". */
export function cycleTypes(f: ArrayLike<number | bigint>, n: number): Set<string> {
  const out = new Set<string>();
  for (const p of primesBelow(n)) {
    const degrees = factorDegrees(f, p);
    if (degrees) out.add(degrees.join(","));
  }
  return out;
}
