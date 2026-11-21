import { describe, expect, it } from "vitest";
import type { View } from "../src/fibre/window.ts";
import { pan, pixelToWorld, zoomAt } from "../src/live/camera.ts";

const view: View = { centre: [0, 1.1], height: 2.6 };
const [W, H] = [1200, 800];

describe("camera", () => {
  it("the centre pixel shows the centre of the view", () => {
    const [re, im] = pixelToWorld(view, W / 2, H / 2, W, H);
    expect(re).toBeCloseTo(0, 15);
    expect(im).toBeCloseTo(1.1, 15);
  });

  it("pan: the picture follows the cursor", () => {
    const before = pixelToWorld(view, 300, 200, W, H);
    const after = pixelToWorld(pan(view, 100, -50, H), 400, 150, W, H);
    expect(after[0]).toBeCloseTo(before[0], 12);
    expect(after[1]).toBeCloseTo(before[1], 12);
  });

  it("zoom: the point under the cursor stays put", () => {
    const before = pixelToWorld(view, 900, 100, W, H);
    const zoomed = zoomAt(view, 3.7, 900, 100, W, H);
    const after = pixelToWorld(zoomed, 900, 100, W, H);
    expect(zoomed.height).toBeCloseTo(2.6 / 3.7, 15);
    expect(after[0]).toBeCloseTo(before[0], 12);
    expect(after[1]).toBeCloseTo(before[1], 12);
  });
});
