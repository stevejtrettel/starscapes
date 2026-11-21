import { describe, expect, it } from "vitest";
import { cubicCrossings } from "../src/catalogue/cubics.ts";
import { closeTail } from "../src/fibre/tail.ts";
import { createCrossings, findCrossings, sweep, tailScan } from "../src/fibre/tailScan.ts";
import { contains, type Window } from "../src/fibre/window.ts";
import { evalJet } from "../src/poly/poly.ts";
import { solve } from "../src/roots/solve.ts";
import { lcg } from "./support.ts";

describe("tail coordinates", () => {
  const rand = lcg(21);
  const jet = new Float64Array(4);
  const randomHead = (d: number): number[] => [0, 0, ...Array.from({ length: d - 1 }, () => rand() * 4 - 2)];

  it("closeTail makes z a root", () => {
    for (let trial = 0; trial < 500; trial++) {
      const f = randomHead(2 + (trial % 6));
      const [s, y] = [rand() * 3 - 1.5, 0.1 + rand()];
      closeTail(f, s, y);
      evalJet(f, s, y, jet);
      expect(Math.hypot(jet[0], jet[1])).toBeLessThan(1e-9);
    }
  });

  it("root density: |det DΨ_h(z)| = |f′(z)|²/y", () => {
    const h = 1e-6;
    for (let trial = 0; trial < 300; trial++) {
      const f = randomHead(2 + (trial % 6));
      const [s, y] = [rand() * 2 - 1, 0.2 + rand()];
      const tailAt = (u: number, v: number): [number, number] => {
        closeTail(f, u, v);
        return [f[1], f[0]];
      };
      const ds = [tailAt(s + h, y), tailAt(s - h, y)];
      const dy = [tailAt(s, y + h), tailAt(s, y - h)];
      const det =
        ((ds[0][0] - ds[1][0]) * (dy[0][1] - dy[1][1]) - (ds[0][1] - ds[1][1]) * (dy[0][0] - dy[1][0])) / (4 * h * h);
      closeTail(f, s, y);
      evalJet(f, s, y, jet);
      const expected = (jet[2] ** 2 + jet[3] ** 2) / y;
      expect(Math.abs(Math.abs(det) - expected)).toBeLessThan(1e-5 * (1 + expected));
    }
  });
});

describe("tail scan", () => {
  it("T(p, W) ∩ ℤ ≡ brute force (degrees 2–6)", () => {
    const rand = lcg(22);
    let members = 0;
    let extras = 0;
    for (let trial = 0; trial < 1500; trial++) {
      const d = 2 + (trial % 5);
      const p = [0, ...Array.from({ length: d }, () => Math.floor(rand() * 9) - 4)];
      if (p[d] === 0) p[d] = 1;
      const s0 = rand() * 2 - 1.2;
      const y0 = trial % 7 === 0 ? 0 : 0.1 + rand() * 1.2; // some windows sit on the real axis
      const W: Window = { s0, s1: s0 + 0.05 + rand() * 0.8, y0, y1: y0 + 0.05 + rand() * 0.8 };

      const got: number[] = [];
      tailScan(p, W, (t) => got.push(t));

      const want: number[] = [];
      const re = new Float64Array(d);
      const im = new Float64Array(d);
      const f = p.slice();
      // T(p, W) ⊂ [−M, M] with M = max |p| on W ≤ Σ |p_k|·Rᵏ.
      const R = Math.hypot(Math.max(Math.abs(W.s0), Math.abs(W.s1)), W.y1);
      const M = Math.ceil(p.reduce((acc, c, k) => acc + Math.abs(c) * R ** k, 0));
      for (let t = -M; t <= M; t++) {
        f[0] = t;
        solve(f, re, im);
        if (Array.from(re).some((s, i) => im[i] > 1e-7 && contains(W, s, im[i]))) want.push(t);
      }
      // Complete: no member is lost. The only non-members emitted are
      // integers whose root sits on ∂W to rounding (e.g. a double real root
      // when the window's lower edge is the real axis).
      const missing = want.filter((t) => !got.includes(t));
      expect(missing, `p = [${p}], W = ${JSON.stringify(W)}`).toEqual([]);
      members += want.length;
      extras += got.length - want.length;
    }
    expect(members).toBeGreaterThan(3000);
    expect(extras).toBeLessThan(members / 500);
  });

  it("emits in increasing order without repeats", () => {
    const got: number[] = [];
    tailScan([0, 3, -2, 0, 1, 1], { s0: -1, s1: 1, y0: 0.2, y1: 2 }, (t) => got.push(t));
    expect(got.length).toBeGreaterThan(0);
    for (let i = 1; i < got.length; i++) expect(got[i]).toBeGreaterThan(got[i - 1]);
  });
});

describe("closed-form cubic crossings", () => {
  it("≡ the general crossings: same parameters, same directions", () => {
    const rand = lcg(23);
    const general = createCrossings(16);
    const closed = createCrossings(16);
    let total = 0;
    for (let trial = 0; trial < 3000; trial++) {
      const a = 1 + Math.floor(rand() * 4);
      const b = Math.floor(rand() * 21) - 10;
      const c = Math.floor(rand() * 41) - 20;
      const s0 = rand() * 3 - 2;
      const y0 = 0.05 + rand();
      const W: Window = { s0, s1: s0 + 0.1 + rand(), y0, y1: y0 + 0.1 + rand() };
      findCrossings([0, c, b, a], W, general);
      cubicCrossings(a, b, c, W, closed);
      const collectTs = (cs: typeof general): number[] => {
        const out: number[] = [];
        sweep(cs, (t) => out.push(t)); // also sorts cs
        return out;
      };
      expect(collectTs(closed)).toEqual(collectTs(general));
      expect(closed.count).toBe(general.count);
      for (let i = 0; i < closed.count; i++) {
        expect(closed.t[i]).toBeCloseTo(general.t[i], 7);
        expect(closed.sign[i]).toBe(general.sign[i]);
      }
      total += closed.count;
    }
    expect(total).toBeGreaterThan(1000);
  });
});
