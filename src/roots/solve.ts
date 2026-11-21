/** All complex roots of a real polynomial: closed form when one exists. */
import { degree, type Poly } from "../poly/poly.ts";
import { solveAberth } from "./aberth.ts";
import { solveCubic, solveQuadratic, solveQuartic } from "./closedForm.ts";

/** Writes the roots of f, with multiplicity, to re[0..deg f), im[0..deg f). */
export function solve(f: Poly, re: Float64Array, im: Float64Array): void {
  const d = degree(f);
  if (d !== f.length - 1 || d < 1) throw new Error("solve: leading coefficient is zero");
  if (d === 1) {
    re[0] = -f[0] / f[1] + 0;
    im[0] = 0;
  } else if (d === 2) solveQuadratic(f, re, im);
  else if (d === 3) solveCubic(f, re, im);
  else if (d === 4 && solveQuartic(f, re, im)) return;
  else solveAberth(f, re, im);
}
