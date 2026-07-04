import { describe, expect, it } from "vitest";
import { harvestQuadratics, inverse } from "../src/core/search/inverse.ts";

function collect(
  aMax: number, epsilon: number,
  window: { left: number; top: number; worldW: number; worldH: number },
  seeds: number,
): string[] {
  const found: string[] = [];
  harvestQuadratics(inverse({ aMax, epsilon }), window, seeds, seeds, (coeffs, count) => {
    for (let i = 0; i < count; i++) {
      found.push(`${coeffs[i * 3 + 2]}x^2 + ${coeffs[i * 3 + 1]}x + ${coeffs[i * 3]}`);
    }
  });
  return found;
}

const AROUND_I = { left: -0.1, top: 1.1, worldW: 0.2, worldH: 0.2 };

describe("inverse quadratic harvest", () => {
  it("finds x² + 1 from trace points near i", () => {
    const found = collect(3, 0.05, AROUND_I, 32);
    expect(found).toContain("1x^2 + 0x + 1");
  });

  it("dedupes across trace points (every hit distinct)", () => {
    const found = collect(3, 0.05, AROUND_I, 32);
    expect(new Set(found).size).toBe(found.length);
  });

  it("is deterministic", () => {
    expect(collect(5, 0.04, AROUND_I, 24)).toEqual(collect(5, 0.04, AROUND_I, 24));
  });

  it("harvest grows with the height cutoff", () => {
    const shallow = collect(2, 0.04, AROUND_I, 32).length;
    const deep = collect(10, 0.04, AROUND_I, 32).length;
    expect(deep).toBeGreaterThan(shallow);
  });

  it("row-sliced runs with a shared seen set ≡ one whole run (streaming path)", () => {
    const whole: string[] = [];
    harvestQuadratics(inverse({ aMax: 8, epsilon: 0.05 }), AROUND_I, 32, 32, (coeffs, count) => {
      for (let i = 0; i < count; i++) {
        whole.push(`${coeffs[i * 3 + 2]},${coeffs[i * 3 + 1]},${coeffs[i * 3]}`);
      }
    });

    const sliced: string[] = [];
    const seen = new Set<string>();
    const dy = AROUND_I.worldH / 32;
    for (let row = 0; row < 32; row += 5) {
      const rows = Math.min(5, 32 - row);
      const slice = {
        left: AROUND_I.left,
        top: AROUND_I.top - row * dy,
        worldW: AROUND_I.worldW,
        worldH: rows * dy,
      };
      harvestQuadratics(inverse({ aMax: 8, epsilon: 0.05 }), slice, 32, rows, (coeffs, count) => {
        for (let i = 0; i < count; i++) {
          sliced.push(`${coeffs[i * 3 + 2]},${coeffs[i * 3 + 1]},${coeffs[i * 3]}`);
        }
      }, 4096, seen);
    }

    expect(sliced.sort()).toEqual(whole.sort());
  });
});
