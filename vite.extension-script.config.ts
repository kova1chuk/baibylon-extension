import { defineConfig } from "vite";
import { resolve } from "path";

const entry = process.env.VOCAIRO_EXTENSION_ENTRY;
if (entry !== "content" && entry !== "background" && entry !== "youtubeBridge") {
  throw new Error(
    "Set VOCAIRO_EXTENSION_ENTRY=content|background|youtubeBridge before building with this config.",
  );
}

// IIFE forbids code-splitting, so this build cannot silently regress into a shared chunk with
// the popup bundle: any future cross-import between entries makes Rollup fail loudly instead of
// emitting an `import` statement Chrome refuses to run as a classic script.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, `src/${entry}.ts`),
      formats: ["iife"],
      name: "VocairoExtensionScript",
      fileName: () => `${entry}.js`,
    },
  },
});
