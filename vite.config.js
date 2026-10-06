import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    outDir: "dist/lab",
    rollupOptions: { input: { lab: "index.html", benchmark: "benchmark.html", react: "react-smoke.html" } },
  },
  server: { host: "127.0.0.1", port: 4174, strictPort: true },
});
