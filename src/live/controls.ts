/**
 * The explorer's control panel: the size law r = c·y^β·δ^(−κ), the
 * magnitude limit, the colouring, and the buttons. It holds no state of
 * its own — it reports edits and is told what to display.
 */
import type { Recipe } from "../recipe.ts";
import { COLOURINGS, type Colouring } from "../style/colour.ts";
import type { SizeLaw } from "../style/sizeLaw.ts";

export interface ControlHandlers {
  law(change: Partial<SizeLaw>): void;
  faintest(pixels: number): void;
  colouring(colouring: Colouring): void;
  irreducible(on: boolean): void;
  /** Set β to the value that evens the ink down the page. */
  even(): void;
  home(): void;
  save(): void;
  copyCommand(): void;
}

export interface Controls {
  /** Show the recipe, with its law as it is at the current zoom. */
  show(recipe: Recipe, law: SizeLaw): void;
}

export function createControls(panel: HTMLElement, recipe: Recipe, on: ControlHandlers): Controls {
  const row = (label: string, ...children: HTMLElement[]): void => {
    const line = document.createElement("label");
    line.append(label, ...children);
    panel.append(line);
  };
  const slider = (
    label: string, min: number, max: number, step: number,
    format: (v: number) => string, change: (v: number) => void,
  ): { set(v: number): void } => {
    const input = document.createElement("input");
    Object.assign(input, { type: "range", min: String(min), max: String(max), step: String(step) });
    const readout = document.createElement("span");
    input.addEventListener("input", () => {
      readout.textContent = format(Number(input.value));
      change(Number(input.value));
    });
    row(label, input, readout);
    return {
      set(v) {
        if (document.activeElement === input) return; // being dragged
        input.value = String(v);
        readout.textContent = format(v);
      },
    };
  };
  const button = (label: string, title: string, click: () => void): HTMLButtonElement => {
    const b = document.createElement("button");
    b.textContent = label;
    b.title = title;
    b.addEventListener("click", click);
    return b;
  };

  // c is edited on a logarithmic scale.
  const c = slider("size c", -3.5, 0, 0.01, (v) => (10 ** v).toPrecision(3), (v) => on.law({ c: 10 ** v }));
  const kappa = slider("κ", 0.5, 3, 0.01, (v) => v.toFixed(2), (v) => on.law({ kappa: v }));
  const beta = slider("β", 0, 1.5, 0.01, (v) => v.toFixed(2), (v) => on.law({ beta: v }));
  const faintest = slider("faintest (px)", 0.1, 2, 0.05, (v) => v.toFixed(2), on.faintest);

  const colouring = document.createElement("select");
  for (const name of COLOURINGS) colouring.add(new Option(name, name));
  colouring.addEventListener("change", () => on.colouring(colouring.value as Colouring));
  row("colour", colouring);

  const irreducible = document.createElement("input");
  irreducible.type = "checkbox";
  irreducible.addEventListener("change", () => on.irreducible(irreducible.checked));
  if (recipe.spec.family.kind === "cubics") row("irreducible only", irreducible);

  const buttons = document.createElement("div");
  buttons.append(
    button("even β", "set β = wκ/D, which evens the ink down the page", on.even),
    button("home", "return to the starting view", on.home),
    button("save", "download this picture's recipe (JSON)", on.save),
    button("print…", "copy the command that prints this picture", on.copyCommand),
  );
  panel.append(buttons);

  return {
    show(current, law) {
      c.set(Math.log10(law.c));
      kappa.set(law.kappa);
      beta.set(law.beta);
      faintest.set(current.faintest);
      colouring.value = current.colouring;
      irreducible.checked = current.irreducible;
    },
  };
}
