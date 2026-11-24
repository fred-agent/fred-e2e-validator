// Use an absolute asset base so embedded pages also work without a trailing slash.
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { APP_ID } from "../app-id.ts";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: `/apps/${APP_ID}/`,
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
});
