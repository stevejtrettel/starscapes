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

---

## E7 — Tiled (local) ink budget
**2026-07-04 · `scripts/experiments/tiled-budget.ts` · branch tiled-ink-budget**

**Question.** Does a per-tile ink budget (64px tiles, levels-outer march,
background dots > tile scale ride free, work-guard backstop) fill the
repulsion strips beside thick geodesics that the global budget (E6) left
white, while keeping ink flat under zoom and time live-viable?

**Setup.** (i) The E4–E6 zoom ladder at z₀ = 0.318 + 0.842i; (ii) a
geodesic-adjacent window centered on the unit circle at 0.6 + 0.8i,
height 0.15. Mirrors the worker exactly. β = 0.25.

**Prediction.** Per-tile ink ≈ β across tiles including strip tiles (strips
fill); depth spread depthMax ≫ depthMin in the geodesic window; population
bounded ≲ 1,300 dots/tile; time < ~100 ms for typical views; two runs
bit-identical (determinism).

**E7 Result.** Core prediction confirmed (median tile ink flat 25–30% at
all zooms; depth spread 16…2684 at k=0; determinism IDENTICAL) with two
misses. (1) Time at extreme zoom: 2.5 s at k=9 — the pad ring is a fixed
WORLD size while tiles shrink, inflating the grid 58× (76² tiles); giant-
pass amendment designed but deferred. (2) THE REAL FAILURE, found by Steve
in the browser and invisible to E7's median metric: blocky texture-less
tiles, and the geodesic strips still white. Diagnosis: the medium-dot
cliff — tile budget is 1,024 px², so any single dot of pixel radius ≥ 18
exhausts its tile instantly; tiles on/near thick geodesics all contain
such dots and stop before digging texture. Plus seam-adjacent dots charge
full area to one owner, stepping depth across tile boundaries.

---

## E7b — Capped, bilinearly-shared ink charges
**2026-07-04 · same script, amended accounting**

**Question.** Do (a) per-dot charge capped at budget/8 (subsumes the
binary background rule; no cliff) and (b) bilinear sharing of charges over
the 4 nearest tile centers (fair seams) eliminate early-stopped tiles and
fill the geodesic strips?

**Prediction.** Early-stop fraction (tiles stopping within 3 levels) drops
to ~0 at every zoom and in the geodesic window; median tile ink stays ≈ β;
determinism holds; blockiness judged by eye in the browser (no numeric
proxy yet).

**Result.** Early-stop tiles: 0% at every zoom level AND in the geodesic
window (was the E7 failure mode); depthMin rises from 1–2 to 17–78 (every
tile digs before stopping); median tile ink flat 25–28%; determinism
IDENTICAL; all 31 tests green. Time at extreme zoom worsens as expected
(4.8 s at k=9 — no early quitting + the unfixed pad-ring inflation; the
giant-pass amendment remains designed-and-pending). Visual verdict on
blockiness and strips: Steve's eyes in the browser.

---

## E8 — The simple approach vs v1's tube, forensically
**2026-07-04 · `scripts/experiments/simple-vs-tube.ts`**

**Question.** Steve: the tiled system is overly complex AND still leaves
gaps near geodesics that v1 (ray tube, visual ε, derived depth, draw
everything) did not have. Which ingredient of v1 filled those regions —
the absence of a budget (depth alone suffices), or the tube's membership
(over-collection beyond exact window roots)? And does the SIMPLEST cone
version — cone enumeration, v1's depth law, no budget machinery at all —
reproduce v1's look?

**Setup.** Geodesic window on the unit circle (center 0.6 + 0.8i, height
0.15, 700 px). Three renders, same style: (A) simple-cone: Φ_cone at
depth 3·A_vis, everything drawn; (B) v1 tube: harvestQuadratics, visual
ε₀ = 2c, same depth; (C) box(40) reference. Count dots landing in the
strip | |z|² − 1 | < 0.01.

**Prediction.** Genuinely split — this experiment exists to decide it:
if A ≈ B with strips filled in both, the budget was the culprit and the
simple approach wins; if B fills the strip and A does not, the tube
membership was the filler and we study exactly which polynomials B has
there. (C expected to show the classic hard gap.)

**Result.** Decisive. The simple cone is a strict SUPERSET of v1's tube in
the strip: 37,168 strip roots vs the tube's 14,007 (box: 2,440), in 149 ms
vs 2,176 ms. Images near-identical in structure — geodesics as beaded
chains with only the thin TRUE existence halos (a root at distance d from
|z|=1 requires a ≥ 1/2d), regions around them fully textured in both; the
cone version denser. Membership was never the problem. THE BUDGET WAS THE
CULPRIT: every gap Steve saw came from budget machinery stopping depth
near geodesics, and every epicycle (tiles, caps, bilinear shares) was
compensation for the previous epicycle.

**Conclusion.** Adopt the simple approach for the live view: cone
enumeration + v1's derived depth law + draw everything. Delete the budget,
tiles, caps, and shares. The one honest cost: deep-zoom ink saturation
(the original all-black report) returns as a KNOWN, deferred issue — the
single-formula candidate (zoom-adaptive size scale c ∝ h^{1/3}, constant
ink by derivation, no mechanism) is on file when it matters.

**Addendum (Steve, on the halos).** The existence gap is a theorem at
FIXED depth only: dig deeper locally and tiny dots genuinely live inside
the halos (distance d from the geodesic admits roots once a ≳ 1/2d). For
polished/print renders we WANT those dots — locally deeper marching near
structure for constant density. The concept of depth adaptation is
therefore validated for the OFFLINE path; only its live incarnation as
budget machinery failed. Open design item, to be taken up with the
population-contract framework when prints demand it. (tiled-budget.ts
removed with the mechanism it measured; git history keeps both.)

---

## E9 — Zoom-adaptive size scale: c(h) = c₀·(h/h₀)^⅓
**2026-07-04 · `scripts/experiments/zoom-scale.ts`**

**Question.** Total ink of the simple system scales as c³/h (saturation
theorem + depth law A ∝ c/h). Does the one-formula fix — size scale
c(h) = c₀·(h/2.6)^⅓ in the live worker, wide view unchanged — hold both
population and summed dot area per screen roughly flat across the zoom
ladder, where the fixed-c system doubles per level?

**Prediction.** Population and ink fraction (Σ per-dot pixel area, each
dot clipped at screen area) flat within ~2× across k = 0…9, vs ~2×/level
growth at fixed c. Depth still grows (A ∝ c(h)/h ∝ h^(−2/3)) — zooming
still summons deeper mathematics, just at constant visual budget.

**Result.** Confirmed decisively. Fixed c across the ladder: population and
ink explode (k=9: 430,711,000 polynomials, 149,636% of screen ink — the
saturation theorem in full bloom). Adaptive c(h): population ~flat
(19,820 → 46,960) and ink 5–17% from home to 500× zoom, with depth still
climbing 13 → 776 and ~1 ms per view. Mild ink drift at the extreme end
(~3× vs prediction's ~2×) noted honestly; acceptable. Adopted in the live
worker as one formula (cEff = sizeScale·cbrt(h/2.6)). Method write-up with
derivations and the generalization path: docs/live-sampling.md.

---

## E10 — Local count quotas (plan: local-quota)
**2026-07-04 · `scripts/experiments/local-quota.ts` · branch local-quota**

**Question.** Do per-cell count quotas (32px cells, N* = 48, uniform depth
as floor, two-pass margin harvest) deliver constant local texture density —
in particular, populate the halo strips beside thick geodesics with their
deep tiny dots — without the ink-budget pathologies (E6–E8)?

**Setup.** Geodesic window (0.6 + 0.8i, h = 0.15) and the zoom ladder;
quota vs uniform-depth baseline (current main). Metrics: per-cell owned
count distribution (min/median over above-axis viewport cells), population
in the halo strip | |z|²−1 | < 0.01, total population, time, determinism.

**Prediction.** Min cell count ≥ N* except axis/work-guarded cells (vs
near-0 minima at uniform depth near geodesics); halo-strip population
several × baseline; total population ≈ N*·cells and roughly flat across
zoom; time < ~100 ms typical, < ~500 ms at 500×; two runs IDENTICAL.
Watched risk: visible texture steps at cell seams — Steve's eyes decide;
recorded next options are smaller cells or interpolated quotas, not new
accounting.

**Result.** The contract holds perfectly; the halo prediction only partly.
Confirmed: every above-axis cell reaches exactly its quota (min/median
48/48 vs baseline min 24 — a 2× floor lift near the geodesic); population
flat ~21k across the zoom ladder; determinism IDENTICAL; typical views
~100 ms. Missed: (i) halo-strip enrichment is +9% (1,141 → 1,247), not
"several ×" — diagnosed: a 32px cell OUTSIZES the halo, so a cell
straddling the strip fills its 48 from the dense side and stops; quota
granularity bounds halo targeting from below by cell size. (ii) extreme
zoom 1.0 s at k=9 (per-cell-per-level call overhead, the mild residue of
E7's cost shape). Options if Steve's eyes want more: CELL_PX 16 (finer
targeting, 4× cells), or accept. No new accounting mechanisms — per the
plan's own rule.

---

## E11 — Print-scale local quotas: filling the geodesic halos
**2026-07-04 · `scripts/prints/geodesic-deep-quota.ts`**

**Question.** The deep print (a ≤ 487) still shows ~24px halo bands (the
existence law: nearest roots at 1/2A ≈ 0.001 world). Global depth to close
them (~12,000) is impossible (population ∝ A³). But at PRINT resolution a
32px cell ≈ halo width — E10's cell-outsizes-halo diagnosis inverts — and
empty-level scans near geodesics cost only ∝ a·cellWidth (no members, no
solving). Do print-scale local quotas fill the halos to ~pixel stipple for
seconds of extra cost?

**Prediction.** Halo bands narrow from ~24px toward ~1–2px stipple
(sub-pixel dots at the min-px clamp); total population grows only
modestly (strip cells stop at quota N* = 48; the deep strips hold few
members by definition); added time < ~20 s; determinism holds. The rest
of the picture is unchanged (quota floor = the uniform depth 487).

**Result. PREDICTION FAILED, cleanly diagnosed.** Deepest level = 487 = the
floor: no cell dug past it — every cell including halo cells met its quota
within the uniform depth, because the halo band (±24px) is comparable to
the 32px cell: straddling cells feed their quota from the dense side and
stop (E10's geometry lesson, which the prediction wrongly claimed print
scale would invert). Image ≈ identical to the plain deep print at 7× cost
(24 s vs 3.6 s — levels-outer per-cell call overhead × 13,225 cells).
Lesson (now twice-learned, recorded as a rule): QUOTAS EQUALIZE DENSITY AT
CELL SCALE AND CANNOT TARGET FEATURES NARROWER THAN A CELL. Filling halos
needs cells smaller than the halo — and tiny cells are only affordable
offline if the march is restructured cells-outer (one contiguous
cone range per cell — no live-streaming constraint offline), which also
removes the per-level call overhead that made this run 7× slower.

---

## E12 — Sub-halo cells, cells-outer march (offline)
**2026-07-04 · `scripts/prints/geodesic-fill.ts`**

**Question.** With 8px cells (⅙ of the halo width; quota 3 ≈ same density
target) and cells-outer iteration (one contiguous march per cell — no
live-streaming constraint offline, no per-level call overhead), do the
geodesic halos fill to ~pixel stipple at affordable cost?

**Prediction.** Halo bands narrow from ±24px to ~±2px min-clamp stipple,
fading in over ~a cell width at the halo boundary (8px cells still
straddle there); the rest of the picture pixel-identical to the plain deep
print (floor unchanged); population grows only by the strip contribution
(quota-bounded, ~tens of thousands); total time < ~60 s; deterministic
(block-granular stops).

**Result. CONFIRMED.** Halo bands collapse from ±24px to thin seams with
stipple filling to the existence limit; deepest cell marched to a = 1216
(2.5× the floor — the digging finally happened); ALL 204,304 cells stopped
by quota, zero work-guard bailouts; 3.28M polynomials in 29.9 s (within
prediction); rest of the picture unchanged. The twice-learned rule held:
cells (8px) smaller than the feature (±24px halo) target it; the
cells-outer restructure made 204k cells affordable by removing per-level
call overhead. Remaining known softness: fill fades over ~a cell width at
halo boundaries; knife-edge filling, if ever wanted, is the geodesic-aware
sub-family enumeration (Farey-indexed near-geodesic cones) — recorded as
the future tool, not attempted.

---

## E10–E12 verdict (Steve's eyes, the final test)
The E12 halo fill reads as SCATTERED NOISE inside the halos, not structure;
the live quota (E10) is visually indistinguishable from uniform depth.
Decision: the simple system stands on both paths — live = cone + derived
depth + cube-root scale (unchanged main); prints = the same law at print
depth (scripts/prints/geodesic-deep.ts). The quota machinery is retired to
the experimental record (scripts/experiments/, tiling module kept for the
scripts and its tests). Three attempts, one consistent lesson, now a house
rule: local density equalization keeps failing the eye — if halo treatment
is ever wanted, start from the MATHEMATICS (Farey-indexed near-geodesic
sub-families), not from spatial accounting.

---

## E13 — The monic cubic cone: no saturation, no scale law
**2026-07-05 · `scripts/experiments/monic-cubic-zoom.ts` · docs/monic-cubic-sampling.md**

**Question.** The derivations claim: population ∝ ρ³ (4.2); total ink
CONVERGES (∫du/q = π/y beats the measure, 4.3–4.4) and its fraction is
zoom-independent at FIXED size scale — monic cubics need no cube-root law.
Do measurements agree?

**Setup.** Zoom ladder into 0.318 + 0.842i, heights 2.4/2ᵏ, k = 0…8;
fixed c_sz = 0.03; march cutoff ρ = √(3·c_sz/2p) (visibility × dust-in-ρ);
metrics: population, ink fraction (per-dot min(πr², screen)), time.
Population-vs-ρ at fixed window as the ∝ ρ³ check.

**Prediction.** Ink fraction roughly FLAT across all k at fixed c_sz
(within ~2×, dust-clamp drift allowed) — the (4.4) cancellation; population
∝ ρ³ within ~20%; times live-viable throughout.

**Result. CONFIRMED.** Ink fraction flat (0.2–0.7%, one 2.0% at k=8) across
2.4 → 0.009 window heights at fixed c_sz — the (4.4) cancellation is real;
no adaptive scale law for monic cubics. All times ≤ 3 ms. Cubic growth in
ρ verified in the unit tests (cone ≡ brute force over 132k candidates,
first run). Also learned: the visibility-depth population is SPARSE
(~800 dots at the home frame) — monic cubic print texture comes from extra
dust depth, cheap since population ∝ ρ³ (a ×4 dust multiplier on ρ buys
×64 dots).
