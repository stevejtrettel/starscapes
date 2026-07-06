# starscapes

Pictures of the roots of families of integer polynomials in the complex
plane — a live explorer for finding them, an offline renderer for printing
them at gallery scale, and (planned) a raymarched shader view of the same
mathematics.

Built as a clean-slate rewrite, designed conversation-first: the design
records in `docs/` are the authority, and code exists to realize them.

## Run things

```bash
npm install
npm run dev quadratics                     # the live explorer (drag to pan, scroll to zoom)
npm run dev                                # ...or serve everything, pick a demo from the landing page
npx vitest run                             # the test suite
node scripts/prints/first-light.ts         # the classic quadratic starscape → outputs/
node scripts/prints/geodesic-deep.ts       # a deep 3600px print of a geodesic window
node scripts/experiments/<any>.ts          # reproduce a lab-notebook experiment
```

No build step anywhere: Vite serves the explorer's TypeScript directly, and
Node runs the scripts natively. Everything generated lands in `outputs/`
(gitignored — every artifact is regenerable from its script).

## Where things are

| Path | What |
|---|---|
| `docs/design.md` | The design record: what the system is, its settled contracts, build-order status. Start here. |
| `docs/live-sampling.md` | The sampling method behind the explorer (view-cone enumeration, depth law, constant-ink zoom) with derivations and the generalization path to higher degrees. |
| `docs/experiments.md` | The lab notebook, E1–E12: every experiment with its prediction, result, and verdict — including the instructive failures. |
| `docs/conventions.md` | The code charter and research-process rules. |
| `shaders.tex` | The raymarching write-up behind the (future) shader mode. |
| `src/core/` | Pure math, imports nothing: solvers, families, collections, invariants, laws, the row cursors and draw pass. |
| `src/render/`, `src/offline/`, `src/pipeline/` | The offline rasterizer, the pure `render()`, and the `print()` harness. |
| `src/live/` | The explorer parts: camera, GL disks, render loop/service, pan-zoom, HUD, `explore`. |
| `scripts/prints/` | One sentence per picture; `scripts/experiments/` mirrors the notebook. |
| `demos/` | Live sentences: `quadratics`, `monic-cubics` (via `explore`), `law-browser` (parts composed by hand, γ/δ/c sliders). |

## State (2026-07-06)

Quadratics and monic cubics end to end, now through the **collection
model** (design.md Level 3): a picture is a demo or print script containing
one `Picture` — a collection whose cutoffs are computed from named depth
laws, plus one per-polynomial `draw` sentence with laws and colorings as
values. The refactor that landed it was gated bit-identical
(`scripts/experiments/render-diff.ts`: 7 reference renders, 0 differing
pixels) and deleted the search↔styling coupling machinery
(`ViewContext.sizing`, `requirePower`, `deriveFrom`, the strategy types).
Next up, in `docs/design.md`'s build-order: the explorer's save handshake
(camera → print script), and the march/shader mode.
