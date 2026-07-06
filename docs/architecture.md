im # Starscapes — Architecture Specification

*Companion to [design.md](design.md), which records goals, decisions, and
rejected alternatives. This document is the technical spec: modules, data
formats, protocols, and execution paths. Where design.md says "why," this
says "what, exactly." Sections marked ⚠ contain decisions made while
drafting that need review.*

---

## 1. Layered architecture

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │  FRONTENDS                                                             │
 │                                                                        │
 │  scripts/prints/*.ts        src/live/app.ts          demos/march.html  │
 │  (offline CLI, Node)        (explorer, browser)      (march, browser)  │
 │        │                          │                        │           │
 │        ▼                          ▼                        ▼           │
 │  scripts/render.ts          live/ orchestration       march/ harness   │
 │  (generic driver: argv,     (worker pool → GPU        (fullscreen quad,│
 │   presets, cache, tone)      buffers → rAF loop)       uniforms)       │
 ├────────────────────────────────────────────────────────────────────────┤
 │  EXECUTION                                                             │
 │                                                                        │
 │  engine/workers/            raster/                  march/incidence   │
 │  protocol, pools,           accumulator, deposit     (affine family ∩  │
 │  worker body                backends, merge, tile,    incidence space  │
 │                             tone, supersample, png     → march data)   │
 ├────────────────────────────────────────────────────────────────────────┤
 │  PIPELINE                                                              │
 │                                                                        │
 │  engine/batch.ts     engine/pipeline.ts     engine/cloud/    engine/   │
 │  (columnar batch     (stage composition:    (.cloud format,  cache.ts  │
 │   layout, RowView)    sample→solve→inv→      restyle path)   (hashing) │
 │                       filter→style)                                    │
 ├────────────────────────────────────────────────────────────────────────┤
 │  CORE  (pure math, float64, zero deps, runs in any JS runtime)         │
 │                                                                        │
 │  complex  polynomial  family/  solve/  invariants/  sample/  style/    │
 └────────────────────────────────────────────────────────────────────────┘

 Dependency rule: strictly downward. core imports nothing. engine imports
 core. raster imports core + engine types. Frontends import everything.
 march imports core (families, camera) and nothing from engine/raster.
 Node-only code (png, worker_threads, fs) lives in leaf files so the
 browser bundle never touches it.
```

The march mode's isolation is architectural, not incidental: it shares the
*mathematical* layer (families, camera/viewport, palettes) and nothing from
the point pipeline. If it ever moved to its own repo, the cut line is
`src/march/` plus its demos.

---

## 2. Module inventory

### `src/core/` — the math

| File | Exports | Responsibility |
|---|---|---|
| `complex.ts` | `cAdd/cMul/cDiv/…` on `(re, im)` pairs at array offsets | Flat complex arithmetic. **No `{re, im}` objects anywhere** — vpc's measured GC lesson. |
| `polynomial.ts` | `evalAt`, `evalDerivAt`, `derivative`, `discriminant` helpers | Horner evaluation and coefficient-slice operations on `Float64Array` + offset. |
| `family/types.ts` | `Family`, `AffineStructure` | See §3.1. |
| `family/affine.ts` | `affineFamily(A, b, ranges)`, constructors `fullDegree(d, bound)`, `monic(d, bound)`, `withPattern(…)` | Affine tier; owns the matrix/offset representation and parameter-range metadata. |
| `family/parametric.ts` | `parametricFamily(k, d, fn, ranges)` | Escape hatch `(params, out) => void`. |
| `family/dsl.ts` *(phase 7)* | `` poly`…` `` | Parses to affine/parametric; detects affinity; pretty-prints. Front end only — nothing imports it except frontends. |
| `solve/types.ts` | `Solver`, `SolveStatus`, `TOL` table | One named tolerance table for the whole solve layer (vpc pattern). |
| `solve/quadratic.ts`, `solve/cubic.ts` | closed-form batch solvers | Exact branch decisions; also export scalar versions for tests/march-mode checks. |
| `solve/aberth.ts` | general-degree batch solver | Aberth–Ehrlich, Cauchy-bound seeding, **warm starts** (§5.2). Durand–Kerner kept as a reference implementation for cross-checking. |
| `solve/polish.ts` | `polishBatch`, residual check | Newton polish; sets per-root `SolveStatus` (converged / suspect / real-axis). Suspect roots are *flagged, never silently dropped*. |
| `invariants/` | `Invariant` impls: `disc`, `height`, `rootType`, `irreducible`, `galois` (deg ≤ 4), `mahler`, `leadingCoeff` | Each file one pure function + registration. `registry.ts` maps name → impl and resolves a `needs` list into an ordered compute plan (invariants may depend on other invariants, e.g. `galois` needs `disc`). |
| `sample/types.ts` | `Sampler`, `ViewWindow`, `Shard` | `Shard` is the unit of work distribution (§6). |
| `sample/box.ts` | `boxSampler` | Height-shell enumeration: expanding sup-norm shells over parameter space, deterministic order within a shell (§6.4 determinism). |
| `sample/pruned.ts` *(future)* | interval root-bound pruning | Same interface; consumes `ViewWindow`. |
| `style/types.ts` | `Style`, `RowView`, `Filter` | `RowView` is a cursor over one root's row of the batch (index + column table), zero-allocation. |
| `style/presets.ts` | `hyperbolicSize(scale, cap)`, `byCategory(inv, palette)`, `byContinuous(inv, ramp)`, `irreducibleOnly`, `upperHalfPlane` | The standard vocabulary; users can always hand arbitrary functions. |

### `src/engine/` — the pipeline

| File | Responsibility |
|---|---|
| `batch.ts` | `RootBatch` allocation and layout (§4.1); `RowView` implementation; batch reuse pool (batches are recycled, never reallocated per batch). |
| `pipeline.ts` | `makePipeline(spec): (shard, emit) => void` — fuses sample→solve→invariants→filter→style into one loop over a shard, emitting styled batches. This is *the* hot loop; everything it calls was resolved to monomorphic closures at construction. |
| `cloud/format.ts` | `.cloud` reader/writer (§4.2). Chunked columnar; sequential-scan friendly. |
| `cloud/stream.ts` | Restyle path: stream a `.cloud`, apply filter+style, emit styled batches — identical emit contract as `pipeline.ts`, so consumers can't tell solve-fresh from replay. |
| `cache.ts` | Content-address hashing: canonical JSON of (family description, ranges, solver config, invariant list \| style, view, resolution \| tone) → SHA-1 → artifact path under `outputs/cache/`. Each stage checks its key before computing. |
| `workers/protocol.ts` | Message and transferable-buffer shapes (§6.2). Runtime-agnostic. |
| `workers/body.ts` | The worker program: receives init + shards, runs `makePipeline`, emits per mode (§6.3). Shared verbatim between runtimes. |
| `workers/nodePool.ts` / `webPool.ts` | Thin adapters: spawn, transfer, lifecycle. The only files that know which runtime they're in. |

### `src/raster/` — pixels

| File | Responsibility |
|---|---|
| `accumulator.ts` | Grid allocation for both backends (§5.4 layouts); bounds, channel math. |
| `disk.ts` | The one disk rasterizer: interior full-weight, rim exact-coverage; takes a per-pixel callback so both backends share it. Radius in supersampled pixel units. |
| `additive.ts` | Deposit: `+= coverage · (r, g, b, 1)` into 4 channels. |
| `opaque.ts` | Deposit: z-buffer rule — if `radius < depth[px]`, overwrite color+depth. Coverage < 1 at rims handled by supersampling, not blending. |
| `merge.ts` | Commutative merges: sum (additive), min-radius-wins (opaque). Used for worker results and tile assembly. |
| `tile.ts` | Tiling scheme (§7). |
| `tone.ts` | Develop phase: additive → percentile/log/gamma + background; opaque → color-resolve + background. Never touches point data. |
| `supersample.ts` | Box-filter downsample SS× → 1×. |
| `acc-format.ts` | `.acc` file (limit-sets format, extended meta), atomic write, mid-run checkpoint. |
| `png.ts` | Node-only (pngjs). |

### `src/live/`, `src/march/`, `scripts/` — per design.md §8–9; details in §8 below.

---

## 3. Core contracts (full signatures)

### 3.1 Family

```ts
interface Family {
  readonly degree: number;          // d
  readonly paramRank: number;       // k
  readonly ranges: ParamRange[];    // per-parameter integer bounds (enumeration metadata)
  /** φ: write coefficients of φ(params) into out[outOff .. outOff+d]. */
  coefficients(params: Int32Array, out: Float64Array, outOff: number): void;
  /** Present iff φ(m) = A·m + b. Enables march mode + smarter enumeration. */
  readonly affine?: { A: Float64Array /* (d+1)×k row-major */; b: Float64Array };
  /** Human/machine-readable self-description, e.g. "x^3 + a x^2 + b x + c". */
  describe(): string;
}
```

⚠ Coefficient order convention: **descending**, `coeffs[0]` = leading. (The
January repo used descending; vpc used ascending. Pick once, assert
everywhere, convert at the vpc-solver boundary.)

### 3.2 Solver

```ts
type SolveStatus = 0 /* ok */ | 1 /* suspect */ | 2 /* degenerate */;

interface Solver {
  readonly maxDegree: number;
  /** Solve polyCount polynomials of the given degree.
   *  Writes d roots per polynomial (re/im columns), status per root.
   *  warmRe/warmIm, if given, seed the iteration (previous lattice point's roots). */
  solveBatch(
    coeffs: Float64Array, polyCount: number, degree: number,
    outRe: Float64Array, outIm: Float64Array, outStatus: Uint8Array,
    warmRe?: Float64Array, warmIm?: Float64Array,
  ): void;
}
```

Real roots are emitted with `im` exactly 0 (post-polish snap when
`|im| < TOL.realSnap · scale`); "upper-half-plane only" is then a *filter*,
not solver behavior.

### 3.3 Invariants, filters, styles

```ts
interface Invariant {
  readonly name: string;
  readonly per: "polynomial" | "root";
  readonly needs?: readonly string[];               // other invariants
  fill(batch: RootBatch, out: Float64Array): void;  // one column
}

type Filter = (row: RowView) => boolean;

interface Style {
  readonly needs: readonly string[];
  size(row: RowView): number;                       // world-units radius, pre-clamp
  readonly sizeCap: number;                         // world-units, mandatory (§design 6)
  color(row: RowView, out: Float32Array, off: number): void;  // rgb 0..1
}

interface RowView {                                  // zero-alloc cursor
  readonly rootRe: number; readonly rootIm: number;
  get(column: string): number;                       // resolved to array index at pipeline build
}
```

Categorical invariants (Galois group, root type) encode as small integers in
their `Float64Array` column with a documented code table in the invariant's
file; `byCategory` styles map code → palette entry.

---

## 4. Data formats

### 4.1 `RootBatch` (in memory)

One batch = up to `P = 65_536` polynomials of one degree `d` (batch size ⚠
tunable, chosen to keep a batch's full column set under ~8 MB → L2/L3
friendly and cheap to transfer).

```
coeffs      Float64Array  P·(d+1)     input coefficients
paramBase   Int32Array    k           first lattice point (+ shard order ⇒ reconstructible)
rootRe      Float64Array  P·d         all roots, polynomial-major
rootIm      Float64Array  P·d
rootStatus  Uint8Array    P·d         SolveStatus
rootPoly    implicit                  root i belongs to polynomial ⌊i/d⌋
columns     { [name]: Float64Array }  per-poly cols length P, per-root cols length P·d
count       number                    valid polynomial prefix
```

Batches live in a pool and are reused. `RowView.get` resolves column names
to direct array references when the pipeline is built — the hot loop does no
map lookups.

### 4.2 `.cloud` file — the root-cloud cache

Chunked columnar, built for sequential streaming (restyle at disk bandwidth):

```
"SCLD" magic | u32 version | u32 headerLen | JSON header | chunk*  | u64 chunkCount trailer
JSON header: { family: {describe, hash}, degree, solver: {…}, columns: [{name, per, dtype}],
               createdAt, counts: {polys, roots} }
chunk: u32 polyCount | u32 rootCount | for each declared column in order:
       raw little-endian array (rootRe f64, rootIm f64, status u8, then invariant columns) |
       u32 crc32
```

- Column dtypes: `f64` default; invariants may declare `f32` or `u8`
  (categorical) — height and category columns don't need doubles. ⚠
- A chunk is one batch's worth; the restyle path reads chunk → batch →
  filter/style → emit, allocation-free.
- Coefficients are **not** stored (reconstructible from family + param
  order; storing them would double file size). ⚠ Revisit if a style ever
  needs raw coefficients — cheap to add as opt-in columns.

### 4.3 `.acc` file — accumulator cache

Limit-sets format kept (`"ACC\0"`, JSON header, raw f32 grid), extended:
header gains `backend: "additive" | "opaque"`, `supersample`, `view`,
`styleHash`, `cloudHash`, and for opaque a second plane (depth) after the
color planes. Written atomically (tmp+rename); long runs checkpoint every
N minutes by the same path.

### 4.4 View preset JSON

```json
{ "family": "<describe() string>", "familyHash": "…",
  "view": { "center": [re, im], "height": h },
  "style": "<style id or 'custom'>", "filters": ["irreducible"],
  "viewport": { "width": w, "height": h },
  "capturedAt": "…" }
```

Written by the explorer HUD (Vite dev middleware endpoint, limit-sets
pattern) to `outputs/presets/<name>.json`; consumed by `scripts/render.ts`.

---

## 5. Algorithms pinned down

### 5.1 Closed-form solvers (deg 2–3)
Quadratic formula with the numerically-stable citardauq branch; Cardano with
depressed-cubic shift, sign-safe cbrt, discriminant-based branch (mirrors
the January shaders, which are the tested reference).

### 5.2 Aberth–Ehrlich (general degree)
- Seeds: warm start from the previous polynomial in shard order when
  available (adjacent lattice points ⇒ nearby roots), else Cauchy-bound
  circle with irrational phase offset.
- Iteration: simultaneous Aberth corrections, Gauss–Seidel updates, max 60
  sweeps, convergence when max displacement² < `TOL.converge²`.
- Post: one Newton polish sweep; residual `|f(z)| / (‖f‖·(1+|z|)^d)` above
  `TOL.suspect` ⇒ status = suspect; `|im|` snap to real axis (§3.2).
- Clustered roots: **v1 policy = flag, don't fix** (status byte + run-end
  count in metadata). Rigor upgrades are future work (design.md §12.5).

### 5.3 Invariant compute plan
`registry.resolve(needs)` topologically sorts declared dependencies
(`galois` → `disc`) and returns an ordered list of `fill` calls; duplicates
computed once per batch.

### 5.4 Accumulator layouts and deposit rules

Additive: `Float32Array` W·H·4 (premultiplied R,G,B energy + weight).
Deposit: `px += coverage·r, …, weight += coverage`.
Develop: `total = weight`; percentile-clip → log1p → gamma → lerp
background→(RGB/weight).

Opaque: `Float32Array` W·H·3 (color) + `Float32Array` W·H (depth = radius,
init +∞). Deposit (interior pixels): `if (radiusPx < depth[i]) { color = rgb;
depth = radiusPx }`. Rim pixels with coverage < 1: same rule (supersampling
makes the error sub-output-pixel). Develop: background where depth = ∞, else
color; then downsample.

Grids are allocated at `supersample × output` resolution; SS ∈ {1, 2, 4}
(⚠ default 2 live... actually live uses the hardware framebuffer; SS
default 2 offline, 4 for final prints).

### 5.5 Disk rasterizer
One implementation in `raster/disk.ts`: bounding square → per-pixel
center-distance test with exact rim coverage via the standard circle–pixel
area approximation (smoothstep on signed distance, 1-px transition band).
Callback per covered pixel `(index, coverage)`; backends supply the write.
Radius below 0.5 supersampled px degrades to a single weighted deposit
(additive) / a probabilistic-free min-test on one pixel (opaque).

---

## 6. Work distribution

### 6.1 Sharding
A `Shard` is a contiguous slice of a height shell: `{ shell, lo, hi }` in
the deterministic shell enumeration order. Shards are sized to ~1–4 s of
work (adaptive: the driver times the first shards and rescales). Height
shells go out in order, so live streaming is arithmetically progressive and
an interrupted offline run has a meaningful prefix.

### 6.2 Worker protocol (`engine/workers/protocol.ts`)

```
main → worker  INIT   { familySpec, solverCfg, invariantNames, filterSpec,
                        styleSpec | null, view, mode, ssFactor, gridDims? }
main → worker  SHARD  { shard }
worker → main  BATCH  (mode: live | cloud)  transferable buffers:
                      live:  { xy: Float32Array(2n), radiusPx: Float32Array(n),
                               rgb: Uint8Array(3n), count }
                      cloud: one .cloud chunk (raw ArrayBuffer) — main thread appends to file
worker → main  DONE   { shard, stats: { polys, roots, suspect, ms } }
worker → main  ACC    (mode: accumulate, at teardown) transferable grid buffer(s)
```

- Family/filter/style specs cross the boundary as *data* (constructor name +
  args, or DSL string), never closures. Custom inline functions require
  registration under an id in a user module both sides import — the one
  place "arbitrary functions" meets a real constraint. ⚠
- Mode `accumulate`: each worker owns a full private grid (images that fit
  RAM×workers) **or** a tile set (§7); merged at end via `raster/merge.ts`.

### 6.3 Execution paths

```
LIVE      workers: pipeline → styled BATCH → main: append to GPU instance
          buffer → draw. Style change: if cloud cached in RAM → restyle in
          main-thread idle slices; else re-shard.
OFFLINE A workers: pipeline → cloud chunks → main: write .cloud
(cloud)   then: stream .cloud → style → deposit (workers by chunk range,
          private grids) → merge → tone → png
OFFLINE B workers: pipeline → deposit into private grid/tiles → merge →
(stream)  tone → png            (chosen when no restyle iteration expected,
                                 or scale makes the cloud impractical)
```

### 6.4 Determinism
Fixed shell order, fixed intra-shard order, warm-start chain restarted per
shard ⇒ identical roots regardless of worker count; both v1 merges are
commutative ⇒ identical images. Reproducibility is a stated invariant,
tested (§9).

---

## 7. Tiling (beyond-RAM prints)

Trigger: `ssW·ssH·bytesPerCell > budget`. Scheme (⚠ chosen for simplicity
over cleverness, revisit if profiling disagrees):

1. Run OFFLINE A to produce the styled cloud (or take a cached one), but
   emit *styled splats* `(x, y, radiusPx, rgb)` partitioned by the tile(s)
   each disk's bounding box touches — an external bucket sort into
   `outputs/cache/tiles/<key>/<tx>-<ty>.splat`.
2. Render tiles independently (workers ⇒ one tile each): allocate one tile
   grid, replay its splat file, tone-map with **global** tone parameters,
   write a PNG strip.
3. Assemble strips → final PNG (or hand strips to an external stitcher for
   truly absurd sizes).

Global tone needs the whole image's statistics: pass 2 first computes each
tile's histogram, pass 2.5 merges histograms → clip value, then tiles
develop. (Histogram merge is exact — another commutative reduce.)

---

## 8. Frontends

### 8.1 Offline driver (`scripts/render.ts`)
Owns: argv/config parsing, preset loading, cache-key computation and
short-circuiting, worker pool, progress (limit-sets `createProgress`:
count/rate/ETA, TTY-aware), checkpoints, tone, PNG, and a `--report` line
(polys, roots, suspect count, timings) appended to the artifact's meta.
A print script supplies only: family, filters, style, view (or preset name),
size, backend. Target: a print script is ≤ 20 lines and reads like the
specification sentence.

### 8.2 Live explorer (`src/live/`)
- WebGL2, instanced quads → SDF-round disks; per-instance `(x, y, radiusPx,
  rgb)` streamed straight from worker BATCH transfers into a chunked,
  append-only GPU buffer pool (64k instances per chunk).
- Opaque mode: depth test on, `gl_Position.z ∝ radius`. Additive mode:
  depth off, additive blending, log-tone in a post pass (small float FBO).
- Camera: pan/zoom-to-cursor on ℂ (port of January `camera.ts`, the one
  proven piece). View change re-shards visible work; already-streamed roots
  re-project in the vertex shader for free (positions are world-space).
- HUD: family description (`describe()`), style picker, root/suspect
  counters, preset-capture button.
- Instant restyle: retained styled-cloud columns in main-thread RAM while
  under budget (default 1.5 GB ⚠); restyle = rewrite rgb/radius arrays +
  re-upload, no worker round-trip.

### 8.3 March mode (`src/march/`)
- `incidence.ts`: for an affine family, compute per-pixel march data — the
  intersection of `{f : f(z) = 0}` with the family's affine subspace,
  in the **cofactor basis** (the basis in which the march parameters are
  the cofactor coefficients, preserving cheap irreducibility checks —
  see design.md §9). Emits: slicing loop count and bounds, base/direction
  expressions for the GLSL template, or selects a hand-written shader.
- `glsl/`: the shaders.tex quadratic/cubic/quartic shaders as the v1
  hand-written set; template generation is the open path (design.md §12.3).
- `harness.ts`: fullscreen-quad renderer, uniforms (view, radii, A_MAX …),
  shares `live/` camera math but not its renderer.

---

## 9. Testing strategy

- **Solver correctness**: golden root sets for known factorizations
  (cyclotomics, products of linear factors, Wilkinson-style stress cases);
  Aberth vs closed-form agreement on deg 2–3; warm-start vs cold-start
  agreement; residual bounds on random integer polynomials.
- **Invariants**: unit tests against hand-computed examples (disc, Galois
  classes for named cubics/quartics, Mahler for known Pisot/Salem polys).
- **Pipeline determinism**: same spec, 1 vs 8 workers ⇒ bit-identical
  `.cloud` root columns and bit-identical accumulator grids.
- **Raster**: golden small images (64×64) per backend, per SS factor;
  merge/tiling equivalence — tiled render ≡ untiled render, pixel-exact.
- **Formats**: round-trip tests for `.cloud`/`.acc`; version-bump fixtures.
- **March**: scalar TS re-implementation of the march per pixel, compared
  against shader output on a small grid (the TS version is also the
  documentation of the algorithm).
- vitest; golden files under `test/golden/`.

---

## 10. Decisions made in this document needing review (⚠ index)

1. Descending coefficient order (§3.1).
2. Batch size 65_536 polys / ~8 MB target (§4.1).
3. `.cloud` omits coefficients; mixed column dtypes (§4.2).
4. Supersample defaults (2 offline, 4 prints) (§5.4).
5. Style/filter specs cross worker boundary as data; custom functions must
   be registered under an id (§6.2). This is the only real constraint the
   worker model puts on "arbitrary style functions."
6. Tiling via external splat bucketing rather than re-enumeration per tile
   (§7).
7. Live retained-cloud RAM budget 1.5 GB (§8.2).
```
