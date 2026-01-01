# Quick Start Guide - Reusing Existing Supabase OAuth

If you already have Supabase OAuth set up for Next.js, React Native, or other apps, follow these quick steps.

> **Note**: If you can't find your OAuth credentials in Google Cloud Console but OAuth is working, see [VERIFY_OAUTH_SETUP.md](./VERIFY_OAUTH_SETUP.md) for troubleshooting.

## 1. Get Your Chrome Extension ID

1. Build the extension: `pnpm run build:extension`
2. Load it in Chrome: Go to `chrome://extensions/` → Enable Developer mode → Load unpacked → Select `dist` folder
3. Copy your Extension ID (looks like: `abcdefghijklmnopqrstuvwxyz123456`)

## 2. Add Redirect URL to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your existing project
3. Go to **APIs & Services** → **Credentials**
4. Click on your existing OAuth 2.0 Client ID (the one you use for Supabase)
5. Click **Edit**
6. Add to **Authorized redirect URIs**:
   ```
   https://YOUR_EXTENSION_ID.chromiumapp.org
   ```
   (Replace with your actual extension ID)
7. Click **Save**

## 3. Add Redirect URL to Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your existing project
3. Go to **Authentication** → **URL Configuration**
4. Add to **Redirect URLs**:
   ```
   https://YOUR_EXTENSION_ID.chromiumapp.org
   ```
   (Replace with your actual extension ID)
5. Click **Save**

## 4. Configure Extension Environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Use the same credentials from your Next.js/React Native apps!

## 5. Test It

1. Rebuild: `pnpm run build:extension`
2. Reload the extension in Chrome
3. Open the extension popup
4. Click "Continue with Google"
5. Sign in with Google
6. Reopen the extension - you should be logged in!

## That's It! 🎉

Your Chrome extension now uses the same Supabase project and Google OAuth as your other apps. Users can sign in with the same account across all platforms!

## Troubleshooting

**Issue**: "redirect_uri_mismatch" error
- Make sure you added `https://YOUR_EXTENSION_ID.chromiumapp.org` to both:
  - Google Cloud Console (Authorized redirect URIs)
  - Supabase Dashboard (Redirect URLs)

**Issue**: Extension ID changed after reload
- Extension IDs can change during development
- Update the redirect URLs with the new ID

**Issue**: Can't find extension ID
- Go to `chrome://extensions/`
- Enable "Developer mode"
- Your extension ID is shown under each extension

