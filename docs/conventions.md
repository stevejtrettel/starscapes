# Code Conventions

*The charter agreed before phase 1. Every chunk is written under these rules;
amend the document when we amend the rules.*

## Two dialects, one system
- **Kernel layer** (hot paths): flat typed arrays + offsets, out-parameters,
  `void` returns, zero allocation inside loops. Boring, uniform, fast.
  A polynomial is a slice `(coeffs, off, len)`; a root is an index into
  parallel arrays.
- **Upper layer** (families, styles, print scripts): reads like the
  mathematics. Math-mimicry is this layer's contract; the kernels' virtue is
  uniformity.
- **Every flat structure ships with a reader view** — a lightweight object
  wrapper (`polyAt`, `rootsAt`, …) for tests, debugging, and any code that
  isn't a hot loop. Storage truth is flat; reading truth is the view; views
  are trivial derivations so they cannot drift.

## Representation
- **Coefficients ascending**: `coeffs[k]` = aₖ (coefficient of xᵏ), so
  literature formulas transcribe verbatim. **Display descending** via
  `format()`, as written on paper.
- **RootSlots**: d slots per degree-d polynomial at base `i·d` (fixed stride
  — arithmetic addressing, safe parallel writes). Distinct roots fill the
  first `count[i]` slots, each with a multiplicity; **multiplicities always
  sum to d**. A double root is one point that knows it's double, not a point
  listed twice.
- **Deterministic order everywhere**: real roots ascending, then conjugate
  pairs (upper-half-plane member first) ascending by real part. No kernel
  has ordering freedom — bit-identical reproducibility is a promise.

## Numerical honesty
- Integer inputs make discriminant signs and multiplicity structure *exact*
  while intermediates stay below 2⁵³; solvers state their exact-safe range
  in their doc comment. (Debt, scheduled with Aberth: assert the range and
  route beyond it to bigint escalation.)
- **No negative zero leaves a solver** (`+ 0` normalization).
- **One named tolerance table per layer** (`TOL`); no magic numbers in
  kernels.

## Testing
- Property tests over golden tests where possible; seeded LCG randomness so
  failures reproduce; residual bounds scaled relatively (‖f‖·(1+|z|)^d).
- Assert what mathematics guarantees (Vieta, multiplicity sums), not
  hand-computed values.

## Modules
- One concept per file. `src/core/` imports nothing (no Node, no DOM — must
  run anywhere). Every file opens with a doc comment stating its
  mathematical contract. Inline comments state only constraints the code
  cannot show.
- Abstractions arrive with their second consumer, not before (no unified
  Solver interface, status flags, or bigint tier until their consumers
  exist).
