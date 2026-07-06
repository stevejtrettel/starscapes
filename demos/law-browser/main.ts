/**
 * The (γ, δ) law-browser — the permanent layering litmus (design.md,
 * "sentences, not specs"): a demo that does NOT use explore, composing the
 * same public parts directly — runRenderLoop, createDiskRenderer,
 * createRenderService, attachPanZoom, hudReadout — with slider values
 * crossing the protocol as plain params. The quadratic Φ_cone under the
 * full f′-form power law r = c·y^δ/|f′(z)|^γ with live exponents; depth
 * always derives from the classic reference (a fixed population, so what
 * changes on a drag is only the law — comparison by construction).
 */

import type { Scene, ViewInfo } from "../../src/core/scene.ts";
import { viewConeQuadratics, visibleDepthQuadratics } from "../../src/core/search/cone.ts";
import { powerLaw } from "../../src/core/sizing.ts";
import type { Camera } from "../../src/live/camera.ts";
import { createDiskRenderer, FLOATS_PER_INSTANCE } from "../../src/live/gl/disks.ts";
import { hudReadout } from "../../src/live/hud.ts";
import { attachPanZoom } from "../../src/live/panZoom.ts";
import { createRenderService } from "../../src/live/renderService.ts";
import { runRenderLoop } from "../../src/live/runRenderLoop.ts";

interface LawParams {
  gamma: number;
  delta: number;
  c: number;
}
const DEFAULTS: LawParams = { gamma: 1, delta: 1, c: 0.035 };

function picture(view: ViewInfo, params: unknown): Scene {
  const { gamma, delta, c } = (params as LawParams | undefined) ?? DEFAULTS;
  const law = powerLaw({ c, gamma, delta, cap: 0.5 });
  return {
    collection: viewConeQuadratics({
      window: view.window,
      aMax: visibleDepthQuadratics(c, view.worldPerPixel), // classic-law reference depth
      pad: c / 2,
    }),
    draw(poly, dot) {
      for (const root of poly.roots) {
        if (root.im <= 0) continue;
        dot(root, law.size(root), 0.05, 0.05, 0.05);
      }
    },
  };
}

if (typeof document === "undefined") {
  // Worker context: this module was spawned as its own worker.
  runRenderLoop(picture);
} else {
  const canvas = document.getElementById("view") as HTMLCanvasElement;
  const hud = document.getElementById("hud") as HTMLDivElement;
  const gl = canvas.getContext("webgl2");
  if (!gl) throw new Error("WebGL2 unavailable");

  const renderer = createDiskRenderer(gl, { radiusCap: 0.5 });
  let camera: Camera = { centerRe: 0, centerIm: 1.1, height: 2.6 };
  let repaint = true;
  let research = true;
  let status = "computing…";

  const sliders = {} as Record<keyof LawParams, HTMLInputElement>;
  for (const key of ["gamma", "delta", "c"] as const) {
    sliders[key] = document.getElementById(key) as HTMLInputElement;
    const out = document.getElementById(`${key}Out`) as HTMLSpanElement;
    sliders[key].addEventListener("input", () => {
      out.textContent = key === "c" ? sliders.c.value : Number(sliders[key].value).toFixed(2);
      research = true;
    });
  }
  const lawParams = (): LawParams => ({
    gamma: Number(sliders.gamma.value),
    delta: Number(sliders.delta.value),
    c: Number(sliders.c.value),
  });

  const service = createRenderService(
    () => new Worker(new URL("./main.ts", import.meta.url), { type: "module" }),
    {
      onChunk(instances, count, first, anchorRe, anchorIm) {
        if (count * FLOATS_PER_INSTANCE > instances.length) {
          throw new Error("chunk shorter than its count");
        }
        if (first) renderer.begin(anchorRe, anchorIm);
        renderer.append(instances, count);
        repaint = true;
      },
      onDone({ polynomials, population, ms }) {
        status = `${population} · ${polynomials} polys · ${ms.toFixed(0)} ms`;
        repaint = true;
      },
    },
  );

  attachPanZoom(canvas, () => camera, (next) => {
    camera = next;
    repaint = true;
    research = true;
  });

  const resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      repaint = true;
      research = true;
    }
  };

  const frame = (): void => {
    resize();
    if (research) {
      research = false;
      status = "computing…";
      service.request(camera, canvas.clientWidth, canvas.clientHeight, lawParams());
    }
    if (repaint) {
      repaint = false;
      renderer.draw(camera, canvas.clientWidth, canvas.clientHeight);
      const p = lawParams();
      hud.textContent = hudReadout({
        title: `quadratics · r = ${p.c}·y^${p.delta}/|f′|^${p.gamma}`,
        count: renderer.count,
        status,
        camera,
        dropped: renderer.dropped,
      });
    }
    requestAnimationFrame(frame);
  };
  frame();
}
