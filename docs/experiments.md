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
