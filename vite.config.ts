import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const generatedIgnorePatterns = [
  ".agents/**",
  "src/api-gen/**",
  "src/api-anclax/**",
  "src/routeTree.gen.ts",
];

const config = defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  resolve: {
    tsconfigPaths: true,
  },
  lint: {
    ignorePatterns: generatedIgnorePatterns,
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    ignorePatterns: generatedIgnorePatterns,
  },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
});

export default config;
