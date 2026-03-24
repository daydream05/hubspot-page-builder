import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      cli: "bin/cli.ts",
    },
    format: ["esm"],
    target: "node20",
    sourcemap: true,
    clean: true,
    dts: false,
    splitting: false,
    shims: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
