import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
// import tailwindcss from "@tailwindcss/vite";
// import { compression } from "vite-plugin-compression2";
// import { visualizer } from "rollup-plugin-visualizer";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routeFileIgnorePattern: "\\.test\\.tsx?$",
    }),
    react(),
    // tailwindcss(),
    // compression({ algorithm: "brotliCompress" }),
    // process.env.ANALYZE === "true" &&
    //   visualizer({
    //     filename: "dist/stats.html",
    //     gzipSize: true,
    //     brotliSize: true,
    //   }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: "hidden",
    cssMinify: "lightningcss",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-tanstack";
          }
        },
      },
    },
  },
});
