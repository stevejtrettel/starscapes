import { describe, expect, it } from "vitest";
import { integerPolynomials } from "../src/core/family/lattice.ts";
import { box, enumerateBox } from "../src/core/search/forward.ts";
import { polyAt } from "../src/core/views.ts";

function collect(degree: number, bound: number, batchCapacity?: number): string[] {
  const family = integerPolynomials({ degree });
  const seen: string[] = [];
  enumerateBox(
    family,
    box(bound),
    (coeffs, count) => {
      for (let i = 0; i < count; i++) seen.push(polyAt(coeffs, degree, i).toString());
    },
    batchCapacity,
  );
  return seen;
}

describe("integerPolynomials ∩ box", () => {
  it("counts exactly: leading in [1, B], others in [−B, B]", () => {
    // degree 2, bound 1: a₂ ∈ {1}, a₁, a₀ ∈ {−1, 0, 1} → 9
    expect(collect(2, 1)).toHaveLength(9);
    // degree 2, bound 2: 2 · 5 · 5 = 50
    expect(collect(2, 2)).toHaveLength(50);
    // degree 3, bound 1: 1 · 3³ = 27
    expect(collect(3, 1)).toHaveLength(27);
  });

  it("contains no lower-degree polynomials and no negative leading coefficient", () => {
    const family = integerPolynomials({ degree: 2 });
    enumerateBox(family, box(3), (coeffs, count) => {
      for (let i = 0; i < count; i++) {
        expect(coeffs[i * 3 + 2]).toBeGreaterThanOrEqual(1);
      }
    });
  });

  it("enumerates every polynomial exactly once (dedupe check)", () => {
    const seen = collect(2, 2);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("is deterministic and independent of batch capacity", () => {
    expect(collect(2, 3, 7)).toEqual(collect(2, 3, 1000));
  });

  it("reader view prints paper order", () => {
    const seen = collect(2, 1);
    expect(seen).toContain("x^2 - 1");
    expect(seen).toContain("x^2 + x + 1");
  });
});
