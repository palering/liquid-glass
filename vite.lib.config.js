import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist/lib",
    lib: {
      entry: { core: "src/index.js", react: "src/react.js" },
      formats: ["es"],
    },
    rollupOptions: { external: ["react"] },
    copyPublicDir: false,
  },
});
