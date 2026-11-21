# starscapes

Pictures of the complex roots of integer polynomials: each root a disc
whose size is an arithmetic invariant of its polynomial. A live explorer
and an offline renderer, both built on exact enumeration — given a window
of the upper half plane, the code lists precisely the polynomials of a
family whose roots are visible in it.

After Harriss, Stange, Trettel, *Algebraic Number Starscapes*
([arXiv:2008.07655](https://arxiv.org/abs/2008.07655)).

## Run

```bash
npm install
npm run dev                                   # the explorer: drag to pan, scroll to zoom
npm test                                      # typecheck + tests
node scripts/prints/print.ts quadratics       # → outputs/quadratics.png
node scripts/prints/print.ts cubics width=3600 centre=0.3,0.8 span=0.2
node scripts/prints/print.ts box degree=5 H=4
```

No build step: Vite serves the TypeScript, and Node (≥ 22.18) runs the
scripts directly. `scripts/prints/print.ts` documents its options; the
named pictures are in `src/presets.ts`.

## The idea in four lines

A *star* is a pair (f, z), f ∈ ℤ[x], f(z) = 0, Im z > 0. Writing
f = x²h(x) + a₁x + a₀, the root z and the head h determine the tail
(a₁, a₀); so the stars with head h are the preimage of ℤ² under an
explicit map, with density |f′(z)|²/y. The invariant
δ = |f′(z)|·y^(−(d−2)/2) is the local form of the discriminant; sizes are
r = c·y^β·δ^(−κ), and a picture shows every star above a given size.

[docs/mathematics.md](docs/mathematics.md) develops this, with proofs, and
says which test checks which statement.

## Layout

| path | what it is |
|---|---|
| `src/fibre/` | Tail coordinates on {f(z) = 0}; the tail scan and pencil scan (which constant terms put a root in a window). |
| `src/catalogue/` | Stars, δ-shells, and the enumerators: quadratics, cubics (all or monic), coefficient boxes of any degree, planar families. |
| `src/style/sizeLaw.ts` | The size laws r = c·y^β·δ^(−κ): visibility, ink, zoom exponent. |
| `src/starscape.ts`, `src/presets.ts` | A family plus a size law, as plain data; the named pictures. |
| `src/render/` | Raster (order-independent, area-true), the picture pipeline, PNG output. |
| `src/live/` | The explorer: worker streaming stars largest-first, WebGL2 discs. |
| `src/poly/`, `src/roots/` | Polynomial arithmetic, exact discriminants, solvers. |
| `docs/mathematics.md` | Definitions, propositions, proofs. Start here. |
| `docs/literature.md` | Annotated sources, and what each is used for. |
| `docs/audit.md` | What changed from the first version and why; errors found. |
| `docs/history/` | The first version's design notes and lab notebook. |
| `shaders.tex` | The ray-marching write-up (a different way to draw the same sets). |
