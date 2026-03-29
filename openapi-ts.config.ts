import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: [
    "../allinone/api/memos.gen.yaml",
    "https://raw.githubusercontent.com/cloudcarver/anclax/refs/tags/v0.9.1/api/v1.yaml",
  ],
  output: [
    {
      path: "./src/api-gen",
      clean: true,
      preferExportAll: true,
    },
    {
      path: "./src/api-anclax",
      clean: true,
      preferExportAll: true,
    },
  ],
  plugins: [
    {
      name: "@hey-api/client-ofetch",
      runtimeConfigPath: "@/lib/client.config",
      exportFromIndex: true,
    },
    {
      name: "@tanstack/react-query",
    },
    {
      name: "zod",
      responses: false,
    },
    {
      name: "@hey-api/sdk",
      validator: true,
    },
  ],
});
