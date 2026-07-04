import { describe, expect, it } from "vitest";
import { coneQuadratics } from "../src/core/search/cone.ts";

const WINDOW = { left: -0.15, top: 1.15, worldW: 0.3, worldH: 0.3 }; // around i

/** UHP root of ax²+bx+c when disc < 0, else null. */
function uhpRoot(a: number, b: number, c: number): { re: number; im: number } | null {
  const disc = b * b - 4 * a * c;
  if (disc >= 0) return null;
  return { re: -b / (2 * a), im: Math.sqrt(-disc) / (2 * a) };
}

function inWindow(w: { left: number; top: number; worldW: number; worldH: number }, re: number, im: number): boolean {
  return re >= w.left && re <= w.left + w.worldW && im <= w.top && im >= w.top - w.worldH;
}

function coneMembers(aMax: number): Set<string> {
  const found = new Set<string>();
  coneQuadratics(WINDOW, 1, aMax, (coeffs, count) => {
    for (let i = 0; i < count; i++) {
      const c = coeffs[i * 3];
      const b = coeffs[i * 3 + 1];
      const a = coeffs[i * 3 + 2];
      const root = uhpRoot(a, b, c);
      if (root && inWindow(WINDOW, root.re, root.im)) found.add(`${a},${b},${c}`);
    }
  });
  return found;
}

describe("view-cone enumeration", () => {
  it("≡ brute force: exactly the quadratics with a UHP root in the window", () => {
    const aMax = 6;
    const brute = new Set<string>();
    const B = 40; // safely beyond any member's |b|, |c| at this aMax/window
    for (let a = 1; a <= aMax; a++) {
      for (let b = -B; b <= B; b++) {
        for (let c = -B; c <= B; c++) {
          const root = uhpRoot(a, b, c);
          if (root && inWindow(WINDOW, root.re, root.im)) brute.add(`${a},${b},${c}`);
        }
      }
    }
    const cone = coneMembers(aMax);
    expect(cone).toEqual(brute);
    expect(cone.size).toBeGreaterThan(0);
  });

  it("finds x² + 1", () => {
    expect(coneMembers(3).has("1,0,1")).toBe(true);
  });

  it("emits no duplicates", () => {
    let emitted = 0;
    const distinct = new Set<string>();
    coneQuadratics(WINDOW, 1, 10, (coeffs, count) => {
      emitted += count;
      for (let i = 0; i < count; i++) {
        distinct.add(`${coeffs[i * 3 + 2]},${coeffs[i * 3 + 1]},${coeffs[i * 3]}`);
      }
    });
    expect(distinct.size).toBe(emitted);
  });

  it("depth blocks compose: [1..4] ∪ [5..10] ≡ [1..10]", () => {
    const collect = (aFrom: number, aTo: number) => {
      const keys: string[] = [];
      coneQuadratics(WINDOW, aFrom, aTo, (coeffs, count) => {
        for (let i = 0; i < count; i++) {
          keys.push(`${coeffs[i * 3 + 2]},${coeffs[i * 3 + 1]},${coeffs[i * 3]}`);
        }
      });
      return keys;
    };
    const whole = collect(1, 10).sort();
    const blocks = [...collect(1, 4), ...collect(5, 10)].sort();
    expect(blocks).toEqual(whole);
  });
});
