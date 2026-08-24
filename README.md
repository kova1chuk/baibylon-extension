# Vocairo Extension

Chrome extension prototype built with React 18, TypeScript, Vite, Tailwind CSS
4, and the Vocairo device-auth API.

## Local Development

```bash
cd /Users/oleks/Work/Vocairo/vocairo-extension
pnpm install
pnpm dev
```

Build the loadable Chrome extension:

```bash
pnpm build:extension
```

Then open `chrome://extensions`, enable Developer mode, choose "Load unpacked",
and select `dist/`.

## Environment

```env
VITE_VOCAIRO_API_URL=http://localhost:3006
```

`VITE_VOCAIRO_API_URL` controls both API requests and the generated Chrome host
permission. If omitted, the production API remains the backward-compatible default.

## Commands

```bash
pnpm build
pnpm build:extension
pnpm watch:extension
pnpm typecheck
pnpm lint
pnpm format:check
```

## Structure

```text
public/manifest.json
src/App.tsx
src/background.ts
src/content.ts
src/main.tsx
src/global.css
```

Generated output in `dist/` is disposable.
