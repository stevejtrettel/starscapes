# The mathematics of the code

Every module in `src/` implements one definition or one proposition from
this document; the section headings name the module. Statements marked
**[tested]** are checked by the test suite against something independent
of the code that implements them — brute force, or a published theorem —
and §8 lists which test checks what. References are in
[literature.md](literature.md); "HST" is Harriss–Stange–Trettel,
*Algebraic Number Starscapes*.

Notation. f = Σ aₖxᵏ ∈ ℤ[x] has exact degree d and a_d > 0. z = s + iy is
a point of the upper half plane ℍ, n = |z|². A *window* W is a closed
rectangle [s₀, s₁] × [y₀, y₁] ⊂ ℍ̄.

---

## 1. Stars and catalogues — `catalogue/star.ts`

**Definition.** A *star* is a pair (f, z) with f(z) = 0, z ∈ ℍ, f′(z) ≠ 0.
A *catalogue* is a set of stars with finitely many in each compact subset
of ℍ. A *starscape* is a catalogue together with a *size law*, a positive
function r(f, z); its picture is the union of the discs D(z, r(f, z)).

The set of all stars of a given degree is dense in ℍ, so every picture is
a truncation, and the truncation is part of the mathematics. The code
makes the three choices separately: the *family* (which sublattice of
ℤ[x]), the *size law* (§6), and the *truncation* — which for the infinite
families is derived from the size law ("every star at least so large",
§4), not chosen independently of it.

The one analytic quantity carried by a star is |f′(z)|. Everything below
— densities, invariants, sizes, enumeration bounds — is expressed through it.

---

## 2. Fibre coordinates — `fibre/tail.ts`

Write a polynomial as *head* plus *tail*:

    f = x²·h(x) + a₁x + a₀,        h = (a₂, …, a_d).

For z ∈ ℍ the numbers 1, z are independent over ℝ, so for each head there
is exactly one tail with f(z) = 0:

    Ψ_h(z) = (a₁, a₀),    a₁ = −Im(z²h(z))/y,    a₀ = −Re(z²h(z)) − a₁s.

Thus (h, z) ∈ ℝ^(d−1) × ℍ are global coordinates on the incidence variety
{(f, z) : f(z) = 0}, and

> the stars with head h are the points of Ψ_h⁻¹(ℤ²).

For quadratics, h = a and Ψ_a(z) = a·(−2s, s² + y²): the familiar picture
is the pull-back of the square lattice by one explicit map for each a.

**Proposition 2.1 (root density) [tested].** |det DΨ_h(z)| = |f′(z)|²/y,
where f is the polynomial with head h and root z.

*Proof.* Differentiate f(z) = 0 at fixed head: f′(z)·dz + z·da₁ + da₀ = 0.
The real-linear map (da₁, da₀) ↦ z·da₁ + da₀ from ℝ² to ℂ = ℝ² has matrix
(s 1; y 0), of determinant −y, and multiplication by f′(z) has determinant
|f′(z)|². ∎

So the stars with head h have density |f′(z)|²/y per unit Euclidean area:
|f′| is the exchange rate between coefficient space and root space.

**Corollary 2.2 (Götze–Kaliada–Zaporozhets) [tested].** The number of
roots in a region Ω ⊂ ℍ of the polynomials of degree n with all |aₖ| ≤ Q
and a_n > 0 is

    (Qⁿ⁺¹/2) ∫_Ω ψ(z) dA + O(Qⁿ),    ψ(z) = (1/y) ∫_{D_z} |f′(z)|² dh,

where D_z is the set of heads h ∈ [−1, 1]^(n−1) whose tail Ψ_h(z) also
lies in [−1, 1]². This is Theorem 2.1 of their paper; in tail coordinates
it is Proposition 2.1 integrated over the heads of a box. For n = 2 it
evaluates to ψ = (8/3)·y·min(1, |z|⁻², (2|s|)⁻¹)³.

**Two generalisations**, both used.
- Any two monomials may play the role of (1, x), and more generally any
  pair (Q, R) of polynomials with Q(z), R(z) independent over ℝ: the
  family aP + bQ + cR is then, for each a, a 2-parameter family of roots
  — a *planar starscape* in the sense of HST (§5.4).
- With only the constant term free, f = p + t, the roots trace the curve
  {Im p = 0} as t varies: the *starscape curve* (HST §7.2) of the rational
  line p + t. This is what the enumeration in §5 follows.

---

## 3. The invariant δ and the density of stars — `catalogue/star.ts`

SL₂(ℝ) acts on binary forms F(x, y) of degree d by substitution and on
their roots by Möbius maps. For γ = (α β; γ δ) of determinant 1 and a
root θ of F with image θ′ = γ⁻¹θ,

    f_γ′(θ′) = (γθ′ + δ)^(d−2) · f′(θ),        Im θ = Im θ′ / |γθ′ + δ|².

**Proposition 3.1 [tested].** δ(f, z) := |f′(z)|·y^(−(d−2)/2) is invariant
under SL₂(ℝ).

δ is the local form of the discriminant: since disc f = ±a_d^(d−2) ∏ f′(zᵢ),

    d = 2:   δ = 2ay = |disc|^(1/2),
    d = 3:   δ² = 4y·[(b + 3as)² + a²y²] = 2|disc|^(1/2).

(For d = 3 write f = a(x − r)(x − z)(x − z̄); then r = −b/a − 2s and
|f′(z)| = 2ay·|z − r|.) For d ≥ 4 the discriminant involves the other
roots as well, and δ alone does not bound it — see §4.

**Proposition 3.2 (densities) [tested].** Per unit *hyperbolic* area
(dA/y²), the number of stars with δ ≤ Δ is asymptotically

    quadratics:    Δ³/6,
    all cubics:    πΔ⁴/16,

and per unit *Euclidean* area the number of *monic* cubic stars with
δ ≤ Δ is Δ³/(3√y).

*Proof.* By Proposition 2.1 the stars with a given head have Euclidean
density |f′|²/y = δ²·y^(d−3), hence hyperbolic density δ²·y^(d−1). Sum
over heads.
*Quadratics:* the head is a = δ/2y, so the count is Σ_{a ≤ Δ/2y} 4a²y³ ≈
(4y³/3)(Δ/2y)³.
*Cubics:* for fixed z, δ² is a positive definite quadratic form in the
head (a, b) of determinant 16y⁴, so {δ ≤ Δ, a > 0} is half an ellipse of
area πΔ²/8y², and the count is ∫₀^Δ δ²y² · d(πδ²/8y²) = πΔ⁴/16.
*Monic cubics:* a = 1 leaves b with (b + 3s)² = δ²/4y − y², two branches
with |db/dδ| ≈ 1/(2√y) each, and the count is ∫₀^Δ δ²·dδ/√y. ∎

That the first two are constants is the invariance of Lebesgue measure on
coefficient space under SL₂(ℝ): they are the densities of an invariant
measure on ℍ. Integrated over a fundamental domain they are classical:

- **Quadratics.** Over SL₂(ℤ)\ℍ (area π/3): (π/18)·X^(3/2) forms with
  |disc| ≤ X, the average of class numbers.
- **Cubics.** Over GL₂(ℤ)\ℍ (area π/6): (π²/24)·X classes of binary cubic
  forms with −X < disc < 0 — Davenport's theorem. Locating a cubic form by
  its complex root in the fundamental domain is exactly the reduction
  theory of Mathews and Belabas, so the cubic catalogue restricted to
  {0 ≤ s ≤ ½, |z| ≥ 1} is a list of reduced forms. Counting its irreducible
  members for X = 10⁵ gives 28 452 classes; the two-term asymptotic of
  Shintani (Bhargava–Shankar–Tsimerman, Thm 5) predicts 28 008 **[tested]**.
- **Monic cubics** (a heuristic, not compared with a source). Integrating
  Δ³/(3√y) up the strip 0 ≤ s < 1 to the height y ≈ (Δ/2)^(2/3), where
  δ ≥ 2y^(3/2) cuts it off, gives ≍ Δ^(10/3) = (4X)^(5/6) monic cubics
  with |disc| ≤ X up to translation.

In the notation of §6, the population of a family is

    #{δ ≤ Δ} ≈ const · Δ^D · y^(−w)    per unit Euclidean area,

| family | D | w |
|---|---|---|
| quadratics | 3 | 2 |
| all cubics | 4 | 2 |
| monic cubics | 3 | 1/2 |

---

## 4. Truncations — `catalogue/`

**δ-shells.** The basic truncation is {lo·y^e < δ ≤ hi·y^e}. With e = 0
it is "bounded discriminant", invariant under SL₂(ℤ). Other exponents
arise from size laws: the stars with r ≥ r_min under r = c·y^β·δ^(−κ) are
those with δ ≤ (c/r_min)^(1/κ)·y^(β/κ). A picture drawn at pixel size p
uses r_min proportional to p, so it is a *magnitude-limited* catalogue:
every star at least that large, none smaller. Shells with abutting bounds
partition a catalogue, which is how the explorer sends large stars first.

**Finiteness.** For fixed z, f′(z) is a real-linear function of the head,
ℝ^(d−1) → ℂ. For d ≤ 3 it is injective, δ is a norm on heads, and a shell
contains finitely many heads over a compact window (one interval for
d = 2, an ellipse for d = 3). For d ≥ 4 its kernel has dimension d − 3:
*no* bound on δ, or on any function of |f′(z)| and y, makes the catalogue
finite. Degree ≥ 4 needs a truncation that sees the whole polynomial. The
code offers the classical one, and one adapted to the paper:

- **boxes**, |aₖ| ≤ H, in any degree (`catalogue/box.ts`);
- **planes**, f = aP + bQ + cR with bounded integer (a, b, c), for any
  integer polynomials P, Q, R (`catalogue/plane.ts`).

Bounded discriminant is still finite on compact windows for d ≥ 4
(Birch–Merriman), but there are no usable coefficient bounds; see §9.

**Near the real axis.** A shell with e > 0 has no stars below
y = (δ_min/hi)^(1/e), where δ_min is the least δ an integer polynomial can
have (|disc| ≥ 3). With e ≤ 0 a window touching the real axis holds
infinitely many stars, and the enumerators refuse it.

---

## 5. Exact enumeration — `fibre/tailScan.ts`, `fibre/pencilScan.ts`

The problem: list every star of a catalogue in a window, with work
governed by the answer and not by the size of coefficient space. By §2
this is: for each head, list the lattice points of Ψ_h(W).

### 5.1 The tail scan

Fix a head and a₁, i.e. a polynomial p with only its constant term free.

**Theorem 5.1 [tested].** Let p ∈ ℝ[x] and

    T(p, W) = { t ∈ ℝ : p + t has a root in W }.

T(p, W) is a finite union of closed intervals. Its endpoints are among the
values t = −p(ζ) at the points ζ ∈ ∂W where p(ζ) is real, and the number
N(t) of roots of p + t in W changes by exactly ±1 as t passes such a value
transversally — by +1 iff −1/p′(ζ) points into W. N(t) = 0 for |t| large.

*Proof.* z is a root of p + t iff p(z) = −t, which forces p(z) real; the
roots depend continuously on t and can enter or leave W only through ∂W;
and dz/dt = −1/p′(z). ∎

On a horizontal edge, Im p(s + iy)/y is a polynomial in s of degree d − 1;
on a vertical edge it is a polynomial in y² of degree ⌊(d − 1)/2⌋. So
T(p, W) costs four real-root computations in one variable, for any degree,
and its integer points are read off by a sweep through the sorted
crossings. Every integer it yields is the constant term of a polynomial
with a root in W: nothing is solved in vain.

### 5.2 Heads

- **Quadratics** (`catalogue/quadratics.ts`). Everything is explicit: a
  runs over an interval given by the shell, b pins s = −b/2a, and c runs
  over the integers of a(s² + [y-range]²).
- **Cubics** (`catalogue/cubics.ts`). The shell confines (a, b) to the
  ellipse (b + 3as)² + a²y² ≤ hi²·y^(2e−1)/4. Because the ellipse depends
  on y, the window is cut into bands y ∈ (lo, 2·lo], on each of which it
  is constant up to a bounded factor; then c = a·y² − 3as² − 2bs has an
  explicit range, and the tail scan gives d. For a cubic pencil the edge
  polynomials are quadratics and lines, so the crossings are closed-form
  **[tested against the general scan]**. Monic cubics are the slice a = 1.
- **Boxes** (`catalogue/box.ts`). All heads of the box are visited, but a
  head is rejected without any scan when the window is too small for it to
  reach an integer a₁:

  **Lemma 5.2.** Along any path in W, |da₁| ≤ |f′(z)|·|dz|/y. (Immediate
  from the proof of Proposition 2.1.)

  For a wide window this prunes nothing and the method is plain box
  enumeration; for a small window almost every head costs one evaluation.

### 5.3 Pencils and planar families — `fibre/pencilScan.ts`, `catalogue/plane.ts`

Theorem 5.1 holds for any pencil p + tR: roots travel on the starscape
curve {Im(p·R̄) = 0} with velocity −R/(p + tR)′, and the count changes by
±1 at each transversal crossing of ∂W. The one difference is at infinity:
as t → ±∞ the roots tend to those of R, so N starts and ends at the number
of roots of R in W. On each edge the crossing condition is a polynomial of
degree ≤ deg p + deg R.

For a plane aP + bQ + cR this lists, for each (a, b), the integers c with
a root in the window **[tested]**. The quadratic catalogue is the plane
(x², x, 1); others in `presets.ts` are HST's ax³ + cx² + bx + c, the
depressed cubics, and the reciprocal quartics. If R has a non-real root ζ
at which some aP + bQ also vanishes, a whole line of the plane has ζ as a
root (for HST's family, ζ = i and a = b: the members (x² + 1)(ax + c)) —
a singular point of the planar starscape, the "black hole" of HST
Corollary 4.30.

### 5.4 What is not optimal

Work is proportional to the number of *scan lines* (head, a₁), not to the
number of stars. The two agree up to a constant when a typical line
carries an integer point, and diverge when the image Ψ_h(W) is thin:
close to the real axis for shells with e < 1, and in deep zooms of large
boxes. Both have known remedies that are not implemented (§9).

---

## 6. Size laws and ink — `style/sizeLaw.ts`, `render/raster.ts`

Every size law used so far belongs to one family,

    r(f, z) = c · y^β · δ(f, z)^(−κ)     (capped at cap·y).

| law | β | κ |
|---|---|---|
| hyperbolic radius c/√\|disc\|, quadratics (HST Fig. 1a) | 1 | 1 |
| hyperbolic radius ∝ \|disc\|^(−1/3), cubics (HST "root discriminant") | 1 | 4/3 |
| hyperbolic radius ∝ \|disc\|^(−1/2), cubics | 1 | 2 |
| Euclidean radius ∝ \|disc\|^(−1/4), cubics | 0 | 1 |
| Euclidean radius ∝ y/\|f′(z)\|, cubics | 1/2 | 1 |

β = 1 means the hyperbolic radius is a function of δ alone, so the picture
of an SL₂(ℤ)-invariant family is SL₂(ℤ)-invariant.

**Proposition 6.1 (ink) [tested].** Let the population be
≈ const·Δ^D·y^(−w) (§3). The fraction of the page covered by the stars
with δ ≤ Δ, at height y, is

    ink(y; Δ) ∝ c² · y^(2β−w) · ∫^Δ δ^(D−1−2κ) dδ.

*Proof.* Each star covers πc²y^(2β)δ^(−2κ), and there are
∝ Δ^(D−1)y^(−w) dΔ of them per unit area with δ ∈ dΔ. ∎

Three consequences.

1. **Critical exponent.** The ink converges iff κ > D/2. Then the picture
   has a limit as smaller stars are added, and zooming is magnification.
   At κ = D/2 each octave of δ contributes equally. For the full
   families of degree d = 2, 3 (D = d + 1) that is hyperbolic radius
   ∝ |disc|^(−(d+1)/(4d−4)), the sizing HST match to Sprindžuk's theorem
   (their Fig. 35a). Below it the ink grows like Δ^(D−2κ) without bound.

2. **Zoom.** A picture at pixel size p shows the stars with r ≥ p, i.e.
   Δ = (c·y^β/p)^(1/κ), so for κ < D/2

       ink ∝ c^(D/κ) · p^(2−D/κ) · y^(βD/κ−w).

   At fixed c it saturates as p → 0. It is constant under zoom iff
   c ∝ p^γ with **γ = 1 − 2κ/D**. For quadratics with κ = 1 this is the
   cube-root law found experimentally (history/experiments.md, E9); the
   same formula gives 1/3 for monic cubics with κ = 1 and for all cubics
   with κ = 4/3.

3. **Evenness.** The same expression is independent of y iff
   **β = wκ/D**. For quadratics with κ = 1 that is r = c·y^(2/3)/√|disc|,
   between the hyperbolic law (β = 1, ink ∝ y) and the Euclidean one. The
   presets `quadratics-even` and `cubics-even` use it.

**The picture as a measure.** A disc smaller than the sampling grid is not
enlarged to a visible dot: it deposits its area, and a pixel holding total
area A of such discs is covered with opacity 1 − e^(−A), the expected
coverage of small discs falling independently. Both renderers do this
(`render/raster.ts`; pass 2 of `live/gl/discs.ts`). The image is then a
rendering of the measure Σ πr²·δ_z, and by Proposition 6.1 it converges
as the magnitude limit decreases exactly when κ > D/2. Compositing is
order-independent in both modes (smallest disc on top, or additive), so
enumeration order never matters.

---

## 7. Arithmetic — `poly/`, `roots/`

- `discriminant.ts`: closed forms for d ≤ 3 in float64 with a stated exact
  range; any degree exactly, by Bareiss elimination on the Sylvester
  matrix in BigInt. Used to decide f′(z) = 0 (a repeated root is not a
  star) where floating point cannot.
- `rationalRoot.ts`: a cubic is reducible iff it has a rational root p/q,
  q | a_d; the known real root nominates p = round(q·r) and the candidate
  is verified by the integer q^d·f(p/q).
- `closedForm.ts`: quadratics and cubics, branching on the exact sign of
  the discriminant. `aberth.ts`: the Aberth–Ehrlich iteration for d ≥ 4.
- `realRoots.ts`: real roots in an interval by recursion on the derivative
  (monotone pieces, then safeguarded Newton) — the edge solver of §5.

---

## 8. What is tested

| statement | test | compared with |
|---|---|---|
| Prop. 2.1, root density | `fibre.test` | finite differences of Ψ_h |
| Cor. 2.2, box density, n = 2 | `density.test` | the closed form of Götze–Kaliada–Zaporozhets, to 1% |
| Prop. 3.1, δ⁴ = 4\|disc\| | `catalogue.test` | exact discriminant |
| Prop. 3.2, three densities | `density.test` | counts, to 3% |
| Davenport–Shintani | `density.test` | 28 452 classes at X = 10⁵; two-term formula to 2% |
| Thm 5.1, tail scan, d = 2…6 | `fibre.test` | solving p + t for every t |
| closed-form cubic crossings | `fibre.test` | the general crossings |
| pencil scan | `plane.test` | solving p + tR for every t |
| catalogues: quadratic, cubic, monic, box (d = 4, 5, 6), planes | `catalogue.test`, `plane.test` | brute force over coefficient boxes |
| shells partition; shell = {r_min ≤ r < r_max} | `catalogue.test`, `style.test` | a deeper catalogue, filtered |
| Prop. 6.1: ink formula, zoom exponent, even β | `style.test` | measured Σπr² |
| raster: order independence, area-true dust | `style.test` | direct computation |
| discriminant, solvers, real roots | `poly.test`, `roots.test` | Vieta, residuals, ∏(αᵢ − αⱼ)² |

---

## 9. Not done

1. **Transport by PSL₂(ℤ).** For the invariant families the stars near
   the real axis are Möbius images of stars in the fundamental domain.
   Enumerating reduced forms once and transporting them over the tiles
   γ𝔉 meeting the window would make work proportional to output there
   (§5.4), and is the algorithmic use of the symmetry asked for in HST
   §7.4.
2. **Deep zooms of high-degree boxes.** The polynomials with a root near
   z are the lattice points of a thin slab around the hyperplane pair
   Re f(z) = Im f(z) = 0. LLL-reducing that lattice and enumerating by
   Fincke–Pohst lists them with work proportional to their number, at any
   zoom; the head loop of `box.ts` does not.
3. **Quartics by invariants.** Bounded (I, J), equivalently bounded Julia
   invariant, is an SL₂(ℤ)-invariant truncation with compact fibres
   (Cremona; Bhargava–Shankar), the analogue of bounded discriminant.
4. **Certified roots.** Roots from `aberth.ts` are not certified; Smith's
   disc bound with a running error estimate would certify isolation and
   the real/non-real split in float64.
5. **Other rings and alphabets.** Quadratics over ℤ[i] (stars in ℂ, the
   Bianchi group in place of PSL₂(ℤ)); polynomials with coefficients in a
   finite set, where the natural exact algorithm is a pruned tree search.

Sketches and sources for each are in [literature.md](literature.md).
