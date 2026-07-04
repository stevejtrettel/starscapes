import { describe, expect, it } from "vitest";
import { type Camera, pan, pixelToWorld, zoomAt } from "../src/live/camera.ts";

const cam: Camera = { centerRe: 0, centerIm: 1.1, height: 2.6 };
const W = 1200;
const H = 800;

describe("camera", () => {
  it("center pixel maps to the center of the window", () => {
    const p = pixelToWorld(cam, W / 2, H / 2, W, H);
    expect(p.re).toBeCloseTo(0, 15);
    expect(p.im).toBeCloseTo(1.1, 15);
  });

  it("pan moves the window opposite the drag (picture follows cursor)", () => {
    const moved = pan(cam, 100, -50, H);
    const w = cam.height / H;
    expect(moved.centerRe).toBeCloseTo(-100 * w, 15);
    expect(moved.centerIm).toBeCloseTo(1.1 - 50 * w, 15);
    expect(moved.height).toBe(cam.height);
  });

  it("zoomAt keeps the world point under the cursor fixed", () => {
    const px = 300;
    const py = 650;
    const before = pixelToWorld(cam, px, py, W, H);
    const zoomed = zoomAt(cam, 1.7, px, py, W, H);
    const after = pixelToWorld(zoomed, px, py, W, H);
    expect(after.re).toBeCloseTo(before.re, 12);
    expect(after.im).toBeCloseTo(before.im, 12);
    expect(zoomed.height).toBeCloseTo(cam.height / 1.7, 15);
  });

  it("zoom in then out at the same cursor returns the original window", () => {
    const there = zoomAt(cam, 2.5, 100, 100, W, H);
    const back = zoomAt(there, 1 / 2.5, 100, 100, W, H);
    expect(back.centerRe).toBeCloseTo(cam.centerRe, 12);
    expect(back.centerIm).toBeCloseTo(cam.centerIm, 12);
    expect(back.height).toBeCloseTo(cam.height, 12);
  });
});
