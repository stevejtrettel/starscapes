/**
 * The explorer: a canvas showing one starscape, panned by dragging and
 * zoomed by the wheel. Every change of view asks the worker for the stars
 * of the new window; until they arrive the discs already on the GPU are
 * simply re-projected.
 *
 * Under zoom the size constant follows c = c₀·(height/home height)^γ with
 * the family's zoom exponent γ (style/sizeLaw.ts), which holds the ink
 * constant when the law's ink diverges and is 1 (pure magnification) when
 * it converges.
 */
import type { View } from "../fibre/window.ts";
import type { Preset } from "../presets.ts";
import { starscape } from "../starscape.ts";
import { zoomExponent } from "../style/sizeLaw.ts";
import { pan, zoomAt } from "./camera.ts";
import { createDiscRenderer } from "./gl/discs.ts";
import type { RenderRequest, WorkerMessage } from "./protocol.ts";

/** Radius in CSS pixels of the faintest stars requested. */
const FAINTEST = 0.3;

export function startExplorer(canvas: HTMLCanvasElement, hud: HTMLElement, preset: Preset): void {
  const gl = canvas.getContext("webgl2");
  if (!gl) throw new Error("WebGL2 is not available");
  const renderer = createDiscRenderer(gl);
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

  const { population } = starscape(preset.spec);
  const gamma = population === null ? 0 : zoomExponent(preset.spec.law, population);

  let view: View = preset.home;
  let generation = 0;
  let drawnGeneration = 0; // the generation whose discs are on the GPU
  let anchor: readonly [number, number] = view.centre;
  let status = "computing…";
  let viewChanged = true;
  let needsPaint = true;

  worker.onmessage = (event: MessageEvent<WorkerMessage>): void => {
    const message = event.data;
    if (message.generation !== generation) return; // superseded
    if (message.type === "chunk") {
      if (drawnGeneration !== generation) {
        drawnGeneration = generation;
        renderer.begin(anchor);
      }
      renderer.append(message.discs, message.count);
    } else {
      if (drawnGeneration !== generation) {
        drawnGeneration = generation; // an empty view
        renderer.begin(anchor);
      }
      status = `${message.stars.toLocaleString()} stars · ${message.milliseconds.toFixed(0)} ms`;
    }
    needsPaint = true;
  };

  function request(): void {
    generation++;
    anchor = view.centre;
    status = "computing…";
    const law = { ...preset.spec.law, c: preset.spec.law.c * (view.height / preset.home.height) ** gamma };
    const message: RenderRequest = {
      generation,
      spec: { family: preset.spec.family, law },
      irreducible: preset.irreducible,
      view,
      viewportW: canvas.clientWidth,
      viewportH: canvas.clientHeight,
      faintest: FAINTEST,
    };
    worker.postMessage(message);
  }

  const move = (next: View): void => {
    view = next;
    viewChanged = true;
    needsPaint = true;
  };
  canvas.addEventListener("pointerdown", (event) => canvas.setPointerCapture(event.pointerId));
  canvas.addEventListener("pointermove", (event) => {
    if (event.buttons !== 0) move(pan(view, event.movementX, event.movementY, canvas.clientHeight));
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      move(zoomAt(view, factor, event.offsetX, event.offsetY, canvas.clientWidth, canvas.clientHeight));
    },
    { passive: false },
  );

  function frame(): void {
    const scale = window.devicePixelRatio || 1;
    const [w, h] = [Math.round(canvas.clientWidth * scale), Math.round(canvas.clientHeight * scale)];
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      viewChanged = true;
      needsPaint = true;
    }
    if (viewChanged) {
      viewChanged = false;
      request();
    }
    if (needsPaint) {
      needsPaint = false;
      renderer.draw(view, canvas.clientWidth, canvas.clientHeight);
      const overflow = renderer.dropped > 0 ? ` · ${renderer.dropped.toLocaleString()} stars not drawn (buffer full)` : "";
      hud.textContent =
        `${preset.title} · ${status}${overflow} · ` +
        `centre ${view.centre[0].toFixed(6)} + ${view.centre[1].toFixed(6)}i · height ${view.height.toExponential(2)}`;
    }
    requestAnimationFrame(frame);
  }
  frame();
}
