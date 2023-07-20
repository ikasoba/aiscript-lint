import { globby as glob, globby } from "globby";
import { context } from "esbuild";

export default await context({
  entryPoints: ["src/index.ts", "src/cli.ts"],
  bundle: true,
  outdir: "./src/",
  format: "esm",
  platform: "node",
  loader: {
    ".css": "text",
  },
});
