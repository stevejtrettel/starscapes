# Lab Notebook

*One entry per experiment: question → setup → prediction → result →
conclusion. The prediction is written BEFORE the run. Parameter changes are
hypotheses, not reactions. Scripts live in `scripts/experiments/`; artifacts
in `outputs/` (regenerable, not committed).*

---

## E1 — Wide-field parity: inverse harvest vs forward ground truth
**2026-07-04 · `scripts/experiments/inverse-parity.ts`**

**Question.** Does the ray-harvest sampler (fixed-ε criterion) reproduce
forward box enumeration on a wide view, and what characterizes its misses?

**Setup.** Quadratics; window center 0 + 1.1i, height 2.6; ground truth =
box(40) polynomials with a UHP root in the window (91,342 of them);
harvest ε = 0.04, aMax = 40, one trace point per pixel (800²).

**Prediction** (from the exchange-rate analysis, design.md): misses
concentrate at large |f′(root)| = large √|disc| — the sub-pixel dots;
some window-rooted polynomials beyond the box will be found.

**Result.** Coverage 50.81% of ground truth; missed median √|disc| ≈ 47
(dot radius ~0.0007 — deeply sub-pixel), consistent with the prediction.
250,611 harvested total, of which 203,918 beyond the box (unreachable by
forward search). Timing: harvest 6.1 s vs forward full render 0.15 s on
this wide view (forward wins where the box is small; inverse cost is
per-pixel × depth, flat in zoom). Unpredicted observations: (a) a small
tail of *low*-disc misses (min √|disc| = 1.7) — suspected window-edge
effect, **uninvestigated, open**; (b) a top-heavy dust gradient in the
inverse image — fixed-ε's root-space catch radius scales with
‖(1, z, z²)‖, so the harvest digs deeper into the tiny-dot population
high in the picture.

**Conclusion.** Machinery works; exchange-rate theory confirmed in data.
But fixed-ε defines its population by the tool's own geometry (lattice
points near *my ray*) — circular, and the source of artifact (b). Led,
with E2/E3, to the population-contract framework.

---

## E2 — Visual normalization + adaptive depth (first attempt)
**2026-07-04 · `scripts/experiments/uniform-density.ts`**

**Question.** Do ε(z) = ε₀/‖(1, z, z²)‖ (`visual`) and depth aMax ∝ 1/y
flatten E1's gradient and fill the near-axis undersampling?

**Setup.** Same window/style; ε₀ = 0.12, adaptiveDepth = 25 (aEff =
min(400, 25/y)).

**Prediction.** Gradient flattens; axis fills in.

**Result.** 412,740 polys, 1.9 s (3× faster than fixed-ε — the normalized
tube is much cheaper up top). Top flattened as predicted; bottom *flooded* —
both dials pump the axis (ε grows as ‖·‖ shrinks there, and depth 25/y
reaches a ≈ 400).

**Conclusion.** Overcorrection. Retroactive process note: this run had no
stated target measure — "flatten" and "fill" are not a quantitative target.
Flagged as the tuning-without-a-target failure the contract framework
eliminates.

---

## E3 — Retuned dials (ε₀ = 0.07, adaptiveDepth = 9)
**2026-07-04 · `scripts/experiments/uniform-density.ts`**

**Question.** (As E2, softer dials.)

**Result.** 43,513 polys, 0.75 s. Called "balanced" at first; correctly
observed (Steve) to be biased hard toward the axis — depth 9/y gives the
top of the window only a ≤ 4 while still reaching a ≈ 180 near y = 0.05.

**Conclusion — the important one.** "Under/over-sampled" is meaningless
without a named population. Retroactive insights: (i) depth ∝ 1/y is
exactly the coverage plan of Φ_disc(D) (roots at height y with |disc| ≤ D
have a ≤ √D/2y), so E2/E3 were unknowingly approximating the SL₂(ℤ)-
invariant truncation — whose faithful picture *is* Euclidean-dense near ℝ;
(ii) under hyperbolic sizing a root's world radius is c/2a independent of
height, so the *visible* population needs flat shallow depth while
near-axis *existence* needs the 1/y term. These are theory inputs to the
Φ_disc coverage-plan lemma, not dials to keep. Superseded by the
population-contract framework (design.md, Level 2).

---

## Open questions carried forward
- E1's low-disc miss tail (min √|disc| 1.7): window-edge effect or real
  coverage gap? Needs a targeted 20-line investigation against Φ_box
  ground truth.
- The tube-radius half of Φ_disc's coverage plan (the depth half is the
  1/y law): derive as a lemma, aiming for `proved` status.
- Deep-zoom demonstration (where forward search cannot follow) — deferred
  until contracts land, so the demo is of a named population.

---

## E4 — The zoom depth wall
**2026-07-04 · `scripts/experiments/zoom-depth-wall.ts`**

**Question.** Steve observes the live view thinning dramatically under zoom.
Hypothesis: the worker's depth ceiling (a ≤ 800) — demanded depth grows like
1/height, so past the ceiling the delivered fraction of the visible
population collapses. Secondary: per-a enumeration cost ∝ seeds × depth, so
time should grow toward the ceiling then flatten.

**Setup.** Zoom into fixed z₀ = 0.318 + 0.842i, heights 2.6/2ᵏ for
k = 0…9; worker's exact parameters (visual ε = 2c, derived depth, ceiling
800, half-res seeds of a 600² viewport).

**Prediction.** Harvest count grows with zoom until the ceiling binds
(h ≈ 0.05), then collapses; time rises to the ceiling then plateaus around
seconds — both confirming the wall is the cap + algorithm, not the
mathematics (the true visible population keeps growing ∝ 1/h).

**Result.** Confirmed on both counts. Harvest doubles per zoom level while
depth is delivered (4,054 at k=0 → 415,295 at k=6), then collapses ~4× per
level once the ceiling binds (k=7: demanded 1551, delivered 800, 229,911;
k=9: demanded 6204, harvested 15,388). Time flattens at ~3.4 s at the
ceiling. Sharpened finding: even below the wall the algorithm is too slow
for live use — at k=6, ~630M candidate checks yield 415k polynomials, a
0.07% hit rate. Per-a enumeration pays for every depth level; almost all
are empty.

**Conclusion.** The wall is the cap + algorithm, not the mathematics. Fix
is algorithmic: replace per-a enumeration with the shaders.tex sphere-trace
(work ∝ hits, not depth), keeping per-a enumeration as the completeness
reference implementation for equivalence testing. Design discussion before
implementation.

---

## E5 — The cone removes the wall
**2026-07-04 · `scripts/experiments/zoom-depth-cone.ts`**

**Question.** Does view-cone enumeration (src/core/search/cone.ts —
work ∝ population, no seeds/rays/tube) deliver full demanded depth at all
E4 zoom levels in live-viable time?

**Setup.** E4's exact zoom ladder (z₀ = 0.318 + 0.842i, heights 2.6/2ᵏ,
k = 0…9, same derived depth formula), no ceiling.

**Prediction.** Population count keeps growing roughly 2× per level through
k = 9 (no collapse), and per-level time stays well under ~200 ms even at
k = 9 where E4's ray harvest was starved at 15k dots and 3.3 s.

**Result.** Prediction confirmed and exceeded. Population doubles per level
with no collapse (19k at k=0 → 6,914,744 at k=9, full demanded depth
a ≤ 6204); time stays trivial (36.6 ms at k=9). Against E4 at k=9: the cone
finds 450× more polynomials in 1/90th the time. At k=6 (E4's wall): 867k in
4.6 ms vs the ray harvest's 415k in 3413 ms — ~700× faster AND more
complete (the tube missed population the cone provably contains).

**Conclusion.** The wall was the algorithm, not the mathematics. View-cone
enumeration (work ∝ population) replaces the per-seed ray harvest in the
live worker; the ray formulation remains the CPU mirror of the shader-mode
mathematics. Known limit noted: at extreme zoom the population (6.9M at
k=9) exceeds the GL renderer's 1.5M instance capacity; chunks stream in
ascending leading coefficient, so what clamps off is the deepest sub-pixel
dust — graceful, but the dust-factor depth heuristic deserves revisiting.

---

## E6 — Ink-budget depth: constant perceived weight under zoom
**2026-07-04 · `scripts/experiments/zoom-ink-budget.ts`**

**Question.** Steve observes saturation-to-black under deep zoom (each
depth level paints ~constant ink for unclamped dots, and clamped sub-pixel
dust ink grows ∝ a² — so zoom-adaptive visibility depth must saturate).
Does a literal ink budget — stream the cone shallow→deep, accumulate
Σπr²_px per dot, stop after the depth level that crosses β·screen —
hold perceived weight constant at every zoom?

**Setup.** E4/E5 zoom ladder; worker's mechanism exactly: fixed
sizeScale = 0.035, β = 0.25, level-granular stop, depth guard 100k.

**Prediction.** Ink fraction lands at β + at most one level's overshoot at
every k (flat where E5's fixed-depth ink diverged); depth reached grows
with zoom but slower than the visibility bound; population kept stays
roughly constant across k (bounded by budget ÷ min dot area); time stays
live-viable throughout.

**Result.** Prediction half-right, and the failure is the finding. Ink holds
flat at ~25% through k≈7 ✓, but "kept dots" collapses at deep zoom (k=6:
139 dots; k=8/9: ONE dot, ink 37%/149%): at extreme zoom the shallow dots
are enormous in pixels (an a=1 dot spans thousands of px), so a handful of
screen-filling "background" dots exhaust the whole budget before any fine
structure is computed. Raw Σπr² is the wrong perceptual measure under
opaque compositing: dots much larger than the screen act as background
fills that deeper structure paints over — they should not spend the
texture budget.

**Conclusion.** Budget mechanism sound; accounting needs a perceptual
amendment (proposed, pending discussion): dots with pixel radius above a
background threshold (~viewport scale) are emitted but spend no budget —
they are few (expected count per level within a window is πy²c² ≈ 0.003)
and structural; the budget regulates texture-scale ink only.
