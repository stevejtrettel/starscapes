import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const page = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: page("index.html"),
        explorer: page("demos/explorer/index.html"),
      },
    },
  },
});
