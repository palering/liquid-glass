import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist/lib",
    lib: {
      entry: { core: "src/index.ts", react: "src/react.ts" },
      formats: ["es"],
    },
    rollupOptions: { external: ["react"] },
    copyPublicDir: false,
  },
});
