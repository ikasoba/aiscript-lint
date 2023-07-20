import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/aiscript-lint/",
  server: {
    fs: {
      strict: false,
    },
  },
});
