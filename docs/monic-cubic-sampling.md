# The Monic Cubic View-Cone: Derivations

*Drafted 2026-07-05 for verification before implementation (the process:
math checked on paper → enumerator with brute-force equivalence test → E13
→ image). Everything here is the cubic instantiation of the method in
live-sampling.md; the quadratic story transposes with the role of the
leading coefficient a played by q(r) = f′(r), the repulsion at the real
root.*

## 0. Setup and notation

A monic cubic with one real root r and a complex pair z = s + iy (y > 0):

    f(x) = (x − r)·q(x),   q(x) = x² − 2sx + n,   n = s² + y² = |z|².

Expanding, f(x) = x³ + bx² + cx + d with

    b = −(r + 2s),      c = n + 2sr,      d = −rn.            (0.1)

Note q(r) = (r − s)² + y² and f′(r) = q(r) (differentiate (x−r)q(x) at r).
The window W pins s ∈ [s₀, s₁] and y ∈ [y₀, y₁] (y₀ ≥ 0); the ONE free
cofactor parameter is r, cut off by |r − s| ≤ ρ (the population's named
cutoff; see §3 for why |r − s| rather than |r| is the natural variable).

**The population:**

    Φ₃ᵐᵒⁿ(W, ρ) = { monic integer cubics with complex pair in W and |r − s| ≤ ρ }.

Finite: W bounds (s, y), ρ bounds r, and (0.1) then bounds (b, c, d).

## 1. Enumeration by integer slicing

Mirroring the quadratic cone (b pins s, then c pins y), each successive
integer coefficient pins one parameter. All interval bounds below are
CONSERVATIVE (over-coverage is harmless: every candidate is solved and
exact membership applied post-solve — the house pattern); completeness is
what must hold, and each step's interval provably contains every member.

**Slice by b.** From (0.1), b = −(r + 2s) with r ∈ [s₀ − ρ, s₁ + ρ] and
s ∈ [s₀, s₁]:

    b ∈ [ ⌈−((s₁ + ρ) + 2s₁)⌉ , ⌊−((s₀ − ρ) + 2s₀)⌋ ].

**Fix b: the slice is parameterized by s.** Then r(s) = −b − 2s, and the
constraints s ∈ [s₀, s₁], |r(s) − s| ≤ ρ intersect to an s-interval I_b
(possibly empty: |r − s| = |b + 3s| ≤ ρ gives s ∈ [(−b−ρ)/3, (−b+ρ)/3]).
Substituting r(s) into c = n + 2sr = s² + y² + 2s(−b − 2s):

    c(s, y) = y² − 3s² − 2bs.                                  (1.1)

With g(s) := −3s² − 2bs (concave; vertex s* = −b/3), the c-range is

    c ∈ [ ⌈y₀² + min_{I_b} g⌉ , ⌊y₁² + max_{I_b} g⌋ ]

(min at an endpoint of I_b; max at the vertex if s* ∈ I_b, else an
endpoint).

**Fix (b, c): the valid s-set and the d-range.** From (1.1),
y²(s) = c + 3s² + 2bs, so the valid s's are

    J_{b,c} = { s ∈ I_b : y₀² ≤ c + 3s² + 2bs ≤ y₁² }

— the region between two level sets of an upward parabola intersected with
an interval: at most two intervals, endpoints in closed form. Then, using
n = s² + y² = c + 4s² + 2bs and r = −b − 2s:

    d(s) = −r·n = (b + 2s)(4s² + 2bs + c)
         = 8s³ + 8bs² + 2(b² + c)s + bc.                       (1.2)

(Consistency check: d = −(r³ + br² + cr) with r = −b − 2s expands to the
same cubic — verified symbolically.) The d-range over each interval of
J_{b,c} is [min, max] of the cubic (1.2): endpoints plus critical points

    d′(s) = 24s² + 16bs + 2(b² + c) = 0
    ⟹ s = (−2b ± √(b² − 3c)) / 6,                              (1.3)

closed form. Enumerate integer d over the (merged, deduplicated) ranges;
each candidate (1, b, c, d) is solved and kept iff its complex pair lies
in W and |r − s| ≤ ρ, exactly.

**Completeness argument.** Any member has integer (b, c, d); its b lies in
the slice range (b is a value of −(r+2s) over the constrained set); given
its b, its (s, y) satisfy the I_b constraints so its c lies in the c-range;
given (b, c), its s ∈ J_{b,c} so its d = d(s) lies in the d-range. ∎
**No duplicates:** each (b, c, d) is emitted at most once within its
(b, c) slice (merge the ≤ 2 d-intervals before enumerating).

## 2. The discriminant identity

Roots z, z̄, r:

    disc(f) = (z − z̄)² (z − r)² (z̄ − r)² = (2iy)² · |z − r|⁴
            = −4y² · ((s − r)² + y²)² = −4y² · q(r)².

So disc < 0 always (complex-pair case), and

    √|disc| = 2y · q(r).                                       (2.1)

## 3. Size and visibility (the depth law)

Hyperbolic size law: hyperbolic radius c_sz/√|disc|, world radius = that
× y (the root's height):

    r_world = c_sz · y / (2y · q(r)) = c_sz / (2 q(r)),        (3.1)

**independent of the root's height** — the exact analogue of the quadratic
c_sz/2a, with q(r) playing a's role. Visibility at pixel size p = h/H:

    r_world ≥ p  ⟺  q(r) ≤ c_sz/2p  ⟺  (r − s)² + y² ≤ c_sz/2p,

so visible dots have |r − s| ≤ ρ_vis := √(c_sz/2p): THE VISIBLE MONIC
CUBICS ARE THOSE WHOSE REAL ROOT LIES NEAR THE WINDOW'S REAL POSITION,
within a radius that grows like 1/√p as you zoom. March cutoff
ρ = √(dust) · ρ_vis (dust factor enters under the square root since the
population is cubic in ρ but visibility is quadratic in |r−s|; take
dust = 3 as before, labeled).

## 4. The Jacobian, the count, and the ink integral

**Jacobian.** From (0.1), with coordinates (r, s, n):

    ∂(b, c, d)/∂(r, s, n) =
        | −1    −2    0 |
        | 2s   2r    1 |
        | −n    0    −r |

    det = −1·(2r·(−r) − 1·0) − (−2)·(2s·(−r) − 1·(−n)) + 0
        = 2r² + 2(n − 2sr) = 2(r² − 2sr + n) = 2 q(r).         (4.1)

So the lattice-point density of members per unit (r, s, n)-volume is
2q(r) — CHECK THIS COMPUTATION; everything below rides on it.

**Count.** With dn = 2y dy at fixed s,

    #Φ₃ᵐᵒⁿ(W, ρ) ≈ ∫_{|u|≤ρ} ∫_{s₀}^{s₁} ∫_{y₀}^{y₁} 2(u² + y²) · 2y dy ds du
                  (u := r − s)
                  ≈ (4/3)ρ³ · μ(W) · (1 + O(y²/ρ²)),           (4.2)

where μ(W) = ∫ ds ∫ 2y dy is the window's (s, n)-measure — population
CUBIC in the cutoff, the analogue of A³ for quadratics.

**Ink.** A dot at parameter u = r − s covers π(r_world·H/h)² =
π c_sz² H² / (4 q² h²) pixels (unclamped); members per unit u carry
density 2q · (window measure). Ink per unit u ∝ 1/q(u) = 1/(u² + y²), and

    ∫_{−∞}^{∞} du/(u² + y²) = π/y                              (4.3)

CONVERGES. Total unclamped ink over the whole family:

    ink ∝ (c_sz² H²/h²) ∫_W (π/y) ds dn = (c_sz² H²/h²) ∫ ds ∫ (π/y)·2y dy
        = 2π c_sz² (H/h)² · (s₁ − s₀)(y₁ − y₀) ∝ c_sz² H² · α, (4.4)

using (s₁−s₀)(y₁−y₀) ∝ h² for a window of height h and aspect α. THE h's
CANCEL:

**Consequences (to be tested as E13's predictions).**
(i) Total ink is FINITE at every depth — the monic cubic family cannot
    saturate (contrast quadratics: constant ink per level, divergent).
(ii) Ink fraction is ZOOM-INDEPENDENT at fixed c_sz — no cube-root law is
    needed for monic cubics; the uniform view is simply: cone + visibility
    depth + draw everything, at every zoom.
(iii) The near-axis behavior is finite too: the π/y divergence is cancelled
    by the dn = 2y dy measure (the integrand in (4.4) is constant in y).
Caveat: (4.3)–(4.4) count unclamped ink; sub-pixel dots drawn at the
min-px clamp add a dust term ∝ population beyond ρ_vis, which the march
cutoff bounds — E13 measures the actual fractions.

## 5. Irreducibility

Monic ⟹ any rational root is an integer, so: reducible ⟺ r ∈ ℤ. The
existing `cubicIrreducible` (rational root theorem on the solved real
root) handles this with q = 1 only — no changes needed.

## 6. Implementation plan (after the math is verified)

- `monicPolynomials({degree})` or reuse: the family is
  integerPolynomials' lattice with leading range pinned to [1, 1] — a
  one-line constructor.
- `src/core/search/coneMonicCubic.ts`: the §1 slicing;
  emits ascending [d, c, b, 1] batches. Birth certificate: brute-force
  equivalence test on a small window (enumerate all |b|,|c|,|d| ≤ K,
  solve, filter to (W, ρ), compare sets), plus a no-duplicates test.
- E13 (predictions from §4): population ∝ ρ³ (measure at 3 cutoffs);
  ink fraction ≈ flat across the zoom ladder at fixed c_sz (no adaptive
  scale); the classic frame renders even, nebula-free, saturation-free.
- Print script: classic frame, cone population, irreducibleOnly +
  upperHalfPlane filters. Then the live worker learns degree dispatch
  (a later, separate step).

## 7. Size laws and uniformity (added 2026-07-05, after the eye tests)

Empirical sequence: the 1/√|disc| print was vertically even but pale
(steep falloff); the 1/|f′(z)| print was vivid but darkened toward the
top; the |disc|^{−1/4} print is vivid AND uniform (verified by eye at low
density: monic-cubics-cone-3-0.05-disc4.png). This section derives why,
in a form general enough to think with.

### 7.1 The two-parameter family of laws

Work in coordinates (u, s, y), u = r − s, with q = u² + y² = f′(r), and
recall |f′(z)| = 2y√q and |disc| = 4y²q². Consider world-radius laws

    r_world = c · q^{−α} · y^{−β}.

The three rendered laws:

| law | r_world | (α, β) |
|---|---|---|
| disc:   c_hyp/√|disc| × y | c/(2q) | (1, 0) |
| f′:     c/|f′(z)| × y     | c/(2√q) | (1/2, 0) |
| disc¼:  c/|disc|^{1/4}    | c/(√2·√y·√q) | (1/2, 1/2) |

(Any power of |f′(z)| and y is expressible: size ∝ |f′|^{−γ} y^{δ}
corresponds to α = γ/2, β = γ − δ.)

### 7.2 Ink density and the uniformity locus

Member density per unit (u, s, y) is 4y·q (Jacobian 2q from §4 times
dn = 2y·dy). Ink per unit picture area at height y:

    I(y) ∝ ∫_{|u| ≤ ρ} 4y·q · π c² q^{−2α} y^{−2β} du
         = 4π c² · y^{1−2β} · J,     J = ∫_{|u| ≤ ρ} (u² + y²)^{1−2α} du.

Substituting u = y·t: the tail of J converges iff α > 3/4, giving two
regimes:

- **Cutoff regime (α ≤ 3/4):** J ≈ 2ρ·(1 + O(y²/ρ²)) — y-independent —
  so I(y) ∝ y^{1−2β}, and VERTICAL UNIFORMITY ⟺ β = 1/2.
- **Tail regime (α > 3/4):** J = C_α · y^{3−4α}, so I(y) ∝ y^{4−4α−2β},
  and VERTICAL UNIFORMITY ⟺ 2α + β = 2.

**The uniformity locus** in the (α, β) plane is therefore the broken line
{β = 1/2, α ≤ 3/4} ∪ {2α + β = 2, α > 3/4}. Our two even laws are the
natural representatives of each branch: disc¼ = (1/2, 1/2) on the first,
disc = (1, 0) on the second. The f′ law (1/2, 0) lies OFF the locus by
exactly the y¹ that was observed as top-heaviness.

### 7.3 The other trade: depth behavior

Total ink over the march ∝ ρ^{max(0, 3−4α)} (per §7.2's J):
- disc (α = 1): convergent — cannot saturate, but per-slice ink ∝ q^{−1}
  starves the mid-range (the pale print);
- disc¼ (α = 1/2): ink ∝ ρ — linear, controllable by the dust depth
  DUST_R, saturating only as deliberately as one marches;
- the eye tests chose vividness + controllable ink (disc¼) over
  automatic convergence (disc).
- **Zoom law for the live view under disc¼**: ink ∝ c^{5/2}·(H/h)^{1/2}
  (with ρ ∝ √(c/p)), so constant perceived weight needs
  c(h) = c₀·(h/h₀)^{1/5} — a FIFTH root where quadratics needed a cube
  root (E9). Implemented in the live worker's monic-cubic path.

### 7.4 Remarks for later thinking

- **Degree 2 conceals the choice**: √|disc| = |f′(z)| for quadratics, so
  all these laws coincide there up to y-powers; degree 3 is where the
  (α, β) plane opens up.
- **Other uniformities**: this section's "uniform" is per EUCLIDEAN area.
  Uniform ink per HYPERBOLIC area (ds·dy/y²) shifts the locus to
  β = 3/2 (cutoff regime) / 2α + β = 3 (tail regime) — one more y-power.
  Which uniformity a picture should have is an aesthetic/mathematical
  choice the (α, β) language makes precise.
- **Generalization**: for degree d the cofactor has d − 2 parameters and
  the Jacobian generalizes (∏ over cofactor structure); the same
  ink-density computation defines a uniformity locus per family. The
  quadratic family's version of this analysis is the E9 cube-root story
  in zoom rather than height.
- Renders: monic-cubics-cone-{6-0.05,-fprime,-disc4}.png and the low-
  density check {3-0.05,4-0.035}-disc4.png; script takes (DUST_R, c, law).
