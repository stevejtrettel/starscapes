# How the Live View Samples

*The method behind the explorer's zoom: what it computes, why each piece is
the shape it is, and how it generalizes beyond quadratics. Derivations were
validated experimentally in docs/experiments.md (E4–E9); dead ends —
per-pixel ray tubes at scale, ink budgets, tiles — are recorded there and
deliberately absent here. Quadratics throughout; generalization in §5.*

## 1. The population: a view cone, enumerated exactly

A quadratic with upper-half-plane root z = s + iy has coefficients exactly

    (a, b, c) = a · (1, −2s, s² + y²).

So "every integer quadratic with a root in the window W, leading
coefficient a ≤ A" — the population Φ_cone(W, A) — can be enumerated
directly, with no search geometry at all:

    for a = 1 … A:
      b runs over the integers in −2a·[s-range of W]     (b pins s = −b/2a)
      c runs over the integers in a·(s² + [y²-range of W]) (c pins y)

Work is proportional to the population found (plus rounding slack), not to
depth or to pixels: this is what removed the deep-zoom cost wall (E4/E5 —
at 500× zoom, the full population in ~1 ms where per-pixel ray marching
starved after seconds). Completeness is by construction; membership is
made exact by solving (which we do anyway) — the enumeration may overshoot
by edge-rounding, and the renderer clips. The window is fattened by the
largest dot radius so dots centered just outside still draw.

## 2. The depth law: derived from visibility

Under the hyperbolic size law (radius c/√|disc| in the ℍ-metric), a root
at height y from leading coefficient a has |disc| = 4a²y², so its WORLD
radius is c/2a — independent of where it sits. A dot is visible when that
exceeds a pixel (h/viewportH for window height h):

    A_visible = c · viewportH / (2h),      march depth A = 3·A_visible

(the ×3 "dust factor" keeps sub-pixel texture; labeled heuristic). Depth
is computed from the view — zooming raises the search obligation. Nothing
is dialed.

## 3. The saturation theorem, and the cube-root law

For fixed a, roots have plane density 4a²y² (the |f′|² Jacobian of
(b, c) ↦ root), and each dot covers π(c/2a · viewportH/h)² pixels, so the
ink contributed by depth level a is

    4a²y²h² · π c²·viewportH²/(4a²h²) = π y² c² viewportH²

— CONSTANT per level, independent of a and h (an echo of the hyperbolic
invariance). Total ink ∝ number of levels ∝ c/h: a fixed-scale picture
MUST saturate to black under zoom. This is a theorem about the size law,
not an implementation defect; every mechanism that fought it while keeping
c fixed (budgets, tiles) either reintroduced fixed-box artifacts or
manufactured new ones (E6–E8).

The resolution is one formula. Ink ∝ c³/h (levels ∝ c/h, ink per level
∝ c²), so hold ink constant by letting the scale breathe:

    c(h) = c₀ · (h / h₀)^⅓        (h₀ = the home view, which is unchanged)

Population is also ∝ c³/h, hence flat too (E9: ~20–47k dots per view and
5–17% ink from home to 500× zoom, vs 430M dots and 1,500 screens of ink at
fixed c). Depth still grows (A ∝ c/h ∝ h^(−⅔)): zooming still summons
deeper arithmetic — at constant visual budget, rendered ever finer. Stated
honestly: a zoomed view is NOT the wide view magnified (the theorem forbids
that); it is the same ink spent on deeper polynomials.

## 4. What the picture near a geodesic means

Roots avoid geodesics by an exact law — e.g. | |z|² − 1 | = |c − a|/a ≥ 1/a
near the unit circle, so a root at distance d requires a ≥ 1/2d. The thin
white halos along thick geodesics are therefore theorems at any fixed
depth; they fill with genuinely tiny dots as depth grows locally. The live
view accepts the halos of its derived depth; prints tighten them simply by
having smaller pixels (print depth ∝ resolution).

**Locally-adaptive depth was tried three times and rejected by eye**
(ink budgets E6–E8; live count quotas E10; print-scale sub-halo quotas
E11–E12 — the last filled the halos *numerically* but the fill reads as
scattered noise, not structure). The recorded verdict and rule: local
density equalization by spatial accounting keeps failing visually. If halo
treatment is wanted later, start from the mathematics — the near-geodesic
populations are honest sub-families (c/a ≈ p/q, Farey-indexed) to be
enumerated, sized, and colored deliberately as their own layer.

## 5. Generalization to other families

Each of the three ingredients generalizes as a METHOD; only the quadratic
instantiations are special-case simple.

**The cone (§1).** For degree d, a polynomial with UHP root z factors as
a(x² − 2sx + n)·g(x) with g a real cofactor of degree d − 2. The window
still pins exactly two real parameters (s, n); the cofactor contributes
d − 2 FREE parameters — so the view-cone is higher-dimensional, and its
enumeration needs one new ingredient the quadratic case didn't: an
explicit CUTOFF on the cofactor (equivalently, on the polynomial's other
roots or its height) as part of the named population. Given that, the
same integer-slicing that shaders.tex uses for the march applies to
enumeration: fix a (integer), then the next coefficient (integer) pins one
cofactor parameter, …, until the innermost coefficient ranges over an
interval computed from the window and the cutoff. Work remains
∝ population. Constrained affine families (monic, a = d, palindromic)
work identically with their own parameters — fewer free coordinates, not
more. This is the same computation as the general affine-family march in
design.md, used forward.

**The depth law (§2).** The derivation pattern — express the styled dot
size in terms of the enumeration's outermost parameter, set it against the
pixel size, solve — is family- and style-generic. The pleasant
"world radius independent of height" coincidence is quadratic+hyperbolic-
specific; other families/size laws give a bound depending on more
parameters, derived the same way.

**The invariance law (§3).** Redo the two computations per family: root
density per slice (a Jacobian of the coefficient→root map) and dot area
per slice; their product gives ink per slice; summing gives the saturation
rate; solving "ink = const" gives that family's analogue of the cube-root
exponent. For cubics this is a genuinely interesting small calculation
(the cofactor cutoff enters), and the natural first task when cubics come
to the live view.

## 6. The lesson the detour taught (E6–E8)

Measured, honest mechanisms (budgets) can still be the WRONG mechanism:
four epicycles of accounting reproduced the artifacts of the fixed box
because a budget spends where structure is heavy and starves where texture
is needed. The failures were diagnosed by forensic comparison against a
reference population, and the fix was a deletion plus one derived formula.
House rule reaffirmed: prefer a derivation to a mechanism, and when a
mechanism needs an epicycle, re-derive instead.
