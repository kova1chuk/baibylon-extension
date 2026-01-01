# WordFlow Chrome Extension

This is a Chrome extension built with React, TypeScript, and Vite.

## Development

### Prerequisites

- Node.js (v16 or higher)
- pnpm (install with `npm install -g pnpm`)

### Tailwind CSS Setup

This project uses **Tailwind CSS v4.1.11** (latest version) for styling:

- **Configuration**: `tailwind.config.cjs` - Custom colors, fonts, and animations
- **Base Styles**: `src/index.css` - Tailwind directives and custom component classes
- **Build Process**: PostCSS with `@tailwindcss/postcss` plugin for optimal performance
- **Custom Components**: Reusable button and card classes with consistent styling
- **Performance**: Optimized CSS output (4.67 kB) with modern CSS features

The build system automatically scans all React components and generates optimized CSS using the latest Tailwind engine.

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Build the extension:

   ```bash
   pnpm run build:extension
   ```

3. For development with auto-rebuild:
   ```bash
   pnpm run watch:extension
   ```

### Loading the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` folder from your project
5. The extension should now appear in your extensions list

### Project Structure

- `public/manifest.json` - Chrome extension manifest
- `src/content.ts` - Content script that runs on web pages
- `src/background.ts` - Background service worker
- `src/App.tsx` - Main popup UI (React component with Tailwind CSS)
- `src/index.css` - Tailwind CSS base styles and custom components
- `tailwind.config.cjs` - Tailwind CSS configuration
- `postcss.config.cjs` - PostCSS configuration
- `vite.config.ts` - Build configuration for the extension

### Building

The build process creates:

- `dist/index.html` - Main popup HTML
- `dist/content.js` - Content script
- `dist/background.js` - Background service worker
- `dist/manifest.json` - Extension manifest

### Development Workflow

1. Make changes to your source files
2. Run `pnpm run build:extension` to rebuild
3. Go to `chrome://extensions/` and click the refresh button on your extension
4. Test your changes

### Permissions

The extension currently requests:

- `activeTab` - Access to the currently active tab
- `storage` - Access to Chrome's storage API

### Icons

Currently, the extension doesn't have custom icons. To add icons:

1. Create PNG icon files (16x16, 48x48, 128x128)
2. Place them in the `public/` folder
3. Update `public/manifest.json` to include the icon references

## Features

- **Modern Popup Interface**: Beautiful, responsive design with smooth animations
- **Content Script**: Runs on web pages for DOM interaction
- **Background Service Worker**: Handles background tasks and messaging
- **Message Passing**: Communication between popup, content script, and background
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Custom Components**: Reusable button and card components with consistent styling

## Troubleshooting

- If the extension doesn't load, check the console for errors
- Make sure all required files are present in the `dist` folder
- Verify the manifest.json is valid
- Check that the extension has the necessary permissions
