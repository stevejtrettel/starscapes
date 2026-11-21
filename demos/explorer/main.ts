/** The explorer page: ?family=<preset name> picks the starscape. */
import { startExplorer } from "../../src/live/app.ts";
import { PRESETS, type PresetName } from "../../src/presets.ts";

const requested = new URLSearchParams(location.search).get("family") ?? "quadratics";
const name: PresetName = requested in PRESETS ? (requested as PresetName) : "quadratics";

const nav = document.getElementById("families")!;
for (const key of Object.keys(PRESETS) as PresetName[]) {
  const link = document.createElement("a");
  link.href = `?family=${key}`;
  link.textContent = key;
  if (key === name) link.className = "current";
  nav.append(link);
}

startExplorer(
  document.getElementById("view") as HTMLCanvasElement,
  document.getElementById("hud")!,
  PRESETS[name],
);
