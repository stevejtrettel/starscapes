import { describe, expect, it } from "vitest";
import { quartics } from "../src/catalogue/quartics.ts";
import type { Window } from "../src/fibre/window.ts";
import { cycleTypes, factorDegrees } from "../src/poly/frobenius.ts";
import { GALOIS_GROUPS, type GaloisGroup, galoisGroup, isSquare } from "../src/poly/galois.ts";
import { isIrreducible } from "../src/poly/rationalRoot.ts";
import { solve } from "../src/roots/solve.ts";
import { starscape } from "../src/starscape.ts";
import { hyperbolic } from "../src/style/sizeLaw.ts";
import { collect } from "./support.ts";

/**
 * The oracle: in degrees ≤ 5 the set of cycle types of a transitive group
 * determines it, and by Chebotarev the Frobenius types over enough primes
 * show them all. (The identity type is left out: it is in every group, and
 * at density 1/120 the sample can miss it.)
 */
const BY_CYCLE_TYPES: Record<string, GaloisGroup> = {
  "3": "C3",
  "1,2|3": "S3",
  "2,2|4": "C4",
  "2,2": "V4",
  "1,1,2|2,2|4": "D4",
  "1,3|2,2": "A4",
  "1,1,2|1,3|2,2|4": "S4",
  "5": "C5",
  "1,2,2|5": "D5",
  "1,2,2|1,4|5": "F20",
  "1,1,3|1,2,2|5": "A5",
  "1,1,1,2|1,1,3|1,2,2|1,4|2,3|5": "S5",
};
function oracle(f: number[]): GaloisGroup | undefined {
  const d = f.length - 1;
  const identity = new Array(d).fill(1).join(",");
  const types = [...cycleTypes(f, d === 5 ? 4000 : 2500)].filter((t) => t !== identity).sort();
  return BY_CYCLE_TYPES[types.join("|")];
}

/** Coefficients descending, as written. */
const poly = (...desc: number[]): number[] => desc.reverse();

describe("factorisation patterns mod p", () => {
  it("Dedekind: x² + 1 splits mod p ≡ 1 (4) and is irreducible mod p ≡ 3 (4)", () => {
    expect(factorDegrees([1, 0, 1], 5)).toEqual([1, 1]);
    expect(factorDegrees([1, 0, 1], 7)).toEqual([2]);
    expect(factorDegrees([1, 0, 1], 2)).toBeNull(); // 2 | disc
    expect(factorDegrees([1, 0, 0, 2], 2)).toBeNull(); // 2 divides the leading coefficient
    expect(factorDegrees(poly(1, 0, 0, 0, -1, -1), 3)).toEqual([5]); // x⁵ − x − 1 is irreducible mod 3 (Artin–Schreier)
  });

  it("agrees with brute force: the number of roots mod p, and the degree", () => {
    for (const f of [poly(1, 0, 0, 0, -1, -1), poly(2, 3, 0, -1, 5), poly(1, 1, 1, 1, 1), poly(3, 0, 0, -7)]) {
      for (const p of [3, 5, 7, 11, 13, 17, 19, 23, 29, 31]) {
        const degrees = factorDegrees(f, p);
        if (!degrees) continue;
        let roots = 0;
        for (let x = 0; x < p; x++) {
          let v = 0;
          for (let k = f.length - 1; k >= 0; k--) v = (v * x + f[k]) % p;
          if (v === 0) roots++;
        }
        expect(degrees.filter((k) => k === 1).length, `${f} mod ${p}`).toBe(roots);
        expect(degrees.reduce((a, b) => a + b, 0)).toBe(f.length - 1);
      }
    }
  });
});

describe("Galois groups", () => {
  it("textbook examples of every transitive group of degree 3 to 5", () => {
    const examples: Array<[GaloisGroup, number[]]> = [
      ["C3", poly(1, 0, -3, 1)],
      ["S3", poly(1, 0, 0, -2)],
      ["S4", poly(1, 0, 0, 1, 1)],
      ["A4", poly(1, 0, 0, 8, 12)],
      ["A4", poly(12, 8, 0, 0, 1)], // the reverse: the same field
      ["D4", poly(1, 0, 0, 0, -2)],
      ["D4", poly(2, 0, 0, 0, -1)],
      ["C4", poly(1, 1, 1, 1, 1)], // the fifth cyclotomic polynomial
      ["C4", poly(1, 0, -4, 0, 2)],
      ["V4", poly(1, 0, 0, 0, 1)],
      ["V4", poly(1, 0, -10, 0, 1)], // √2 + √3
      ["S5", poly(1, 0, 0, 0, -1, -1)],
      ["A5", poly(1, 0, 0, 0, 20, 16)],
      ["F20", poly(1, 0, 0, 0, 0, -2)],
      ["F20", poly(3, 0, 0, 0, 0, -2)],
      ["D5", poly(1, 0, 0, 0, -5, 12)],
      ["D5", poly(12, -5, 0, 0, 0, 1)],
      ["C5", poly(1, 1, -4, -3, 3, 1)], // the real subfield of ℚ(ζ₁₁)
    ];
    for (const [group, f] of examples) {
      expect(galoisGroup(f), String(f)).toBe(group);
      expect(oracle(f), String(f)).toBe(group);
    }
  });

  for (const [d, H, leads] of [[3, 4, [1, 2]], [4, 2, [1, 2]], [5, 1, [1, 2, 3]]] as const) {
    it(`agrees with Frobenius statistics on every irreducible polynomial of degree ${d} and height ≤ ${H}`, { timeout: 120_000 }, () => {
      const re = new Float64Array(d);
      const im = new Float64Array(d);
      const seen = new Set<GaloisGroup>();
      let tested = 0;
      for (const lead of leads) {
        const f = new Array<number>(d + 1).fill(-H);
        f[d] = lead;
        for (;;) {
          solve(f, re, im);
          const k = Array.from(im).findIndex((y) => y > 1e-6);
          // Totally real polynomials are left to the oracle to recognise as irreducible.
          const irreducible = k >= 0 ? isIrreducible(f, re[k], im[k]) : oracle(f) !== undefined;
          if (irreducible) {
            const group = galoisGroup(f);
            expect(group, String(f)).toBe(oracle(f));
            if (group) seen.add(group);
            tested++;
          }
          let i = 0;
          while (i < d && f[i] === H) f[i++] = -H;
          if (i === d) break;
          f[i]++;
        }
      }
      expect(tested).toBeGreaterThan(100);
      // The sample is not all generic.
      expect(seen.size).toBeGreaterThan(1);
    });
  }

  it("a star's polynomial has a group containing complex conjugation", () => {
    // Two real roots and one pair: conjugation is a transposition, which C₄, V₄, A₄ lack.
    const W: Window = { s0: -0.5, s1: 0.5, y0: 0.4, y1: 1.5 };
    const groups = new Set<string>();
    quartics({ lo: 0, hi: 7, exponent: 0 }, { tau: 1 })(W, (star) => {
      if (isIrreducible(star.f, star.s, star.y)) groups.add(galoisGroup(star.f) ?? "?");
    });
    expect([...groups].sort()).toEqual(["D4", "S4"]);
  });

  it("isSquare", () => {
    for (let n = 0n; n < 2000n; n++) expect(isSquare(n)).toBe(Number.isInteger(Math.sqrt(Number(n))));
    expect(isSquare(12345678901234567890n ** 2n)).toBe(true);
    expect(isSquare(12345678901234567890n ** 2n + 1n)).toBe(false);
    expect(isSquare(-4n)).toBe(false);
  });
});

describe("starscapes by Galois group", () => {
  const W: Window = { s0: -0.6, s1: 0.6, y0: 0.2, y1: 1.4 };
  const family = { kind: "box", degree: 4, height: 3, monic: false } as const;
  const law = hyperbolic(0.1);

  it("the filtered catalogue is the full one, sieved", () => {
    const all: string[] = [];
    starscape({ family, law }).stars(0)(W, (star) => {
      if (isIrreducible(star.f, star.s, star.y) && ["D4", "V4"].includes(galoisGroup(star.f) ?? "")) {
        all.push(collect((v) => v(star))[0]);
      }
    });
    const filtered = collect((v) => starscape({ family, law, galois: ["D4", "V4"] }).stars(0)(W, v));
    expect(filtered.sort()).toEqual(all.sort());
    expect(filtered.length).toBeGreaterThan(50);
  });

  it("a group of the wrong degree is refused", () => {
    expect(() => starscape({ family, law, galois: ["C5"] })).toThrow(/not a Galois group of degree 4/);
    expect(GALOIS_GROUPS[4]).toContain("D4");
  });
});
