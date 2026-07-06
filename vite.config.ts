import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const page = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: page("index.html"),
        quadratics: page("demos/quadratics/index.html"),
        "monic-cubics": page("demos/monic-cubics/index.html"),
      },
    },
  },
});
