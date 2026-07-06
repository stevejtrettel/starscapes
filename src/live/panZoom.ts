/**
 * Pan/zoom interactions over the pure camera math (camera.ts): drag pans,
 * wheel zooms about the cursor. The caller owns the camera — this part just
 * turns pointer events into camera updates.
 */
import { type Camera, pan, zoomAt } from "./camera.ts";

export function attachPanZoom(
  canvas: HTMLCanvasElement,
  getCamera: () => Camera,
  setCamera: (next: Camera) => void,
): void {
  let dragging = false;
  canvas.addEventListener("mousedown", () => {
    dragging = true;
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    setCamera(pan(getCamera(), e.movementX, e.movementY, canvas.clientHeight));
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      setCamera(
        zoomAt(getCamera(), factor, e.offsetX, e.offsetY, canvas.clientWidth, canvas.clientHeight),
      );
    },
    { passive: false },
  );
}
