/**
 * The refactor's executable bit-identical gate (plan: collection model v2,
 * Phase 0). One case table, two modes:
 *
 *   node scripts/experiments/render-diff.ts --capture   # run every case from
 *     the CURRENT code, copy its artifacts into outputs/baselines/, record
 *     timings in outputs/baselines/baselines.json
 *   node scripts/experiments/render-diff.ts             # re-run every case,
 *     decode PNGs, count differing RGB pixels vs the captured baselines,
 *     report the time ratio; exits 1 if ANY pixel differs
 *
 * The gate: 0 differing pixels on every case (hard), time within ~10% of the
 * baseline (advisory ⚠ — laptops are noisy; pixels are the arbiter).
 * Baselines are branch-local scratch (outputs/ is never committed); the one
 * hard rule is they were captured from PRE-refactor HEAD, so capture runs
 * once, before Phase 1 lands, and never again.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";

interface Case {
  name: string;
  script: string;
  args: string[];
  /** Files the script writes (one run may produce several). */
  artifacts: string[];
}

/** The reference set: both compositing modes, both quadratic laws (uniform =
 *  draw-law ≠ derive-law), the cubic uniformity locus AND a cubic comparison
 *  law, and the one colored print (coloring + legend path). */
const CASES: Case[] = [
  {
    name: "first-light",
    script: "scripts/prints/first-light.ts",
    args: [],
    artifacts: ["outputs/first-light-opaque.png", "outputs/first-light-additive.png"],
  },
  {
    name: "quadratics-cone-std",
    script: "scripts/prints/quadratics-cone.ts",
    args: ["0.035", "1200", "1200", "std"],
    artifacts: ["outputs/quadratics-cone-0.035-std-1200x1200.png"],
  },
  {
    name: "quadratics-cone-uniform",
    script: "scripts/prints/quadratics-cone.ts",
    args: ["0.035", "1200", "1200", "uniform"],
    artifacts: ["outputs/quadratics-cone-0.035-uniform-1200x1200.png"],
  },
  {
    name: "monic-cubics-cone-disc4",
    script: "scripts/prints/monic-cubics-cone.ts",
    args: ["4", "0.03", "disc4", "1200", "1200"],
    artifacts: ["outputs/monic-cubics-cone-4-0.03-disc4-1200x1200.png"],
  },
  {
    name: "monic-cubics-cone-fprime",
    script: "scripts/prints/monic-cubics-cone.ts",
    args: ["4", "0.03", "fprime", "1200", "1200"],
    artifacts: ["outputs/monic-cubics-cone-4-0.03-fprime-1200x1200.png"],
  },
  {
    name: "monic-cubics-galois",
    script: "scripts/prints/monic-cubics-galois.ts",
    args: ["4", "0.03", "1200", "1200"],
    artifacts: ["outputs/monic-cubics-galois-4-0.03-1200x1200.png"],
  },
];

const BASE_DIR = "outputs/baselines";
const MANIFEST = `${BASE_DIR}/baselines.json`;

const baselinePath = (artifact: string): string =>
  `${BASE_DIR}/${artifact.split("/").pop()}`;

function runCase(c: Case): number {
  const t0 = performance.now();
  execFileSync("node", [c.script, ...c.args], { stdio: "inherit" });
  return (performance.now() - t0) / 1000;
}

/** Differing RGB pixels between two PNG files (alpha ignored — writer pins 255). */
function diffPixels(fileA: string, fileB: string): number {
  const a = PNG.sync.read(readFileSync(fileA));
  const b = PNG.sync.read(readFileSync(fileB));
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`${fileA} is ${a.width}x${a.height}, ${fileB} is ${b.width}x${b.height}`);
  }
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n++;
  }
  return n;
}

if (process.argv.includes("--capture")) {
  mkdirSync(BASE_DIR, { recursive: true });
  const manifest: Record<string, { script: string; args: string[]; artifacts: string[]; seconds: number }> = {};
  for (const c of CASES) {
    console.log(`\n▶ capture ${c.name}`);
    const seconds = runCase(c);
    for (const artifact of c.artifacts) copyFileSync(artifact, baselinePath(artifact));
    manifest[c.name] = { script: c.script, args: c.args, artifacts: c.artifacts, seconds };
  }
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\ncaptured ${CASES.length} cases → ${MANIFEST}`);
} else {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Record<
    string,
    { seconds: number; artifacts: string[] }
  >;
  let failed = false;
  for (const c of CASES) {
    const base = manifest[c.name];
    if (!base) throw new Error(`${c.name} missing from ${MANIFEST} — re-run --capture first? (must be pre-refactor code!)`);
    console.log(`\n▶ ${c.name}`);
    const seconds = runCase(c);
    const ratio = seconds / base.seconds;
    const slow = ratio > 1.1 ? " ⚠ >10% slower" : "";
    console.log(`  time ${seconds.toFixed(1)}s vs baseline ${base.seconds.toFixed(1)}s (×${ratio.toFixed(2)})${slow}`);
    for (const artifact of c.artifacts) {
      const n = diffPixels(artifact, baselinePath(artifact));
      console.log(`  ${artifact}: ${n === 0 ? "✓ identical" : `✗ ${n} differing pixels`}`);
      if (n > 0) failed = true;
    }
  }
  console.log(failed ? "\nGATE FAILED — pixels differ" : "\ngate passed: all cases bit-identical");
  process.exit(failed ? 1 : 0);
}
