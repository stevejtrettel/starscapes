import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const page = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

// Every demos/<name>/index.html is a build entry — new demos need no config edit.
const demoPages = Object.fromEntries(
  readdirSync(page("demos"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [entry.name, page(`demos/${entry.name}/index.html`)])
    .filter(([, html]) => existsSync(html)),
);

export default defineConfig({
  build: {
    rollupOptions: {
      input: { index: page("index.html"), ...demoPages },
    },
  },
});
