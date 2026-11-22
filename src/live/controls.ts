/**
 * The explorer's control panel: the size law r = c·y^β·δ^(−κ), the
 * magnitude limit, the colouring, and the buttons. It holds no state of
 * its own — it reports edits and is told what to display.
 */
import { GALOIS_GROUPS, type GaloisGroup } from "../poly/galois.ts";
import type { Recipe } from "../recipe.ts";
import { starscape } from "../starscape.ts";
import { COLOURINGS, type Colouring } from "../style/colour.ts";
import type { SizeLaw } from "../style/sizeLaw.ts";

export interface ControlHandlers {
  law(change: Partial<SizeLaw>): void;
  faintest(pixels: number): void;
  colouring(colouring: Colouring): void;
  irreducible(on: boolean): void;
  /** Only this Galois group, or null for all. */
  galois(group: GaloisGroup | null): void;
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
  const degree = starscape({ family: recipe.spec.family, law: recipe.spec.law }).degree;
  if (degree >= 3 && degree <= 5) row("irreducible only", irreducible);

  const galois = document.createElement("select");
  galois.add(new Option("all", ""));
  for (const group of GALOIS_GROUPS[degree] ?? []) galois.add(new Option(group, group));
  galois.addEventListener("change", () => on.galois(galois.value === "" ? null : (galois.value as GaloisGroup)));
  if (degree >= 3 && degree <= 5) row("Galois group", galois);

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
      irreducible.checked = current.spec.irreducible === true || current.spec.galois !== undefined;
      // A recipe may ask for several groups; the menu shows one, or "all".
      galois.value = current.spec.galois?.length === 1 ? current.spec.galois[0] : "";
    },
  };
}
