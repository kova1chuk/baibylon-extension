# Vocairo Extension

Chrome extension prototype built with React 18, TypeScript, Vite, Tailwind CSS
4, Recoil, and Supabase Auth.

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
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

For Google OAuth, add the Chrome extension redirect URL to both Google Cloud and
Supabase Auth:

```text
https://<extension-id>.chromiumapp.org
```

The extension ID is visible in `chrome://extensions` after loading `dist/`.

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
