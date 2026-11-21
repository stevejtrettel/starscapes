import { describe, expect, it } from "vitest";
import { ball, box } from "../src/catalogue/box.ts";
import type { Window } from "../src/fibre/window.ts";
import { ballVolume, pointsInEllipsoid } from "../src/lattice/enumerate.ts";
import { lll } from "../src/lattice/lll.ts";
import { polynomialsNear } from "../src/lattice/nearRoot.ts";
import { solve } from "../src/roots/solve.ts";
import { collect, lcg, starKey } from "./support.ts";

const dot = (u: bigint[], v: bigint[]): bigint => u.reduce((s, x, i) => s + x * v[i], 0n);
/** det of the Gram matrix, by fraction-free elimination. */
function gramDet(basis: bigint[][]): bigint {
  const n = basis.length;
  const M = basis.map((u) => basis.map((v) => dot(u, v)));
  let prev = 1n;
  for (let k = 0; k < n - 1; k++) {
    for (let i = k + 1; i < n; i++) for (let j = k + 1; j < n; j++) M[i][j] = (M[i][j] * M[k][k] - M[i][k] * M[k][j]) / prev;
    prev = M[k][k];
  }
  return M[n - 1][n - 1];
}

describe("LLL", () => {
  it("returns a reduced basis of the same lattice", () => {
    const rand = lcg(51);
    for (let trial = 0; trial < 200; trial++) {
      const n = 2 + (trial % 6);
      const m = n + (trial % 3);
      const basis = Array.from({ length: n }, (_, i) =>
        Array.from({ length: m }, (_, j) => BigInt(Math.floor(rand() * 2001) - 1000) + (i === j ? 5000n : 0n)),
      );
      const reduced = lll(basis);
      // Same lattice: equal covolume, and (by construction) contained in it.
      expect(gramDet(reduced)).toBe(gramDet(basis));
      // Reduced: size-reduced and Lovász, checked in floating point on Gram–Schmidt.
      const star: number[][] = [];
      const norm2: number[] = [];
      for (let i = 0; i < n; i++) {
        const v = reduced[i].map(Number);
        for (let j = 0; j < i; j++) {
          const mu = v.reduce((s, x, k) => s + x * star[j][k], 0) / norm2[j];
          expect(Math.abs(reduced[i].map(Number).reduce((s, x, k) => s + x * star[j][k], 0) / norm2[j])).toBeLessThanOrEqual(0.5 + 1e-9);
          for (let k = 0; k < m; k++) v[k] -= mu * star[j][k];
        }
        star.push(v);
        norm2.push(v.reduce((s, x) => s + x * x, 0));
        if (i > 0) {
          const mu = reduced[i].map(Number).reduce((s, x, k) => s + x * star[i - 1][k], 0) / norm2[i - 1];
          expect(norm2[i]).toBeGreaterThanOrEqual((0.75 - mu * mu) * norm2[i - 1] * (1 - 1e-9));
        }
      }
    }
  });

  it("finds the short vector of a lattice built to have one", () => {
    // (1, 0, N), (0, 1, N·√2 rounded): a short vector reveals a² − 2b² small.
    const N = 10n ** 12n;
    const reduced = lll([[1n, 0n, N], [0n, 1n, 1414213562373n]]);
    const shortest = reduced[0].map((x) => (x < 0n ? -x : x));
    expect(shortest[0] < 2_000_000n && shortest[1] < 2_000_000n).toBe(true);
  });
});

describe("Fincke–Pohst", () => {
  it("lists exactly the integer points of an ellipsoid", () => {
    const rand = lcg(52);
    for (let trial = 0; trial < 150; trial++) {
      const n = 2 + (trial % 3);
      // G = AᵀA + I for a random A: positive definite.
      const A = Array.from({ length: n }, () => Array.from({ length: n }, () => rand() * 2 - 1));
      const G = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => A.reduce((s, row) => s + row[i] * row[j], 0) + (i === j ? 0.3 : 0)),
      );
      const C = 4 + rand() * 20;
      const got = new Set<string>();
      pointsInEllipsoid(G, C, (x) => got.add(Array.from(x).join()));
      const want = new Set<string>();
      const B = 12;
      const x = new Array<number>(n).fill(-B);
      for (;;) {
        let q = 0;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) q += x[i] * G[i][j] * x[j];
        if (q <= C) want.add(x.map((v) => v + 0).join());
        let k = 0;
        while (k < n && x[k] === B) x[k++] = -B;
        if (k === n) break;
        x[k]++;
      }
      expect(got).toEqual(want);
    }
  });

  it("ballVolume", () => {
    expect(ballVolume(2)).toBeCloseTo(Math.PI, 12);
    expect(ballVolume(3)).toBeCloseTo((4 * Math.PI) / 3, 12);
    expect(ballVolume(4)).toBeCloseTo(Math.PI ** 2 / 2, 12);
  });
});

describe("polynomials with a root near a point", () => {
  it("every polynomial in the ball with a root in the disc is found (degrees 3–5)", () => {
    const rand = lcg(53);
    let found = 0;
    for (let trial = 0; trial < 120; trial++) {
      const d = 3 + (trial % 3);
      const B = d === 3 ? 9 : d === 4 ? 5 : 3; // brute-force box
      const R = B; // the ball of radius B lies inside the box
      const [s, y] = [rand() * 2.4 - 1.2, 0.25 + rand() * 1.2];
      const rho = 0.002 + rand() * 0.02;

      const got = new Set<string>();
      polynomialsNear(d, R, s, y, rho).run((f) => {
        const sign = f[d] < 0 || (f[d] === 0 && f.findLast((c) => c !== 0)! < 0) ? -1 : 1;
        got.add(Array.from(f, (c) => sign * c + 0).join());
      });

      const f = new Array<number>(d + 1).fill(-B);
      const re = new Float64Array(d);
      const im = new Float64Array(d);
      for (;;) {
        const norm2 = f.reduce((acc, c) => acc + c * c, 0);
        if (f[d] > 0 && norm2 <= R * R) {
          solve(f, re, im);
          if (Array.from(re).some((r, i) => Math.hypot(r - s, im[i] - y) <= rho)) {
            expect(got.has(f.join()), `${f} near ${s} + ${y}i, ρ = ${rho}`).toBe(true);
            found++;
          }
        }
        let k = 0;
        while (k <= d && f[k] === B) f[k++] = -B;
        if (k > d) break;
        f[k]++;
      }
    }
    expect(found).toBeGreaterThan(50);
  });
});

describe("box catalogue: lattice ≡ heads", () => {
  const cases: Array<[number, number, boolean, Window]> = [
    [4, 12, false, { s0: 0.301, s1: 0.309, y0: 0.702, y1: 0.71 }],
    [4, 30, true, { s0: -0.52, s1: -0.5, y0: 1.1, y1: 1.12 }],
    [5, 7, false, { s0: 0.6, s1: 0.606, y0: 0.4, y1: 0.406 }],
    [6, 4, false, { s0: -0.2, s1: -0.19, y0: 0.9, y1: 0.91 }],
    [5, 6, false, { s0: 1.3, s1: 1.31, y0: 0.5, y1: 0.51 }], // |z| > 1
  ];
  for (const [d, H, monic, W] of cases) {
    it(`degree ${d}, height ${H}${monic ? ", monic" : ""}`, () => {
      const viaHeads = collect((v) => box(d, H, { monic, method: "heads" })(W, v)).sort();
      const viaLattice = collect((v) => box(d, H, { monic, method: "lattice" })(W, v)).sort();
      expect(viaLattice).toEqual(viaHeads);
      expect(collect((v) => box(d, H, { monic })(W, v)).sort()).toEqual(viaHeads);
      expect(viaHeads.length).toBeGreaterThan(3);
    });
  }
});

describe("ball catalogue", () => {
  it("lattice ≡ heads, and the ball is the box cut by the norm", () => {
    const W: Window = { s0: 0.42, s1: 0.43, y0: 0.61, y1: 0.62 };
    for (const [d, R] of [[4, 14.5], [5, 9], [6, 5.2]] as const) {
      const viaHeads = collect((v) => ball(d, R, { method: "heads" })(W, v)).sort();
      const viaLattice = collect((v) => ball(d, R, { method: "lattice" })(W, v)).sort();
      expect(viaLattice).toEqual(viaHeads);
      const cut: string[] = [];
      box(d, Math.floor(R), { method: "heads" })(W, (star) => {
        if (star.f.reduce((sum, c) => sum + c * c, 0) <= R * R) cut.push(starKey(star));
      });
      expect(cut.sort()).toEqual(viaHeads);
      expect(viaHeads.length).toBeGreaterThan(3);
    }
  });

  it("refuses a window that neither method could finish", () => {
    const wide: Window = { s0: -1, s1: 1, y0: 0.1, y1: 2 };
    expect(() => ball(9, 30)(wide, () => {})).toThrow(/zoom in/);
  });
});
