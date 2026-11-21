/**
 * Print a starscape to a PNG.
 *
 *   node scripts/prints/print.ts <family> [key=value …]
 *
 * family   quadratics | cubics | monic-cubics | box
 * options  c=0.035  kappa=1  beta=1      size law r = c·y^β·δ^(−κ)
 *          centre=0,1.1  span=2.6        the view (span = height in ℂ)
 *          width=1600  height=<width>    image size in pixels
 *          faintest=0.25                 radius in pixels of the smallest stars
 *          degree=4  H=6  monic=0        for family box
 *          irreducible=1                 cubics: drop those with a rational root
 *          out=outputs/<name>.png
 */
import { realRoot } from "../../src/catalogue/cubics.ts";
import type { Star } from "../../src/catalogue/star.ts";
import { hasRationalRoot } from "../../src/poly/rationalRoot.ts";
import { renderPicture } from "../../src/render/picture.ts";
import { writePng } from "../../src/render/png.ts";
import { type Family, starscape } from "../../src/starscape.ts";

const [familyName = "quadratics", ...rest] = process.argv.slice(2);
const arg = Object.fromEntries(rest.map((kv) => kv.split("=") as [string, string]));
const num = (name: string, fallback: number): number => (name in arg ? Number(arg[name]) : fallback);

const families: Record<string, Family> = {
  quadratics: { kind: "quadratics" },
  cubics: { kind: "cubics", monic: false },
  "monic-cubics": { kind: "cubics", monic: true },
  box: { kind: "box", degree: num("degree", 4), height: num("H", 6), monic: num("monic", 0) === 1 },
};
const family = families[familyName];
if (!family) throw new Error(`unknown family "${familyName}"; one of ${Object.keys(families).join(", ")}`);

const scape = starscape({
  family,
  law: { c: num("c", 0.035), beta: num("beta", 1), kappa: num("kappa", 1), cap: 0.5 },
});
const centre = (arg.centre ?? "0,1.1").split(",").map(Number) as [number, number];
const irreducibleOnly = family.kind === "cubics" && num("irreducible", 1) === 1;

const t0 = performance.now();
const picture = renderPicture(scape, { centre, height: num("span", 2.6) }, {
  width: num("width", 1600),
  ...("height" in arg ? { height: Number(arg.height) } : {}),
  faintest: num("faintest", 0.25),
  ...(irreducibleOnly ? { keep: (star: Star) => !hasRationalRoot(star.f, realRoot(star)) } : {}),
});
const seconds = (performance.now() - t0) / 1000;

const out = arg.out ?? `outputs/${familyName}.png`;
writePng(out, picture.rgb, picture.width, picture.height);
console.log(`${familyName}: ${picture.stars} stars, ${picture.width}×${picture.height}, ${seconds.toFixed(1)} s → ${out}`);
