/**
 * Print a recipe to a PNG.
 *
 *   node scripts/prints/print.ts <recipe> [key=value …]
 *
 * recipe   a preset name from src/presets.ts (quadratics, cubics, …), a
 *          .json file saved from the explorer, or `box` for any degree
 * options  width=1600  height=<width>    image size in pixels
 *          centre=0,1.1  span=2.6        override the view (span = its height in ℂ)
 *          c=  kappa=  beta=             override the size law r = c·y^β·δ^(−κ);
 *                                        c is taken as quoted at this image's pixel size
 *          faintest=0.3                  radius in pixels of the smallest stars
 *          colour=ink|leading|discriminant|height|real-root|shape|galois
 *          irreducible=0|1               only polynomials irreducible over ℚ (degree ≤ 5)
 *          galois=D4,C4|any              only irreducible polynomials with these Galois groups
 *          compositing=opaque|additive
 *          degree=4  H=6  monic=0        for `box`
 *          out=outputs/<name>.png
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { PRESETS } from "../../src/presets.ts";
import { parseRecipe, type Recipe, requote } from "../../src/recipe.ts";
import { renderRecipe } from "../../src/render/picture.ts";
import { writePng } from "../../src/render/png.ts";
import { hyperbolic } from "../../src/style/sizeLaw.ts";

const [name = "quadratics", ...rest] = process.argv.slice(2);
const arg = Object.fromEntries(rest.map((kv) => kv.split("=") as [string, string]));
const num = (key: string, fallback: number): number => (key in arg ? Number(arg[key]) : fallback);

function load(): Recipe {
  if (name.endsWith(".json")) return parseRecipe(JSON.parse(readFileSync(name, "utf8")));
  if (name === "box") {
    const view = { centre: [0, 1.0] as const, height: 2.4 };
    return {
      title: "box",
      spec: {
        family: { kind: "box", degree: num("degree", 4), height: num("H", 6), monic: num("monic", 0) === 1 },
        law: hyperbolic(0.04),
      },
      pixel: view.height / 1000,
      view,
      colouring: "ink",
      faintest: 0.3,
    };
  }
  const preset = (PRESETS as Record<string, Recipe>)[name];
  if (!preset) throw new Error(`unknown recipe "${name}": a .json file, box, or one of ${Object.keys(PRESETS).join(", ")}`);
  return preset;
}

const width = num("width", 1600);
const height = num("height", width);

// Apply the overrides: the view first, then the law as it stands at this image's pixel size.
let recipe = load();
const centre = arg.centre ? (arg.centre.split(",").map(Number) as [number, number]) : recipe.view.centre;
recipe = { ...recipe, view: { centre, height: num("span", recipe.view.height) } };
recipe = requote(recipe, recipe.view.height / height);
const { law } = recipe.spec;
recipe = parseRecipe({
  ...recipe,
  spec: {
    family: recipe.spec.family,
    law: { c: num("c", law.c), beta: num("beta", law.beta), kappa: num("kappa", law.kappa), cap: law.cap },
    irreducible: num("irreducible", recipe.spec.irreducible ? 1 : 0) === 1,
    ...(arg.galois === undefined
      ? recipe.spec.galois ? { galois: recipe.spec.galois } : {}
      : arg.galois === "any" ? {} : { galois: arg.galois.split(",") }),
  },
  faintest: num("faintest", recipe.faintest),
  colouring: arg.colour ?? recipe.colouring,
});

const started = performance.now();
const picture = renderRecipe(recipe, { width, height, compositing: arg.compositing === "additive" ? "additive" : "opaque" });
const seconds = (performance.now() - started) / 1000;

const out = arg.out ?? `outputs/${basename(name, ".json")}.png`;
writePng(out, picture.rgb, picture.width, picture.height);
console.log(`${recipe.title}: ${picture.stars.toLocaleString()} stars, ${picture.width}×${picture.height}, ${seconds.toFixed(1)} s → ${out}`);
