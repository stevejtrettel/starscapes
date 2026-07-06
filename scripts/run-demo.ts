// Dev-server launcher: `npm run dev [demo-name]`.
// With a name, opens /demos/<name>/ in the browser; without one, just serves.
// Fails loudly on a typo instead of letting Vite 404 silently.
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const demo = process.argv[2];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demosDir = path.join(root, "demos");

const hasPage = (name: string): boolean =>
  existsSync(path.join(demosDir, name, "index.html"));

const available = readdirSync(demosDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && hasPage(entry.name))
  .map((entry) => entry.name);

if (demo !== undefined && !hasPage(demo)) {
  console.error(`Demo not found: demos/${demo}/index.html`);
  console.error(`Available demos: ${available.join(", ")}`);
  process.exit(1);
}

if (demo === undefined) {
  console.log(`Demos: ${available.join(", ")} — npm run dev <name> to open one`);
}

const viteArgs = demo === undefined ? [] : ["--open", `/demos/${demo}/`];
const child = spawn("npx", ["vite", ...viteArgs], {
  stdio: "inherit",
  cwd: root,
});
child.on("exit", (code) => process.exit(code ?? 0));
