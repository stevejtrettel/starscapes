/**
 * Screen-cell geometry for local density quotas (pure, DOM-free).
 * (Resurrected from the tiled-ink-budget experiment, E7 — the geometry was
 * correct; only the accounting it served was wrong. See docs/experiments.md.)
 * RETIRED FROM THE ENGINE with the quota experiments (E10–E12): lives here
 * because only these experiment scripts (and its tests) consume it.
 *
 * The viewport plus a pad ring is covered by uniform world-space cells of
 * `tilePx`-pixel screens. Cells are uniform — the grid overhangs the
 * viewport edge rather than producing sliver cells, so every cell carries
 * the same pixel area.
 *
 * OWNERSHIP IS HALF-OPEN: a root belongs to cell t iff
 *   re ∈ [t.left, t.right)  and  im ∈ (t.bottom, t.top].
 * Roots have rational coordinates, so exact landings on shared edges are
 * possible; half-openness gives every root exactly one owner (partition
 * equivalence is tested against the untiled cone).
 */

export interface Tile {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface TileGrid {
  readonly tiles: Tile[];
  /** On-screen pixel area of every cell (uniform). */
  readonly tilePxArea: number;
  /** Grid geometry for index arithmetic (cell ti = j·nx + i). */
  readonly nx: number;
  readonly ny: number;
  readonly left0: number;
  readonly top0: number;
  readonly tileWorld: number;
}

export function tileGrid(
  view: { centerRe: number; centerIm: number; height: number },
  viewportW: number,
  viewportH: number,
  tilePx: number,
  padWorld: number,
): TileGrid {
  const worldPerPx = view.height / viewportH;
  const tileWorld = tilePx * worldPerPx;
  const ring = Math.ceil(padWorld / tileWorld);

  const worldW = viewportW * worldPerPx;
  const viewLeft = view.centerRe - worldW / 2;
  const viewTop = view.centerIm + view.height / 2;

  const nx = Math.ceil(viewportW / tilePx) + 2 * ring;
  const ny = Math.ceil(viewportH / tilePx) + 2 * ring;
  const left0 = viewLeft - ring * tileWorld;
  const top0 = viewTop + ring * tileWorld;

  // Shared edges are computed ONCE (xs[i], ys[j]) so adjacent cells agree
  // exactly: (left0 + i·w) + w ≠ left0 + (i+1)·w in floating point, and that
  // hairline disagreement would create ownership gaps/overlaps on seams.
  const xs: number[] = [];
  for (let i = 0; i <= nx; i++) xs.push(left0 + i * tileWorld);
  const ys: number[] = [];
  for (let j = 0; j <= ny; j++) ys.push(top0 - j * tileWorld);

  const tiles: Tile[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      tiles.push({ left: xs[i], right: xs[i + 1], top: ys[j], bottom: ys[j + 1] });
    }
  }
  return { tiles, tilePxArea: tilePx * tilePx, nx, ny, left0, top0, tileWorld };
}

/** Half-open ownership test (see file comment). */
export function ownsRoot(t: Tile, re: number, im: number): boolean {
  return re >= t.left && re < t.right && im > t.bottom && im <= t.top;
}
