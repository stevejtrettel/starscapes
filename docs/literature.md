# Literature

A survey made in November 2026 for the rewrite. Each entry says what it
is used for here. Provenance tags, because not everything could be opened:

- **[read]** the paper's text was read (PDF) during the survey;
- **[snippet]** only search-result excerpts were seen;
- **[memory]** recalled, not re-checked — verify before relying on it.

Statements that are this project's own derivations rather than the
source's are marked *(ours)*.

---

## 1. Starscapes

**Harriss, Stange, Trettel — Algebraic Number Starscapes.**
[arXiv:2008.07655](https://arxiv.org/abs/2008.07655) **[read]**
- Populations are coefficient boxes or balls, solved by brute force
  (§1.5); §7.4 asks for algorithms that "efficiently predict which
  polynomials need to be solved for a given region" and suggests using
  PSL₂(ℤ). `fibre/` is an answer to the first; the second is open (§9.1
  of mathematics.md).
- Sizing: hyperbolic radius ∝ 1/(root discriminant) = |Δ|^(−1/d); Fig. 35
  gives the sizings matched to Sprindžuk's exponent, |Δ|^(−(d+1)/(4d−4))
  among them. In the notation of `style/sizeLaw.ts` these are β = 1 with
  κ = 1 (quadratics), κ = 4/3 (cubics), and κ = (d+1)/2 *(ours)*.
- §5.2.1: sizes should be PSL₂(ℤ)-periodic like the positions; Δ is, the
  naive height is not.
- Quadratics: the root map is an isometry from the Klein model to ℍ;
  rational planes give rational geodesics; repulsion and Dirichlet/Roth
  type theorems in the hyperbolic metric with exponents 3/2 and 2 (§6).
- Cubics: real cubics with Δ < 0 form the unit tangent bundle of ℍ, the
  complex root giving the point and the real root the direction (§4.3);
  planar starscapes embed except along at most one fibre (Cor. 4.30).
- §7.2: the starscape curve through two polynomials f₁, f₂ is
  Re f₁·Im f₂ = Re f₂·Im f₁ — the curve followed by `fibre/pencilScan.ts`.

**Dorfsman-Hopkins, Xu.** [arXiv:2107.06328](https://arxiv.org/abs/2107.06328)
**[read]** Monic polynomials of degree ≤ 5, brightness by 1/√|D| or by a
Galois-theoretic "rigidity".

**Harriss, Stange.** [arXiv:2610.02655](https://arxiv.org/abs/2610.02655)
**[read]** A shader re-illustration of the starscapes in which Diophantine
approximation produces the image directly (the approach of `shaders.tex`).

---

## 2. How algebraic numbers are distributed

**Götze, Kaliada, Zaporozhets — Distribution of complex algebraic numbers.**
[arXiv:1410.3623](https://arxiv.org/abs/1410.3623) **[read]**
Theorem 2.1: the number of algebraic numbers of degree ≤ n and height ≤ Q
in Ω is Qⁿ⁺¹/(2ζ(n+1))·∫_Ω ψ + O(Qⁿ), with ψ an explicit integral; for
n = 2, ψ(x + iy) = 8y/3 on {|z| ≤ 1, |x| ≤ ½}, y/(3|x|³) on
{(|x| − 1)² + y² ≤ 1, |x| > ½}, and 8y/(3|z|⁶) elsewhere. ψ ~ A·|y| near
the real axis; ψ(1/z) = |z|⁴ψ(z).
*Used:* ψ is Proposition 2.1 of mathematics.md integrated over a box
*(ours)*; the n = 2 closed form is a test of `catalogue/box.ts`.

**Kaliada — real algebraic numbers** ([arXiv:1405.1627](https://arxiv.org/abs/1405.1627)),
**Koleda — real algebraic integers** ([arXiv:1706.10296](https://arxiv.org/abs/1706.10296)) **[read]**
The real analogues; algebraic integers of degree n are distributed like
algebraic numbers of degree n − 1. No paper was found on *complex*
algebraic integers; the same scaling suggests Qⁿ·ψ_(n−1) for monic degree
n, which matched a brute-force count for monic cubics to within 3–11%
at Q = 60 *(ours, unproved)*.

**Götze, Koleda, Zaporozhets — joint distribution of conjugates.**
[arXiv:1703.02289](https://arxiv.org/abs/1703.02289) **[read]**
For any weighted ℓ_p height the limit density is the zero-correlation
function of a random polynomial with independent coefficients; Thm 5.7
gives the density of the full root configuration as √|D|/h^(n+1) up to
constants. They note the method does not cover the Mahler measure.

**Counts by Weil height / Mahler measure** (Masser–Vaaler, Chern–Vaaler,
Barroero, Grizzard–Gunther [arXiv:1609.08720](https://arxiv.org/abs/1609.08720)) **[read, via the last]**
Counts only, no spatial density.

**Random polynomials.** Edelman–Kostlan
([arXiv:math/9501224](https://arxiv.org/abs/math/9501224)) **[read]**:
Kac's formula, and the density of complex zeros for Gaussian coefficients.
Shepp–Vanderbei for real Gaussian coefficients **[memory]**.

---

## 3. Discriminants, separation, approximation

- **Mahler's separation bound** **[read, as restated in arXiv:1407.6388]**:
  sep(p) ≥ √3·n^(−(n+2)/2)·|D(p)|^(1/2)/(Σ|aₖ|)^(n−1).
- **Small discriminants.** Kaliada–Götze–Kukso
  ([arXiv:1307.3983](https://arxiv.org/abs/1307.3983)) **[read]**: cubics
  of height ≤ Q with |D| ≤ X number ≍ Q^(2/3)·X^(5/6).
  Beresnevich–Bernik–Götze ([arXiv:0906.4286](https://arxiv.org/abs/0906.4286))
  **[read]**: close conjugate pairs.
- **Exponents of approximation.** Bugeaud–Evertse
  ([arXiv:0709.1556](https://arxiv.org/abs/0709.1556)) **[read]**;
  Sprindžuk: almost every complex number is approximable by algebraic
  numbers of degree ≤ n with exponent (n + 1)/2 in the height (n + 1 on
  the real line). These are the expected sizes of the empty regions
  around a point, and the source of the critical size laws.

---

## 4. Binary cubic forms

**Belabas — A fast algorithm to compute cubic fields** (Math. Comp. 1997;
[author's copy](https://www.math.u-bordeaux.fr/~kbelabas/research/mathcomp97.pdf)) **[read]**
For negative discriminant he reduces, following Mathews and Berwick, by
the quadratic factor: F = (x − θy)(Ax² + Bxy + Cy²) is reduced iff
0 < |B| < A < C — i.e. iff the complex root lies in the fundamental domain
— and gives loop bounds enumerating all reduced forms with |disc| ≤ X in
essentially linear time. He uses the identity
disc F = (B² − 4AC)·(Aθ² + Bθ + C)², which is δ⁴ = 4|disc|.
*Used:* `catalogue/cubics.ts` restricted to the fundamental domain is this
enumeration; the test counts its classes. PARI's `nflist` implements it.

**Cremona — Reduction of binary cubic and quartic forms** (LMS JCM 1999;
[preprint](https://johncremona.github.io/papers/r34jcm.pdf)) **[read]**;
**Stoll, Cremona — On the reduction theory of binary forms**
([preprint](https://www.mathe2.uni-bayreuth.de/stoll/papers/reduction-part-1.pdf)) **[read]**;
**Hutz, Stoll** ([arXiv:1805.08579](https://arxiv.org/abs/1805.08579)) **[read]**
Julia's covariant z(F) ∈ ℍ, defined for every degree, with better
coefficient bounds than Mathews reduction. For a cubic with roots r, z it
is *not* the complex root: z_Julia = (L·s + 2y²·r + i√3·y·L)/(L + 2y²),
L = |z − r|² *(derived during the survey; e.g. x³ + 1 has z = e^(iπ/3)
and z_Julia = i)*. For quartics Cremona reduces by invariants (I, J).

**Bhargava, Shankar, Tsimerman — On the Davenport–Heilbronn theorems and
second order terms.** [arXiv:1005.0672](https://arxiv.org/abs/1005.0672) **[read]**
Theorem 5 (Davenport–Shintani): the number of GL₂(ℤ)-classes of
irreducible binary cubic forms with −X < disc < 0 is
(π²/24)·X + ζ(2/3)Γ(1/3)(2π)^(1/3)/(10Γ(2/3))·X^(5/6) + O(X^(3/4+ε)).
*Used:* `test/density.test.ts`.

**Reference counts** for further tests: complex cubic fields with
|d| ≤ 10², 10³, 10⁴, 10⁵, 10⁶ number 7, 127, 1 520, 17 041, 182 417
(Belabas, Table 6.3 **[read]**); reproducing them needs the
Davenport–Heilbronn maximality test on top of the reduced forms.

**Taniguchi–Thorne** ([arXiv:1102.2914](https://arxiv.org/abs/1102.2914)),
**Bhargava–Shankar** ([arXiv:1006.1002](https://arxiv.org/abs/1006.1002)),
**Bhargava–Yang** ([arXiv:1312.7339](https://arxiv.org/abs/1312.7339)) **[read]**
Shintani zeta residues; counting quartic forms by height H(I, J); counting
forms of any degree by Julia invariant.

---

## 5. Lattice points near a subspace

For deep zooms of high-degree boxes (mathematics.md §9.2). The survey
could not open the primary sources here; the algorithmic content below was
re-derived and checked by experiment rather than read.

- **Fincke–Pohst** (Math. Comp. 44, 1985) **[snippet]**; Cohen, *A Course
  in Computational Algebraic Number Theory*, Algorithms 2.7.5 and 2.7.7
  **[memory]**: all lattice vectors in an ellipsoid, by a tree search on
  the Cholesky form after LLL reduction.
- **Kannan–Lenstra–Lovász** (Math. Comp. 50, 1988) **[snippet]**: the
  lattice with form ‖g‖² + C²|g(α)|² finds the minimal polynomial of an
  approximate root. Enumerating its short vectors instead of taking the
  first lists *all* polynomials of bounded norm with a nearby root.
- **Completeness bound** *(ours)*: if f has a root within ρ of z and
  ‖f‖₂ ≤ R then |f(z)| ≤ R·ρ·(Σ k²(|z| + ρ)^(2k−2))^(1/2).
- A reference implementation in exact arithmetic matched brute force in
  six windows (degrees 3–4), with a search tree 1.1–1.7 times the size of
  its output after LLL and conditioning adequate down to window radius
  3·10⁻⁹ *(survey experiment, code not kept)*.
- Pitfalls found: never run Cholesky on the unreduced form at deep zoom;
  windows touching ℝ are a different (codimension-1) problem; a window
  containing an algebraic number of low height is flooded by multiples of
  its minimal polynomial.

---

## 6. Other families

Mostly **[snippet]** or **[memory]** — the survey could not open these.

- **Coefficients in a finite set** (Littlewood ±1, Newman 0/1, {−1,0,1}).
  The closure of the roots in the unit disc is {z : 0 ∈ attractor of
  w ↦ zw + c}. Bousch (connectedness); Odlyzko–Poonen (0/1); Bandt;
  Calegari–Koch–Walker ([arXiv:1410.8542](https://arxiv.org/abs/1410.8542))
  (holes, "traps"); Baez–Christensen–Derbyshire
  ([arXiv:2310.00326](https://arxiv.org/abs/2310.00326)). The exact
  algorithm is a tree search on the partial sums pruned by
  |remaining terms| ≤ m·|z|^k/(1 − |z|), run on the reversed polynomial
  when |z| > 1; a tree that dies proves there is no root of any degree.
- **Entropies of interval maps.** Thurston
  ([arXiv:1402.2008](https://arxiv.org/abs/1402.2008)), Tiozzo
  ([arXiv:1310.7647](https://arxiv.org/abs/1310.7647)), the "Master
  Teapot" ([arXiv:1902.10805](https://arxiv.org/abs/1902.10805),
  [arXiv:1909.10675](https://arxiv.org/abs/1909.10675)): Galois conjugates
  of growth rates; computationally, ±1 polynomials restricted to
  admissible kneading sequences.
- **Pisot, Salem, small Mahler measure.** Boyd's algorithm; Mossinghoff's
  lists. Natural as colourings (conditions on the whole root set) once all
  roots are at hand.
- **Other rings.** Stange's Schmidt arrangements
  ([arXiv:1410.0417](https://arxiv.org/abs/1410.0417)) draw the orbit of
  ℝ̂ under PSL₂(O_K). Quadratics over ℤ[i] have a root pair = a geodesic
  of ℍ³ and no "upper half plane"; a bound on the discriminant alone
  leaves infinitely many in every window, so a different truncation is
  needed. No published picture of this family was found.
- **Bohemian matrices** (eigenvalues of matrices with entries in a finite
  set): density images only, no inverse algorithm known.
- **Trinomials** xⁿ + ax^k + b are planes in the sense of
  `catalogue/plane.ts` and need nothing new.

---

## 7. Solving and certifying

- **Aberth–Ehrlich** with Bini's starting points and stopping rule (Bini
  1996; code read: `polzeros` in
  [polyroots-fortran](https://github.com/jacobwilliams/polyroots-fortran))
  **[read]**. `roots/aberth.ts` is the plain iteration from staggered
  radii about one circle, adequate for the small coefficients used so far
  (about 7 sweeps per quartic); Bini's Newton-polygon start is the upgrade
  for coefficients of widely different sizes.
- **Smith's bound** (1970) **[snippet + checked numerically]**: for
  distinct approximations zᵢ the discs of radius
  n·|p(zᵢ)|/(|a_n|·∏_{j≠i}|zᵢ − zⱼ|) contain all roots, k roots in each
  component of k discs. With a running error bound on |p(zᵢ)| this
  certifies isolation, and realness, in float64; on 80 000 random
  polynomials of degree ≤ 20 every squarefree one was certified.
- **Exact invariants.** Subresultant resultants are about ten times faster
  than Bareiss on the Sylvester matrix in BigInt (measured), should
  `poly/discriminant.ts` become a bottleneck. Irreducibility in higher
  degree: factor-degree patterns modulo small primes certify most
  polynomials; the rest by rounding products over subsets of the computed
  roots and exact division. Galois groups for d ≤ 5 by resolvents
  (decision tables in the survey notes; not implemented).
