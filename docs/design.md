# Starscapes — Design

*Grown from settled conversation only; each level gets written down when we've
agreed on it, and deeper detail is added as we descend. Level 0 below.
(2026-07-04)*

---

## Level 0 — What the system is

Starscapes draws pictures of the roots of families of polynomials in the
complex plane. Three products: **exhibition prints** (gigantic, beautifully
rendered), **paper figures**, and **live exploration** (pan, zoom, restyle,
see things quickly).

A picture is specified by four things:

    picture = family + style + search + target

### Family
A specification of an *infinite* set of polynomials — degree, which
coefficients are free, constraints among them (monic, palindromic, a = d, …).
The family is the mathematical object; everything else selects from it,
decorates it, or renders it. Its coefficient domain is one of:

- a **lattice** (integer coefficients — the typical case, and probably all
  we'll ever need for arithmetic pictures), or
- a **continuous region** (e.g. an affine subspace of polynomial space),
  for pictures of how measures push forward under the root map — sampled
  rather than enumerated, floating-point rather than exact.

- *Open:* coefficient rings beyond ℤ (Gaussian integers, other number rings).
- A family **may** declare a symmetry: a group acting compatibly on
  coefficients and on roots (e.g. SL₂(ℤ) on integer quadratic forms, acting on
  roots by Möbius maps; translations x ↦ x+n and reflection on any monic
  family). Symmetry is *opportunistic structure, never foundation*: nothing
  requires it, and the system exploits whatever strength is available —
  fundamental domain + reduction when known, mere orbit expansion (translate
  harvested polynomials into the window using generators) otherwise, nothing
  at all and everything still works. Transport is free of solving: coefficients
  move by the integer action, roots by the root action.

### Style
Per-root functions — size and color (possibly bundled as one styling
function) — that see the root and its polynomial's data (coefficients and
derived quantities: discriminant, Galois class, height, …). Styles are
arbitrary user functions; this is a core requirement, not a convenience.
Styles always evaluate on the actual polynomial being drawn (symmetry
transport re-evaluates, never inherits).

- *Next level:* the exact contract of what a style function sees.

### Search — two ways to say "which polynomials"
1. **Forward:** a region in coefficient space (box, ball, height bound, …)
   cuts a finite piece out of the family: *enumerate* its lattice points
   (discrete family) or *sample* it with a measure and a count (continuous
   family). Plot all of it.
2. **Inverse / density:** seed *trace points* across the image window; for
   each, trace the affine subspace {f : f(z) = 0} ∩ family against the
   family's lattice (the raymarching construction of shaders.tex) and
   **harvest every lattice point within ε along the trace**, up to declared
   cutoffs — not just the first hit. Dedupe the harvest across trace points,
   then hand the survivors to the same downstream as mode 1: solve exactly,
   style, splat their true roots.
   - The user-facing density dial is the **seeding of trace points**
     (uniform at ~pixel resolution ⇒ constant ink density; other measures ⇒
     other densities). ε and similar are derived from the view unless
     overridden.
   - Relevance is guaranteed by construction: every harvested polynomial has
     a root in the window, at any zoom — zooming is asking for more
     mathematics.
   - *Superseded in implementation (2026-07-04):* the trace-point/ray
     formulation above remains the SHADER MODE's mathematics and the CPU
     reference for it, but the point pipeline realizes inverse search by
     **view-cone enumeration** — the same population, enumerated directly
     with work ∝ population, no seeds or tubes (E4/E5/E8;
     [live-sampling.md](live-sampling.md)). The "zooming asks for more
     mathematics" property carries over unchanged.

### Target — two renderers, one downstream
Both search modes feed one pipeline: solve → derived quantities → style →
splat.

- **Live:** pan/zoom/restyle fluidly. The session **accumulates** its deduped
  harvest — re-project instantly on camera change, fill in newly warranted
  polynomials progressively. Instant restyle preferred, not required.
- **Offline:** deterministic — the output is a pure function of the
  specification, journey-independent — at gallery scale.
- Compositing, both targets: **additive density** and **opaque size-ordered**
  (smaller disks pile on top of bigger; order-independent) in v1;
  **translucent size-ordered** deferred but must remain addable.

### The third mode
The same incidence/marching machinery, consumed directly as an image: color
each pixel by the march outcome (the proximity-field pictures of
shaders.tex). Shares the family and the camera; a sibling, not a stage of
the point pipeline.

---

## Open at this level
- Coefficient rings beyond ℤ.
- How much structure a symmetry declaration carries (inventory of real
  examples is small so far: SL₂(ℤ) on forms; translations + reflection on
  monic families).

---

## Level 1 — Settled contracts

### What solve promises

Solve returns **all d roots with multiplicity**, always. Real roots sit
exactly on ℝ when certifiably real; "upper half-plane only" is a downstream
filter, never solver behavior (real-root pictures stay available). Output is
**deterministic**: the same specification yields the same roots regardless of
how work was parallelized.

The promise is tiered by what the coefficients *are*, and the mode in force
is always **explicit** — recorded in every artifact, never silent:

- **Exact inputs** (integer coefficients; bigint as heights demand).
  Target degree ≤ ~50.
  - **δ-certified mode** (the goal): given resolution δ derived from the
    view, every returned root is within δ of a true root and vice versa;
    roots closer than δ may be reported as one point carrying the cluster's
    *exact* total multiplicity (integer gcd(f, f′) — exact structure is
    decidable because inputs are exact); anything uncertifiable at δ is
    flagged, never silently wrong. Fast float64 path (Aberth–Ehrlich +
    Newton polish + certified bound) handles the bulk; escalation to higher
    precision is paid only near the discriminant locus. Zooming shrinks δ —
    the solver-level face of "zooming asks for more mathematics."
  - **Best-effort mode** (the explicit fallback): plain float64 + polish +
    residual-based suspect flags, no certification. Legitimate; just labeled.
- **Float inputs** (sampled continuous families): the generic promise —
  float64 + polish, residual error estimates, suspects flagged. No exact
  tier, and rightly so: for coefficients drawn from a continuous measure,
  multiple roots and reducibility are measure-zero events with no fact to
  certify.

Exact preprocessing (square-free part, irreducibility, exact discriminant)
is available for exact inputs; whether it runs eagerly or on demand is a
cost tunable, not part of the contract.

### What a style function sees

**Style = arbitrary user function over named, predigested, honestly-typed
invariants.** Exactness lives inside the invariant computations, not in user
code: each named quantity arrives in its natural type — `disc` as a float
(you only ever size by it), `discIsSquare` and `irreducible` as exact
booleans (decided with integer arithmetic), `galoisClass` as a label,
`coeffs`/`params` as raw values when wanted. The vocabulary is extensible:
adding an invariant is writing one pure function; style functions are
compositions over the vocabulary, so user code stays fast, simple, and
honest.

Starting vocabulary — per polynomial: `degree`, `coeffs`, `params` (the
family's own coordinates), `disc`, `discIsSquare`, `irreducible`,
`galoisClass` (deg ≤ 4), `height`, `mahler`, `leadingCoeff`,
`realRootCount`. Per root: the root, `multiplicity`, `isReal`, and
`siblings` (the polynomial's other roots — the primitive behind whole-root-
set conditions like Pisot, so new such conditions can be invented in user
code without new system machinery).

**Sizes carry declared units:** `world` (a disk in ℂ, scales with zoom),
`screen` (constant visual weight), or `hyperbolic` (the ℍ-metric — the
canonical starscape sizing, first-class so nobody hand-writes the Im z
correction). Zoom behavior follows the declaration.

**Filters are predicates over the same vocabulary, and their placement is
derived, not user-managed.** Every vocabulary entry is tagged by what it
needs (coefficients only vs. roots); each filter hoists as early as its
dependencies allow: coefficient-only predicates (irreducible, disc
conditions) run *before solve* — or even inside the inverse-mode march,
which is what the shaders.tex in-trace irreducibility check was — while
root-dependent predicates (Pisot, UHP-only) run after, in two scopes: drop
the polynomial (whole-root-set conditions) or drop the root (UHP keeps one
of each conjugate pair). "Color by condition" is not a filter at all — it's
styling by a boolean invariant; everything is drawn.

### How live and offline relate

**The picture specification is a single serializable document** — family,
style, filters, search mode and dials, camera/window, target size, solve
mode — and it is the *only* thing that crosses between worlds. The live
explorer is an editor for this document (every pan, restyle, dial-turn is an
edit); "make the print" hands the current document to the offline renderer,
which reproduces it deterministically at scale. The spec is the provenance,
embedded in every output's metadata: prints are exactly reproducible, paper
figures regenerate when revised.

**Iterating on a print reuses the solved harvest.** When a new spec differs
from a previous run only in style/tone, the system reuses that run's solved,
invariant-decorated root set and recomputes only style → splat — restyling a
giant print in minutes, not hours. Matching is automatic: the intermediate
is keyed by the spec minus its style parts, so a changed family or search
invalidates it by construction. This intermediate is **temporary by
design** — a scratch cache (these can be GBs), cleaned up at session end or
by size/age policy (tunable), never an archive: the spec is the permanent
record and everything cached is regenerable from it, so deletion can never
lose a picture. The *capabilities* are permanent even though the cache is
not: **reprinting** any picture is always possible from its spec, and
**restyling** is always possible — fast while the harvest is cached, by
recompute after it's gone. A harvest can be **pinned** while a print is
under active iteration (possibly across days), exempt from cleanup until
released.

---

## Level 2 — Toolchain, shape, build order (settled)

**Toolchain.** TypeScript everywhere, strict. Browser apps (live explorer,
march view) served by Vite. Offline renderers are plain Node scripts run
directly via native TS stripping — no build step for prints. Vitest.
Runtime dependencies: essentially none — `pngjs` for output, possibly the
whole list. Live explorer renders with **raw WebGL2** (instanced 2D disks;
no three.js — full control of depth/blend for the two compositing modes).
Parallelism (Web Workers / `worker_threads` over one shared core) is in the
design from day one even where phase 1 runs single-threaded.

**Module shape, coarse grain.** A runtime-agnostic **core** — families,
solvers, invariants, incidence/march geometry; pure math, importable
anywhere, imports nothing — thin **pipeline** machinery on top, and three
consumers: live app, offline scripts, march view. Dependency rule is strict
and downward.

**Old code.** The complete January state (full git history *and*
uncommitted working tree) is snapshotted at `~/Code/starscapes-january/` —
reference material alongside limit-sets and variety-point-clouds. This repo
gets cleared when building begins and the new system starts clean.

**Build order** (each phase ends in something visible; adjustable as we
learn). Status as of 2026-07-04:
1. **Offline print — ✅ done** (minus `irreducible`): core spine, quadratics
   + cubics, forward search, disc/height invariants, both compositing
   modes, first-light and cubics prints.
2. **Inverse sampler — ✅ done for quadratics**, realized as view-cone
   enumeration after E4–E8 (see the supersession note in Level 0 and
   live-sampling.md); ray version retained as the shader-mode reference.
   Cubics: the next mathematics (cofactor cutoff + per-family constant-ink
   exponent, live-sampling.md §5).
3. **Live explorer — ✅ working** (pan/zoom, worker streaming, derived
   depth, constant-ink zoom; deep prints from any window via script).
   **Missing: the save button** — recipe export, the explore → print
   handshake — the one open piece of explorer v1.
4. **The rest by priority:** march view as a direct image, symmetry
   exploitation, continuous families, δ-certification escalation tiers,
   Galois invariants, workers at scale, tiling for beyond-RAM prints,
   and (parked with direction) Farey-indexed near-geodesic sub-families
   for halo treatment.

## Level 2 — Inverse sampler mathematics (partially settled)

**The framework.** For family φ(m) = Am + b and trace point z, the incidence
set V_z = {f : f(z) = 0} is codimension 2; W_z = φ⁻¹(V_z) ⊂ ℝᵏ is an affine
subspace of dimension k − 2. The sampler finds lattice points near W_z by
fixing (k − 3) coordinates to integers and marching the resulting lines —
the shaders.tex quadratic/cubic/quartic derivations are instances, done in
the cofactor basis (f = (x² − 2sx + n)·g), which is also what keeps
mid-march data meaningful (a cubic's trace parameter is its real root).
This computation mechanizes for any affine family.

**The exchange rate.** The ball lives in coefficient space; the picture
lives in root space; |f′| is the exchange rate between them
(dist(f, V_z) ≈ |f(z)|/‖(1,z,…,z^d)‖ vs "root within δ" ≈ |f(z)| ≲ δ|f′|).
A fixed tube over-collects near the discriminant locus (harmless — solve
exactly, cull) and misses large-|f′| polynomials — which, under disc-type
size laws (|f′(w)|² = |disc| for quadratics), are exactly the dots too
small to see.

**Settled (2026-07-04, refining the earlier "criterion" framing after the
first experiments — see docs/experiments.md): population contracts.**

The root measure of a family is infinite — every window contains infinitely
many roots — so *every* picture, forward or inverse, is a truncation: a
choice of finite sub-population of (polynomial, root) pairs. There is no
"the" starscape. The framework makes that choice first-class:

- **A population contract Φ** is a named, precise definition of a finite
  sub-population (possibly view- and style-dependent). Examples:
  Φ_box(B) (coefficients in a box — the forward object), Φ_disc(D)
  (|disc| ≤ D — SL₂(ℤ)-invariant, the canonical quadratic truncation),
  Φ_visible (styled dot ≥ 1 pixel at this zoom), Φ_ink(τ). Future theory
  (the pushforward-density work) arrives as one new named contract.
- **Coverage plans are derived, never dialed.** Given Φ, the march
  parameters (tube radius, depth, candidate windows) are *computed from
  the contract* as a sufficiency claim — "this plan finds every root in
  the window belonging to Φ" — either proved (a small lemma; the
  exchange-rate estimates are of this kind) or labeled `heuristic`, and
  the label travels into every artifact. ε/aMax/depth cease to exist as
  user-facing knobs.
- **Membership is exact; coverage may over-shoot.** The plan bounds the
  search; the contract's exact membership test filters the harvest. So
  over-coverage is harmless and completeness is the only obligation.
- **The verification harness**: any contract with a brute-force
  ground-truth enumeration on a test window gets its plan validated by
  set-diff and image-diff (the parity rig, generalized). A candidate
  "right answer" is accepted this way — one new contract, one harness
  run, nothing else moves.
- **Thinning is downstream of completeness.** Prescribed-density pictures
  (mode 2's "specify a density and hit it") are realized by faithfully
  harvesting a complete superset, then deterministically thinning as
  explicit post-processing. Sampling bias never enters through the search
  geometry.

Empirical basis (experiments E1–E3, docs/experiments.md): fixed-ε is a
*tool-defined* population — circular, hence untunable artifacts; the
adaptive depth a ≲ √D/2y that emerged empirically is precisely Φ_disc(D)'s
coverage plan; and Φ_disc's faithful picture is Euclidean-dense near ℝ
(uniform in *hyperbolic* area, as its SL₂-invariance dictates) — "is it
meant to be even" is exactly the "which Φ" question.

*Still open at Level 3:* the tube-radius lemma for Φ_disc's proved plan;
slicing-coordinate choice for constrained families (cofactor vs numerically
optimal bases, degenerate z); symmetry hooks in the march. (The contract
interface shape is settled — see "Search strategies in code" below.)

**The live view's settled sampling method — view-cone enumeration, the
derived depth law, and the constant-ink scale law c(h) ∝ h^⅓ — is written
up with its derivations and generalization path in
[live-sampling.md](live-sampling.md)** (validated in experiments E4–E9;
the population is Φ_cone(W, A), the first named, provably complete
contract in the codebase).

## Remaining Level 2 conversations
1. Rendering semantics in detail (tone mapping, antialiasing, gallery
   quality) — refined during phases 1–2 as real images exist to judge.

---

## Level 3 — Search strategies in code (settled 2026-07-05)

Sampling is first-class: two types split *how we choose* from *what got
chosen*.

- **SearchStrategy** — the citizen. `mode: "forward" | "backward"`, its
  family, and `populationFor(view)`: bind to a view, derive every cutoff
  (nothing dialed), return the concrete population. Forward strategies cut
  coefficient space and ignore the window; backward strategies start from
  the window in root space. The picture spec stores strategy + dials
  alongside the view, so the camera is single-sourced; the live explorer
  is honestly "regenerate Φ on every camera move."
- **Population** — Φ itself, finite and bound. `describe()` freezes the
  provenance string ("Φ_cone(W, A = 812)") that embeds in artifacts;
  `enumerate(onBatch)` streams every member in kernel batches,
  deterministic order, possibly overshooting by rounding slack (exact
  membership / clipping filters downstream); `coverage: "proved" |
  "heuristic"` makes the plan's status travel with the data.
- **ViewContext carries the style's size scale**, not just the window:
  derived depth is style-dependent through visibility. This is the design's
  own statement that populations like Φ_visible are view- AND
  style-dependent — a real coupling, not a leak.
- **The interface is family-generic; implementations are per-family
  derivations** (derivations over mechanisms). A family joins the backward
  mode the way monic cubics did: slicing derivation in a doc, enumerator,
  parity test against brute force, registration.
- Placement of the existing code: `box` ⇒ the forward strategy;
  `coneQuadratics` / `coneMonicCubics` plus the depth/reach/pad laws now
  inlined in the live worker ⇒ the two backward strategies (the laws move
  into the strategies, in core, cited to their doc sections); the ray/tube
  harvest stays the shader-mode reference, not wrapped in v1.

## Level 3 — Sizing rules in code (settled 2026-07-06)

Styling's size half becomes a pillar like search: an interface, a named
library, and arbitrary hand-written rules staying first-class. Power laws
and visibility-derived backward search are *compatible options, not
requirements* of the pillar.

- **A sizing rule returns the Euclidean world radius — the size we actually
  draw.** No units flag: a rule wanting hyperbolic behavior writes the `· y`
  itself (or uses a named law that does).
- **The cap is standardized under a transparent name**: `cap` in hyperbolic
  units — no dot exceeds cap · y world radius (today's universal 0.5). It is
  **removable**: uncapped is a legitimate setting, and comparison figures
  (same picture, cap off) are a queued Tier-1 experiment.
- **Declared power structure, f′ form.** A rule may declare
  `power = { c, gamma, delta }`, meaning

      r = c · y^δ / |f′(z)|^γ,   z the plotted root.

  Chosen over the disc form r = c·y^β/|disc|^α because *within* a degree
  the two are linear reparametrizations of the same 2-parameter family
  (deg 2: |f′(z)| = √|disc|; deg 3: |f′(z)|² = 2y·√|disc|), but *across*
  degrees only the f′ coordinates keep the same look at the same exponents:
  the uniformity locus is (γ, δ) = (1, ½) at degrees 2 AND 3 (verified
  2026-07-05), the classic hyperbolic look is (1, 1) at both. And
  |f′(z)| = |a|·∏|z − w| over the co-roots computes degree-generically from
  root slots — new degrees inherit the whole vocabulary with their solver.
  **Steve's condition: the implementation must document this extremely
  clearly** — the power-law constructor's doc comment states the form, the
  coordinate-choice argument, and the placement table below; a `discLaw(α,
  β, degree)` convenience may convert into f′ form.
- **Coupling to backward search: the strategy pulls (Option A).** A backward
  strategy needing size structure reads the declared `power` from
  ViewContext and derives its cutoffs; binding a structure-needing strategy
  to an opaque rule fails loudly at bind time. Opaque rules remain fully
  usable with forward searches and structure-free strategies.
  `Population.describe()` keeps freezing the derived cutoffs into artifacts.
- **Placement of existing code** (executed 2026-07-06, pixel-equivalence
  verified bit-identical on first-light, quadratics-cone, monic-cubics-cone)
  — every law in the pre-refactor repo was a lattice point of the f′ form,
  now expressed through the named library:

  | today | (γ, δ) |
  |---|---|
  | quadratic classic c/√\|disc\| (worker, quadratics-cone std) | (1, 1) |
  | quadratic uniform (quadratics-cone) | (1, ½) |
  | cubic "disc" steep (monic-cubics-cone) | (2, 2) |
  | cubic "fprime" vivid (monic-cubics-cone) | (1, 1) |
  | cubic "disc4" uniformity locus (worker, monic-cubics-cone) | (1, ½) |
  | style.ts `hyperbolicSize` scale/\|disc\| (first-light only) | (2, 1) |

  The four inline transcriptions (live worker ×2, both cone print scripts)
  now route through the named laws, via the one shared styling loop
  (core/stylePass.ts — live and print cannot drift); `hyperbolicSize`'s
  "canonical" doc comment was a misnomer for the (2, 1) point and the
  function is gone.
- **Coloring rules are the next conversation** (a parallel vocabulary over
  the same root row: Galois class, disc sign, height, …). Not settled here.

## Level 3 — Code conventions (settled)

- **Coefficient storage is ascending**: `coeffs[k]` is a_k, the coefficient
  of xᵏ, exactly as in f = Σ aₖxᵏ — so literature formulas transcribe
  verbatim (f′ has coefficients (k+1)aₖ₊₁, resultant matrices index by
  subscript). **Display is descending** (highest power first, as written on
  paper): storage indexing and print order are separate concerns.
- **Families mean exact degree.** "Integer quadratics" contains no linears
  (leading coefficient ≠ 0 is part of the definition). A `degreeUpTo(n)`
  family is the *disjoint union* of exact-degree families — no special
  machinery, since `degree` is already a vocabulary entry styles can read.
  General principle: **families compose** (a disjoint union of families is
  a family; each polynomial keeps its own facts).
- **Canonical sign by default:** f and −f have identical roots, so family
  constructors default to leading coefficient > 0; the fully-signed family
  is an explicit option for when sign carries meaning.
- **Phase 1 first light:** integer quadratics in a box — the classic test
  case.
