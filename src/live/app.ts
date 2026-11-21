/**
 * The explorer: a canvas showing one recipe, which the user edits — the
 * view by dragging and scrolling, the size law and colouring from a panel.
 * Every edit asks the worker for the stars of the new picture; until they
 * arrive, the discs already on the GPU are simply re-projected.
 *
 * The recipe is the whole state. It is mirrored in the URL fragment, so a
 * reload or a shared link restores the picture, and "save" downloads it
 * for the print script.
 */
import { lawAt, parseRecipe, type Recipe, requote } from "../recipe.ts";
import { starscape } from "../starscape.ts";
import { evenBeta, type SizeLaw } from "../style/sizeLaw.ts";
import { pan, zoomAt } from "./camera.ts";
import { createControls } from "./controls.ts";
import { createDiscRenderer } from "./gl/discs.ts";
import type { RenderRequest, WorkerMessage } from "./protocol.ts";

export function startExplorer(
  canvas: HTMLCanvasElement, hud: HTMLElement, panel: HTMLElement, preset: Recipe,
): void {
  const gl = canvas.getContext("webgl2");
  if (!gl) throw new Error("WebGL2 is not available");
  const renderer = createDiscRenderer(gl);
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

  let recipe = fromFragment() ?? preset;
  let generation = 0;
  let drawnGeneration = 0; // the generation whose discs are on the GPU
  let anchor = recipe.view.centre;
  let status = "computing…";
  let note = "";
  let changed = true;
  let needsPaint = true;

  /** The size of a CSS pixel in ℂ at the current zoom. */
  const pixel = (): number => recipe.view.height / canvas.clientHeight;

  worker.onmessage = (event: MessageEvent<WorkerMessage>): void => {
    const message = event.data;
    if (message.generation !== generation) return; // superseded
    if (drawnGeneration !== generation) {
      drawnGeneration = generation;
      renderer.begin(anchor);
    }
    if (message.type === "chunk") renderer.append(message.discs, message.count);
    else {
      status = message.error ?? `${message.stars.toLocaleString()} stars · ${message.milliseconds.toFixed(0)} ms`;
    }
    needsPaint = true;
  };

  const edit = (next: Recipe): void => {
    recipe = next;
    changed = true;
    needsPaint = true;
  };
  /** Edits of the law apply to the law as it is at the current zoom. */
  const editLaw = (change: Partial<SizeLaw>): void => {
    const here = requote(recipe, pixel());
    edit({ ...here, spec: { family: here.spec.family, law: { ...here.spec.law, ...change } } });
  };

  const controls = createControls(panel, recipe, {
    law: editLaw,
    faintest: (faintest) => edit({ ...recipe, faintest }),
    colouring: (colouring) => edit({ ...recipe, colouring }),
    irreducible: (irreducible) => edit({ ...recipe, spec: { ...recipe.spec, irreducible } }),
    even() {
      const { population } = starscape(recipe.spec);
      if (population) editLaw({ beta: evenBeta(recipe.spec.law.kappa, population) });
    },
    home: () => edit({ ...recipe, view: preset.view }),
    save() {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([JSON.stringify(recipe, null, 2)], { type: "application/json" }));
      link.download = "starscape.json";
      link.click();
      URL.revokeObjectURL(link.href);
      note = "saved starscape.json";
    },
    copyCommand() {
      const command = "node scripts/prints/print.ts starscape.json width=3600";
      void navigator.clipboard?.writeText(command);
      note = `save, then run: ${command}`;
      needsPaint = true;
    },
  });

  canvas.addEventListener("pointerdown", (event) => canvas.setPointerCapture(event.pointerId));
  canvas.addEventListener("pointermove", (event) => {
    if (event.buttons === 0) return;
    edit({ ...recipe, view: pan(recipe.view, event.movementX, event.movementY, canvas.clientHeight) });
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      const view = zoomAt(recipe.view, factor, event.offsetX, event.offsetY, canvas.clientWidth, canvas.clientHeight);
      edit({ ...recipe, view });
    },
    { passive: false },
  );

  let fragmentTimer = 0;
  function frame(): void {
    const scale = window.devicePixelRatio || 1;
    const [w, h] = [Math.round(canvas.clientWidth * scale), Math.round(canvas.clientHeight * scale)];
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      changed = true;
      needsPaint = true;
    }
    if (changed) {
      changed = false;
      generation++;
      anchor = recipe.view.centre;
      status = "computing…";
      const request: RenderRequest = {
        generation,
        recipe,
        viewportW: canvas.clientWidth,
        viewportH: canvas.clientHeight,
      };
      worker.postMessage(request);
      window.clearTimeout(fragmentTimer);
      fragmentTimer = window.setTimeout(() => {
        history.replaceState(null, "", `#${encodeURIComponent(JSON.stringify(recipe))}`);
      }, 400);
    }
    if (needsPaint) {
      needsPaint = false;
      const { view } = recipe;
      renderer.draw(view, canvas.clientWidth, canvas.clientHeight);
      controls.show(recipe, lawAt(recipe, pixel()));
      const overflow = renderer.dropped > 0 ? ` · ${renderer.dropped.toLocaleString()} stars not drawn (buffer full)` : "";
      hud.textContent =
        `${recipe.title} · ${status}${overflow} · ` +
        `centre ${view.centre[0].toFixed(6)} + ${view.centre[1].toFixed(6)}i · height ${view.height.toExponential(2)}` +
        (note ? ` · ${note}` : "");
    }
    requestAnimationFrame(frame);
  }
  frame();
}

/** The recipe in the URL fragment, if there is a valid one. */
function fromFragment(): Recipe | null {
  if (location.hash.length < 2) return null;
  try {
    return parseRecipe(JSON.parse(decodeURIComponent(location.hash.slice(1))));
  } catch {
    return null;
  }
}
