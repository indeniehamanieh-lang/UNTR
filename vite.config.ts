import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: false }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  base: "./",
  build: { outDir: "dist", target: "es2020" },
});
