# Audit of the previous code, and what replaced it

Written November 2026, against commit `5b07fa9`. The earlier design notes
and lab notebook are kept unchanged in [history/](history/).

## What was sound and is kept

- **Enumerating by the window instead of by a coefficient box** (the
  "view cone"). It is the right idea and the centre of the new code, where
  it is one theorem (the tail scan) instead of one hand-derived enumerator
  per family.
- **The discriminant identities** √|disc| = 2ay and √|disc| = 2y·q(r),
  now the single invariant δ.
- **Closed-form solvers branching on an exact discriminant**, kept nearly
  verbatim (`roots/closedForm.ts`).
- **Order-independent compositing** (smallest disc on top by a depth
  buffer; additive with a tone curve) and **anchor-relative float32
  positions** in the explorer.
- **The notebook's empirical findings** — the cube-root zoom law, the
  failure of every budget/quota mechanism, the vertical ink gradients.
  They are now consequences of one formula (mathematics.md, Prop. 6.1).

## What was wrong with the structure

1. **One pipeline, written five times.** enumerate → solve → invariants →
   size → deposit existed in `pipeline/print.ts`, twice in
   `live/worker.ts`, and again in each cone print script, each copy with
   its own inline size law and window padding. Now: `render/picture.ts`
   and `live/worker.ts`, both consuming a `Starscape`.
2. **Abstractions without a second use.** `Family` had one implementation
   whose map was the identity; `Style`/`RootRow`/filters were used only by
   the box path; `views.ts` existed to read back the flat batches. The
   families actually drawn (cone quadratics, monic cubics) bypassed all of
   it and were selected by a string. Now a family is a tagged union with
   one `switch`.
3. **The "kernel dialect".** Batches of 4096 polynomials in flat arrays
   with stride arithmetic at every use, justified by speed. A callback per
   star with one reused record costs 9–27 ns per star, far below
   rasterising it, and reads as the mathematics does.
4. **Three types for one rectangle** (`View`, `Camera`, `Window`, the last
   defined in the module of a superseded algorithm). Now `Window` and
   `View`, in `fibre/window.ts`.
5. **Per-degree dispatch by `if (degree === 2) … else if (degree === 3)`**
   in the pipeline, the worker, the solver tests, and the invariants.
6. **Constants standing in for derivations.** `DUST_FACTOR`,
   `DUST_R_CUBIC`, `DEPTH_FLOOR`, `HOME_HEIGHT`, `pad = cEff` "(labeled
   heuristic)". The population drawn was defined by these, not by the size
   law. Now the population is *the stars of radius at least `faintest`
   pixels*, the padding is a bound proved from the law, and the only
   constants are the law's and the magnitude limit.
7. **Documents describing a larger system than existed** (serialisable
   specs, δ-certified solving, harvest caches, tiers of change control),
   in a vocabulary of contracts and verdicts. Replaced by
   [mathematics.md](mathematics.md): definitions, propositions, proofs,
   and a table of which test checks which statement.

## Errors found

Each was checked, not only argued.

1. **The monic-cubic live view dropped visible stars.** It drew with the
   law r = c/|disc|^(1/4) but cut the enumeration at |r − s| ≤ ρ with
   ρ = 4·√(3c/2p), a bound derived for a different law. Under the law in
   use a star is at least a pixel when q(r) ≤ c²/(2yp²), which exceeds ρ²
   for y < c/(48p). At the home view (c = 0.035, 1000 px) the old
   enumerator missed 3 148 of the 18 352 stars of radius ≥ 1 px, all at
   heights below 0.29 (predicted threshold 0.30).
2. **The fifth-root zoom law for monic cubics** (monic-cubic-sampling.md
   §7.3) is an artefact of the same mismatch. With the law's own
   visibility cutoff the exponent is 1 − 2κ/D = 1/3, as for quadratics;
   `test/style.test.ts` measures it.
3. **live-sampling.md §3** states the density of roots at leading
   coefficient a as 4a²y²; it is 4a²y (the Jacobian of (s, y) ↦ (b, c)).
   The conclusions drawn there survive (ink per level is independent of a
   and of zoom, total ∝ c³/h), but the ink per level is πc²·y, not
   independent of y — which is the vertical gradient the notebook kept
   meeting. (`scripts/prints/quadratics-cone.ts` had the correct density.)
4. **"Uniform" quadratic sizing** (β = 1/2 in `quadratics-cone.ts`) is
   uniform for a fixed depth a ≤ A, not for the visible population, whose
   depth depends on y. For a magnitude-limited picture the even law is
   β = 2/3 (mathematics.md §6; tested).
5. **Sub-pixel dots were drawn as 0.75-sample discs**, so the darkness of
   fine texture measured the number of polynomials enumerated rather than
   any area. This is why prints changed character with the "dust factor"
   and why near-axis populations "flooded" (notebook E2). Small discs now
   deposit their area.
6. **One margin for every star.** The window was enlarged by the largest
   possible radius (c/2) for all stars, though only the few largest need
   it. As the view shrinks faster than c, the enumerated region outgrows
   the view: 3.4 times its area at 500×, 49 times at 10⁴×, so the "flat"
   population of notebook E9 was not flat. Margins are now per size shell,
   and the population per view is constant to three digits.
7. **Bounds widened by an absolute 10⁻⁹** regardless of magnitude; now
   relative, with exact membership decided after solving.

## What is new

- **All integer cubics**, not only monic, enumerated exactly by window:
  the SL₂(ℤ)-invariant cubic starscape. In the fundamental domain the
  enumeration coincides with Mathews–Belabas reduction and reproduces the
  Davenport–Shintani count.
- **Coefficient boxes in any degree**, enumerated through the window.
- **Planar families** aP + bQ + cR, by the pencil scan.
- **One size-law family** with its critical exponent, zoom exponent and
  even-ink exponent.
- **Area-true rendering** in both renderers.
- **Exact discriminant in any degree**; Aberth–Ehrlich for degree ≥ 4.

## Where the old pieces went

| before | now |
|---|---|
| `core/polynomial.ts` (slices with offsets) | `poly/poly.ts` |
| `core/invariants.ts` | `poly/discriminant.ts`, `poly/rationalRoot.ts` |
| `core/solve/*`, `RootSlots` | `roots/closedForm.ts`, `roots/aberth.ts`, `roots/solve.ts` |
| `core/search/cone.ts` | `catalogue/quadratics.ts` |
| `core/search/coneMonicCubic.ts` | `catalogue/cubics.ts` (any leading coefficient) |
| `core/search/forward.ts` | `catalogue/box.ts` (through the window) |
| `core/search/inverse.ts` (ε-tube harvest) | removed; superseded by its own account. Its mathematics remains `shaders.tex`. |
| `core/family/*`, `core/style.ts`, `core/views.ts` | `starscape.ts`, `style/sizeLaw.ts`, `catalogue/star.ts` |
| `pipeline/print.ts`, eight print scripts | `render/picture.ts`, `scripts/prints/print.ts`, `presets.ts` |
| `render/raster.ts`, `offline/png.ts` | `render/raster.ts`, `render/png.ts` |
| `live/*` | `live/*`, one worker path for every family |
| `scripts/experiments/*`, tiling and quota code | removed with the mechanisms they measured; at `5b07fa9` |

Source went from 1 977 lines to about 2 450 while gaining the items above;
scripts, demos and tests together fell from 2 090 lines to about 1 100.
Tests went from 41 to 66, and now include comparisons with published
theorems.

## Deliberately not carried over

- **Translucent compositing.**
- **Multiplicities in the root store**: a repeated root is not a star.

## Added since

- **Recipes** (`src/recipe.ts`): a picture as plain data — family, size
  law, colouring, filter, view — edited by the explorer, mirrored in the
  URL, saved as JSON, and read back by the print script. The size constant
  is quoted at a pixel size and follows the zoom law to any other, so a
  recipe is the same picture on screen and in print.
- **Colourings** (`src/style/colour.ts`) and the explorer's control panel
  for c, κ, β, the magnitude limit and the colouring.
- **Enumeration by symmetry** (`src/modular/`, `catalogue/transport.ts`):
  for all quadratics and all cubics, reduced forms in the fundamental
  domain are carried to every tile meeting the window. Identical output
  to the direct loops, and fast where they are not — a strip of cubics
  near the real axis that had not finished in 40 seconds takes under 2.
- **Tangencies and exact boundaries.** Comparing the two methods exposed
  stars lost in three ways, all on boundaries: on the window's edge, on a
  shell's boundary (|disc| exactly the bound), and where a starscape
  curve is tangent to an edge. Shell membership is now decided on
  integers where it can be, tangencies are counted, and a test checks
  that a catalogue does not depend on how its window is cut.
