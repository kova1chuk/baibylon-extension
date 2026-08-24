import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolveApiBaseUrl } from "./src/lib/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "VITE_");
  const apiBaseUrl = resolveApiBaseUrl(env.VITE_VOCAIRO_API_URL);

  return {
    plugins: [
      react({
        // Use automatic JSX runtime to ensure React is properly initialized
        jsxRuntime: "automatic",
      }),
      // Plugin to copy manifest.json and icons after build
      {
        name: "copy-manifest",
        closeBundle() {
          const manifest = JSON.parse(
            readFileSync(resolve(__dirname, "public/manifest.json"), "utf8"),
          ) as Record<string, unknown>;
          manifest.host_permissions = [`${new URL(apiBaseUrl).origin}/*`];
          writeFileSync(
            resolve(__dirname, "dist/manifest.json"),
            `${JSON.stringify(manifest, null, 2)}\n`,
          );
          // Copy icon files
          const iconSizes = [16, 32, 48, 128];
          iconSizes.forEach((size) => {
            const iconPath = resolve(__dirname, `public/icon${size}.png`);
            const distIconPath = resolve(__dirname, `dist/icon${size}.png`);
            if (existsSync(iconPath)) {
              copyFileSync(iconPath, distIconPath);
            }
          });
        },
      },
    ],
    build: {
      rollupOptions: {
        // content.ts and background.ts are built separately (see vite.extension-script.config.ts):
        // MV3 loads them as classic scripts, and bundling them alongside the popup here would let
        // Rollup extract lib/api.ts into a shared chunk pulled in via a bare `import`, which Chrome
        // refuses to execute outside a module script.
        input: {
          main: resolve(__dirname, "index.html"),
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
  };
});
