/**
 * Print a starscape to a PNG.
 *
 *   node scripts/prints/print.ts <preset> [key=value …]
 *
 * preset   one of the names in src/presets.ts (quadratics, cubics,
 *          monic-cubics, quartics, …), or `box` for any degree and height
 * options  c=  kappa=  beta=             override the size law r = c·y^β·δ^(−κ)
 *          centre=0,1.1  span=2.6        the view (span = its height in ℂ)
 *          width=1600  height=<width>    image size in pixels
 *          faintest=0.25                 radius in pixels of the smallest stars
 *          compositing=opaque|additive
 *          degree=4  H=6  monic=0        for `box`
 *          irreducible=0|1               cubics: drop those with a rational root
 *          out=outputs/<preset>.png
 */
import { realRoot } from "../../src/catalogue/cubics.ts";
import type { Star } from "../../src/catalogue/star.ts";
import { hasRationalRoot } from "../../src/poly/rationalRoot.ts";
import { PRESETS, type Preset } from "../../src/presets.ts";
import { renderPicture } from "../../src/render/picture.ts";
import { writePng } from "../../src/render/png.ts";
import { starscape } from "../../src/starscape.ts";
import { hyperbolic } from "../../src/style/sizeLaw.ts";

const [name = "quadratics", ...rest] = process.argv.slice(2);
const arg = Object.fromEntries(rest.map((kv) => kv.split("=") as [string, string]));
const num = (key: string, fallback: number): number => (key in arg ? Number(arg[key]) : fallback);

const presets: Record<string, Preset> = {
  ...PRESETS,
  box: {
    title: "box",
    spec: {
      family: { kind: "box", degree: num("degree", 4), height: num("H", 6), monic: num("monic", 0) === 1 },
      law: hyperbolic(0.04),
    },
    home: { centre: [0, 1.0], height: 2.4 },
    irreducible: false,
  },
};
const preset = presets[name];
if (!preset) throw new Error(`unknown preset "${name}"; one of ${Object.keys(presets).join(", ")}`);

const { law, family } = preset.spec;
const scape = starscape({
  family,
  law: { c: num("c", law.c), beta: num("beta", law.beta), kappa: num("kappa", law.kappa), cap: law.cap },
});
const centre = arg.centre ? (arg.centre.split(",").map(Number) as [number, number]) : preset.home.centre;
const irreducible = family.kind === "cubics" && num("irreducible", preset.irreducible ? 1 : 0) === 1;

const started = performance.now();
const picture = renderPicture(scape, { centre, height: num("span", preset.home.height) }, {
  width: num("width", 1600),
  ...("height" in arg ? { height: Number(arg.height) } : {}),
  faintest: num("faintest", 0.25),
  compositing: arg.compositing === "additive" ? "additive" : "opaque",
  ...(irreducible ? { keep: (star: Star) => !hasRationalRoot(star.f, realRoot(star)) } : {}),
});
const seconds = (performance.now() - started) / 1000;

const out = arg.out ?? `outputs/${name}.png`;
writePng(out, picture.rgb, picture.width, picture.height);
console.log(`${preset.title}: ${picture.stars.toLocaleString()} stars, ${picture.width}×${picture.height}, ${seconds.toFixed(1)} s → ${out}`);
