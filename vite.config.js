import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist/lab",
    rollupOptions: { input: { lab: "index.html", benchmark: "benchmark.html", react: "react-smoke.html" } },
  },
  server: { host: "127.0.0.1", port: 4174, strictPort: true },
});
