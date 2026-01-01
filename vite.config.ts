import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync } from "fs";

export default defineConfig({
  plugins: [
    react({
      // Use automatic JSX runtime to ensure React is properly initialized
      jsxRuntime: "automatic",
    }),
    // Plugin to copy manifest.json after build
    {
      name: "copy-manifest",
      closeBundle() {
        copyFileSync(
          resolve(__dirname, "public/manifest.json"),
          resolve(__dirname, "dist/manifest.json")
        );
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        content: resolve(__dirname, "src/content.ts"),
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: "[name].[ext]",
        // Manual chunks - but keep React in main bundle to avoid loading issues
        manualChunks: (id) => {
          // Don't split React - keep it in the main bundle to avoid multiple instances
          // Only split other large vendor dependencies
          if (
            id.includes("node_modules") &&
            !id.includes("react") &&
            !id.includes("react-dom") &&
            !id.includes("scheduler")
          ) {
            return "vendor";
          }
        },
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    // Ensure React is only bundled once
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
    // Deduplicate React to ensure only one instance
    dedupe: ["react", "react-dom"],
    // Preserve symlinks to avoid duplicate modules
    preserveSymlinks: false,
  },
  optimizeDeps: {
    // Ensure React is only loaded once during dev
    include: ["react", "react-dom"],
    // Force pre-bundling of React
    force: true,
  },
});
