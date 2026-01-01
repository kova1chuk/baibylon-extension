#!/bin/bash

echo "🚀 Starting WordFlow Extension development..."

# Build the extension
echo "📦 Building extension..."
pnpm run build:extension

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Open Chrome and go to chrome://extensions/"
    echo "2. Enable 'Developer mode' (top right toggle)"
    echo "3. Click 'Load unpacked'"
    echo "4. Select the 'dist' folder from this project"
    echo "5. Your extension should now appear!"
    echo ""
    echo "🔄 To rebuild after changes, run: pnpm run build:extension"
    echo "👀 For auto-rebuild during development, run: pnpm run watch:extension"
else
    echo "❌ Build failed!"
    exit 1
fi
