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
npm run dev                                # the live explorer (drag to pan, scroll to zoom)
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
| `src/core/` | Pure math, imports nothing: solvers, families, search, invariants, styles. |
| `src/render/`, `src/offline/`, `src/pipeline/` | The offline rasterizer and print pipeline. |
| `src/live/` | The explorer: camera, GL disks, render worker. |
| `scripts/prints/` | One script per picture; `scripts/experiments/` mirrors the notebook. |

## State (2026-07-04)

Quadratics end to end: tested core (closed-form solvers, exact
discriminants), offline prints in seconds, live explorer with smooth
constant-ink zoom to arbitrary depth. Next up, in `docs/design.md`'s
build-order: the explorer's save-recipe button, cubics in the live view
(each family gets its own small derivations — see live-sampling.md §5),
and the march/shader mode.
