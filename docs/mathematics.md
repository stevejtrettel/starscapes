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
| quartics of shape \|χ\| ≤ τ (§4.1) | 5 | 2 |

---

## 4. Truncations — `catalogue/`

**δ-shells.** The basic truncation is {lo·y^e < δ ≤ hi·y^e}. With e = 0
it is "bounded discriminant", invariant under SL₂(ℤ). Other exponents
arise from size laws: the stars with r ≥ r_min under r = c·y^β·δ^(−κ) are
those with δ ≤ (c/r_min)^(1/κ)·y^(β/κ). A picture drawn at pixel size p
uses r_min proportional to p, so it is a *magnitude-limited* catalogue:
every star at least that large, none smaller. Shells with abutting bounds
partition a catalogue, which is how the explorer sends large stars first.

A disc centred outside the window can reach into it, so the stars of a
picture are sought in the window enlarged by a margin. The margin is
taken shell by shell — the stars with r ∈ [ρ, 2ρ) in the window enlarged
by 2ρ (`render/picture.ts`, `plan`) — because one margin for all, the
largest radius, would at deep zoom enumerate a region many times the
view. With it, and c ∝ p^γ (§6), the number of stars per view is constant
under zoom **[tested; measured 41.7–42.5 thousand for quadratics from 1×
to 10⁴×]**.

**Finiteness.** For fixed z, f′(z) is a real-linear function of the head,
ℝ^(d−1) → ℂ. For d ≤ 3 it is injective, δ is a norm on heads, and a shell
contains finitely many heads over a compact window (one interval for
d = 2, an ellipse for d = 3). For d ≥ 4 its kernel has dimension d − 3:
*no* bound on δ, or on any function of |f′(z)| and y, makes the catalogue
finite. Degree ≥ 4 needs a truncation that sees more of the polynomial.
The code offers three:

- **quartics by size and shape** (§4.1): the one further invariant of a
  quartic star is bounded along with δ. Invariant under SL₂(ℤ), like
  bounded discriminant in degrees 2 and 3;
- **boxes and balls**, max |aₖ| ≤ H or Σ aₖ² ≤ R², in any degree
  (`catalogue/box.ts`);
- **planes**, f = aP + bQ + cR with bounded integer (a, b, c), for any
  integer polynomials P, Q, R (`catalogue/plane.ts`).

Bounded discriminant is still finite on compact windows for d ≥ 4
(Birch–Merriman), but not for a reason an enumerator can use: for
quartics the set {|disc| ≤ X} is unbounded in the coordinates of §4.1.

**Near the real axis.** A shell with e > 0 has no stars below
y = (δ_min/hi)^(1/e), where δ_min is the least δ an integer polynomial can
have (|disc| ≥ 3). With e ≤ 0 a window touching the real axis holds
infinitely many stars, and the enumerators refuse it.

### 4.1 Quartics: size and shape — `catalogue/quartics.ts`

A quartic star has two invariants where a quadratic or cubic star has
one. For f = a₄x⁴ + … + a₀ and z = s + iy put

    U = f″(s)/2 = a₂ + 3a₃s + 6a₄s²,        w = f‴(s)/6 = a₃ + 4a₄s,
    P = y²w² + (2a₄y² − U)².

**Proposition 4.1 [tested].** δ² = 4P, and χ := U/√P is invariant under
SL₂(ℝ). If f has two real roots r₁, r₂ then χ = cos(θ/2) ∈ (−1, 1), θ the
angle at z between the geodesic rays to r₁ and r₂; if it has a second
pair z₂, z̄₂ then |χ| = coth d(z, z₂) > 1. The classical invariants are

    I = 4U² − 3P,      J = 2U(8U² − 9P),      disc f = −4(P − U²)·P².

*Proof.* Write f = Q_z·g with Q_z = x² − 2sx + |z|² and g a real
quadratic, and split g = t·Q_z + g₀ with g₀ apolar to Q_z. Then U = 2y²t
and P = |g(z)|² = |g₀(z)|², both visibly invariant, and the identities
need only be computed at z = i. ∎

So δ is the *size* of the star and χ the *shape* of the root
configuration seen from z. For fixed z and δ the cofactors t·Q_z + g₀,
t → ∞, are all admissible — the second pair of roots closing in on z — and
infinitely many are integral in every window. Bounding the shape removes
them:

    |χ| ≤ 1      exactly the quartics with two real roots;
    |χ| ≤ τ      also those with a second pair at distance ≥ arcoth τ.

The catalogue is {lo·y^e < δ ≤ hi·y^e, |χ| ≤ τ}. It is a compact region
of the (P, U)-plane, as is a bound on the height of (I, J) (the truncation
of Bhargava–Shankar): I and J have no common zero on P = 1, so bounded
(I, J) bounds P, and then U. The two differ in which compact region.

*Exact boundaries.* |χ| = 1 is populated: it is the quartics with a
double real root. Since |χ| ≤ 1 ⟺ disc f ≤ 0 and 27·disc = 4I³ − J², the
case τ = 1 is decided on integers. Also |disc| ≥ 1 gives the least δ of
the family: 4|P − U²|P² ≥ 1 with |P − U²| ≤ max(1, τ² − 1)·P.

**Proposition 4.2 (density) [tested].** Per unit hyperbolic area, the
quartic stars with δ ≤ Δ and |χ| ≤ τ number (πτ/40)·Δ⁵, asymptotically.

*Proof.* For fixed z the head (a₄, a₃, a₂) ↦ (p₁, p₂, U) = (yw,
2a₄y² − U, U) is linear of determinant 2y³, and P = p₁² + p₂². A head
carries stars of hyperbolic density δ²y³ = 4Py³ (as in Proposition 3.2).
The condition a₄ > 0 takes half of a region symmetric under f ↦ −f, so
the count is

    ½ ∫ 4Py³ · dp₁ dp₂ dU / 2y³  =  ½ ∫₀^(Δ²/4) 2P · 2τ√P · π dP  =  πτΔ⁵/40. ∎

The approach is slow, with relative error about −2.5/Δ at y ≈ 1
(measured: 0.80, 0.88, 0.91, 0.94 of the prediction at Δ = 12, 20, 30,
42) — the sum over a₄ ≥ 1 misses half the layer a₄ = 0. And it is not
uniform towards the real axis: see *reducible stars* in §5.5.

*Enumeration.* The formulas confine the head:

    |a₃ + 4a₄s| ≤ √P/y,      |2a₄y² − U| ≤ √P,      |U| ≤ τ√P,

so a₄ ≤ (1 + τ)√P/2y², then a₃, then a₂ = U − 3a₃s − 6a₄s² over a
parabola in s. For each head a₁ runs over an interval found from the tail
map and the tail scan (§5.1) gives a₀. Roots are by Ferrari's method
(§7). About 5–12 µs per star at y ≈ 1.

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
Where the curve {Im p = 0} is tangent to ∂W, the root touches the window
for a single t, an isolated point of T.

*Proof.* z is a root of p + t iff p(z) = −t, which forces p(z) real; the
roots depend continuously on t and can enter or leave W only through ∂W;
and dz/dt = −1/p′(z). ∎

On a horizontal edge, Im p(s + iy)/y is a polynomial in s of degree d − 1;
on a vertical edge it is a polynomial in y² of degree ⌊(d − 1)/2⌋. So
T(p, W) costs four real-root computations in one variable, for any degree,
and its integer points are read off by a sweep through the sorted
crossings. Every integer it yields is the constant term of a polynomial
with a root in W: nothing is solved in vain.

Tangencies are not a curiosity here. Window and band edges sit at simple
numbers, stars at algebraic ones, and a star whose curve has its lowest
point exactly on an edge occurs in practice (49x³ + 4x, at height 2/7).
The edge polynomial then has a double root, which rounding displaces by
the square root of its error; so double roots are detected with a
tolerance, and interval endpoints are widened by 10⁻⁶ before rounding to
integers. Exact membership is decided on the solved root.

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

### 5.4 Where the head loops are inefficient

Work is proportional to the number of *scan lines* (head, a₁), not to the
number of stars. The two agree up to a constant when a typical line
carries an integer point, and diverge when the image Ψ_h(W) is thin. A
head carries a star only if roughly hi·y^(e + 1/(d−1)) ≳ 1, so the loops
fail close to the real axis: for cubics with |disc| ≤ 1024 in the strip
0.002 ≤ y ≤ 0.05, a third of the stars had been found after 40 seconds.
The same happens in deep zooms of large boxes. Each has its remedy:
symmetry (§5.5) and lattice reduction (§5.6).

### 5.5 Enumeration by symmetry — `modular/`, `catalogue/transport.ts`

For the families invariant under SL₂(ℤ) — all quadratics, all cubics,
quartics of bounded shape — the remedy is the symmetry itself. Let 𝔉 = {|s| ≤ ½, |z| ≥ 1} and call a
form *reduced* if its root lies in 𝔉. Since the group acts compatibly on
forms and roots and δ is invariant,

    stars in W  =  ⋃_γ  γ·{ (f, z) : z ∈ 𝔉 ∩ γ⁻¹W },

the union over the tiles γ𝔉 meeting W. In 𝔉 we have y ≥ √3/2, the heads
are few, and the direct enumerators do work proportional to their output;
near the real axis the tiles are many but each holds few stars. The strip
above takes 1.7 seconds.

*Tiles.* γ𝔉 meets W iff 𝔉 meets γ⁻¹W. The bounding box of a Möbius image
of a rectangle is found exactly: γz = a/c − c⁻²/(z + d/c), and the two
coordinates of u ↦ −1/u have no critical point inside a rectangle, so
their extremes lie on its edges at points that can be listed. The tiles
meeting a connected set are connected under adjacency (γ ↦ γT^±1, γS), so
a breadth-first search from the tile of one point of W finds them all.

*The boundary.* Stars on ∂𝔉 are common — they lie on rational geodesics —
and each must be given to exactly one tile. Floating point cannot do
this; integers can. With 𝔉 taken half-open, a quadratic (a, b, c) is
reduced iff −a < b ≤ a < c or 0 ≤ b ≤ a = c (Gauss), and for a cubic form
(αx + βy)(x² − 2sxy + ny²) = ax³ + bx²y + cxy² + dy³ the four integers

    d(d − b) + a(c − a) = (n − 1)·|α + βz|²,        ad − bc = 2s·|αz − β|²,
    ad − (a + b)(a + b + c) = (2s − 1)·|α(1 − z) + β|²,
    ad + (a − b)(a − b + c) = (2s + 1)·|α(1 + z) − β|²

carry the signs of |z| − 1, s, s − ½, s + ½ (Mathews; Belabas, Lemma 4.2)
**[tested]**. At the elliptic points i and ρ, fixed by S and by ST, a
star is seen from 2 or 3 tiles; the least γ in a fixed order keeps it.

A quartic has no such classical criterion (and may have two pairs of
roots, so the root must be named), but the question "is this root on the
imaginary axis" is one about integers: g(iv) = 0 iff the even and odd
parts of g vanish together at −v², which for g₃ ≠ 0 is
g₄g₁² − g₂g₁g₃ + g₀g₃² = 0. Each curve of ∂𝔉 is moved to the imaginary
axis by an integer substitution — x ∓ ½ for the sides, the Cayley map
w = (z − 1)/(z + 1) for the arc — and the test applied when floating
point puts the root within 10⁻⁷ of the curve **[tested]**.

*Infinity.* A reduced binary form may have a root at ∞, so that as a
polynomial its degree drops, and still be carried to a polynomial of full
degree. For cubics these are y·(bx² + cxy + dy²): the reducible cubics
whose rational root sits at the cusp of their tile. They are the quadratic
catalogue with δ = 2b·√y, the case a = 0 of the formula for δ. A quartic
form can have one root at ∞ (y times a cubic, δ = δ_cubic/√y, |χ| ≤ 1) or
two (y² times a quadratic bx² + …, δ = 2b, χ = 1).

*Reducible stars.* So the cusp of a tile holds reducible stars and
nothing else, and they are many. In a fixed window, as Δ → ∞, reducible
stars are of lower order (at Δ = 18, 30% of the quartic stars around
z = i have a rational root; the total is as Proposition 4.2 says). But
per tile they are not. For cubics they are of the order Δ⁴ of the
irreducible ones — in the strip 0.01 ≤ y ≤ 1.2 with 2 < δ ≤ 6, three
times as many. For quartics a tile holds *infinitely* many: the forms
y²·Q have δ = 2b at every height, i.e. the polynomials (qx − p)²·Q(x)
with Q a quadratic whose root is close to p/q have bounded δ. Near the
real axis, where tiles are small and wholly in view, the quartic family
is almost entirely these (in 0 ≤ s ≤ 1, 0.02 ≤ y ≤ 0.04 at Δ = 5:
880 thousand stars, 320 of them irreducible).

A picture of quartics is therefore a picture of the irreducible ones,
and these are a catalogue in their own right (`irreducibleCubics`,
`irreducibleQuartics`): the cusp forms are not enumerated at all, and the
remaining stars are tested exactly (§7) **[tested against the full
catalogue, sieved]**. The wide quartic view has 4·10⁵ irreducible stars
and takes 16 seconds; with the reducible ones it did not finish in
five minutes.

*Shells.* For e ≠ 0 the bound hi·y′^e refers to the height y′ of the
carried star. The piece of 𝔉 behind a tile is cut into cells over which
y′ varies by at most a factor 3/2; each is enumerated with the invariant
shell covering it, and membership is decided after carrying.

A carried star is completed from its integer coefficients by the same
code as a directly enumerated one, so the two methods produce identical
stars **[tested: equal as sets, coordinates bit for bit]**, and a window
can be split between them: `allQuadratics` and `allCubics` use the direct
loops above a crossover height and transport below it, `allQuartics`
transport everywhere below y = 1 (it is the faster at every height
measured). Coefficients grow
with the depth of the tile, like q^d for a tile at the cusp p/q; beyond
2⁵³ they are no longer exact in float64 and the star is placed by the
Möbius map instead (its position and size stay correct).

The monic cubics are invariant only under translations and are not
transported.

### 5.6 Enumeration by lattice reduction — `lattice/`

For boxes and balls in higher degree the head loop costs at least one
step per head, H^(d−1) of them, however small the window. But the
polynomials with a root near z₀ lie near the subspace
{Re f(z₀) = Im f(z₀) = 0} of coefficient space, and integer points near a
subspace are short vectors of a lattice.

**Lemma 5.3 [tested].** Let ‖f‖₂ ≤ R and let f have a root within ρ of
z₀. With m = |z₀| + ρ and L₂ = ‖(k(k−1)m^(k−2))_k‖,

    |f(z₀)| ≤ ρ·|f′(z₀)| + ρ²RL₂/2,

and, if ρκ < 1,

    |f(z₀)| ≤ ε := R·ρ·(L⊥ + ρL₂/2)/(1 − ρκ),

where M, N are the 2 × (d+1) real matrices of f ↦ f(z₀), f ↦ f′(z₀),
L⊥ = σ_max(N restricted to ker M) and κ = σ_max(N)/σ_min(M).

*Proof.* Taylor at z₀ with |f″| ≤ RL₂ on the disc gives the first. Split
f along ker M and its complement: the component outside ker M has norm
≤ |f(z₀)|/σ_min(M), so |f′(z₀)| ≤ L⊥R + κ|f(z₀)|; substitute. ∎

So the polynomials sought are integer points of the cylinder
{‖f‖ ≤ R, |f(z₀)| ≤ ε}, which lies in an ellipsoid, and those are the
vectors of bounded length in the lattice spanned by

    b_k = (S₁·e_k, ⌊S₂·Re z₀ᵏ⌉, ⌊S₂·Im z₀ᵏ⌉),      S₂/S₁ ≈ R/ε

— the lattice Kannan, Lenstra and Lovász use to recognise an algebraic
number, of which here every short vector is wanted, not the shortest. The
basis is reduced exactly (integral LLL, in BigInt: the lattice is as
eccentric as the window is small) and the ellipsoid searched by
Fincke–Pohst. Each point is tested by the first inequality of the lemma,
evaluated in the lattice's own coordinates, and the survivors are solved
and kept if a root really lies in the window.

Work is proportional to the number of lattice points in the ellipsoid,
which the volume predicts to three digits, and is independent of H. It
exceeds the number of stars by a factor of order d² — the inequality
bounds |f′(z₀)| by its largest value, and most polynomials have less —
and, for a box, by the further factor by which the ball around a cube
exceeds it (2.6 in degree 3, 65 in degree 7, 490 in degree 10). In degree
8, the 162 000 stars with ‖f‖₂ ≤ 12 in a window of size 0.003 take three
seconds; the box of the same size has 9·10⁸ heads. `box` and `ball`
estimate both costs and choose, and refuse a window that neither method
could finish: a wide view of a large family in high degree holds more
stars than can be drawn.

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
- `rationalRoot.ts`: irreducibility over ℚ up to degree 4, from
  approximate roots and exact tests. A rational root is p/q with q | a_d:
  a real root r nominates p = round(q·r), verified by the integer
  q^d·f(p/q). A complex root z is quadratic over ℚ iff
  α(x² − 2sx + |z|²) is integral and divides f for some α | a_d (Gauss's
  lemma), verified by division in integers. A cubic is reducible iff it
  has a rational root; a quartic iff it has one or its root z is
  quadratic.
- `closedForm.ts`: quadratics and cubics, branching on the exact sign of
  the discriminant; quartics by Ferrari's method (a positive root of the
  resolvent cubic splits the quartic into two real quadratics), polished
  by Newton's method and accepted only if the roots satisfy Vieta's
  relations. `aberth.ts`: the Aberth–Ehrlich iteration, for d ≥ 5 and as
  the fallback for quartics.
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
| a catalogue is independent of how the window is cut (tangencies, boundary stars) | `catalogue.test` | the uncut window |
| Möbius image boxes; tiles meeting a window; exact position in 𝔉 | `modular.test` | dense sampling; the reduction algorithm |
| transport ≡ direct enumeration, quadratics and cubics | `modular.test` | the direct catalogues, star for star |
| Prop. 4.1: δ² = 4P, χ and the root configuration, I, J, disc | `quartic.test` | random quartics built from their roots; exact discriminant |
| quartic catalogue, τ = 1, 1.5, a middle shell | `quartic.test` | brute force over coefficient boxes |
| Prop. 4.2, quartic density | `quartic.test` | counts |
| exact position of a quartic's root in 𝔉; transport ≡ direct, quartics, including \|χ\| = τ exactly | `quartic.test` | examples on ∂𝔉; the direct catalogue, star for star |
| irreducibility from one root, degrees 3 and 4 | `irreducible.test` | trial division by every small integer factor |
| irreducible cubics and quartics | `irreducible.test` | the full catalogues, sieved |
| LLL (same lattice, reduced); Fincke–Pohst | `lattice.test` | Gram determinants, Gram–Schmidt; brute force |
| Lemma 5.3: every polynomial of the ball with a root in the disc is found | `lattice.test` | solving every polynomial of the ball |
| box and ball: lattice ≡ heads | `lattice.test` | each other, star for star |
| shells partition; shell = {r_min ≤ r < r_max} | `catalogue.test`, `style.test` | a deeper catalogue, filtered |
| Prop. 6.1: ink formula, zoom exponent, even β | `style.test` | measured Σπr² |
| raster: order independence, area-true dust | `style.test` | direct computation |
| discriminant, solvers, real roots | `poly.test`, `roots.test` | Vieta, residuals, ∏(αᵢ − αⱼ)² |

---

## 9. Not done

1. **Size and shape in degree ≥ 5.** The kernel of head ↦ f′(z) has
   dimension d − 3, so a star of degree d has d − 3 shape parameters
   beyond δ (for a quintic: the cofactor of Q_z is a cubic, with two
   invariants relative to z). Bounding them should give SL₂(ℤ)-invariant
   catalogues in every degree, as §4.1 does for quartics; the head loops
   and the reduction theory would need working out.
2. **Certified roots.** Roots from `aberth.ts` are not certified; Smith's
   disc bound with a running error estimate would certify isolation and
   the real/non-real split in float64.
3. **Other rings and alphabets.** Quadratics over ℤ[i] (stars in ℂ, the
   Bianchi group in place of PSL₂(ℤ)); polynomials with coefficients in a
   finite set, where the natural exact algorithm is a pruned tree search.

Sketches and sources for each are in [literature.md](literature.md).
