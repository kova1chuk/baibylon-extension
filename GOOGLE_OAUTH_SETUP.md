# Google OAuth Setup for WordFlow Extension

This guide will help you set up Google OAuth authentication with Supabase for your Chrome extension.

> **Note**: This implementation uses the improved OAuth flow for Chrome extensions, based on [this approach](https://beastx.ro/supabase-login-with-oauth-in-chrome-extensions) which opens OAuth in a new tab instead of the popup. This prevents the popup from closing unexpectedly during authentication.

## Prerequisites

- A Supabase account and project (you can reuse your existing one)
- A Google Cloud Console account with OAuth credentials (you can reuse your existing ones)
- Your Chrome extension ID (get it after loading the extension)

## Quick Setup (If You Already Have Supabase OAuth)

If you already have Supabase OAuth configured for Next.js, React Native, or other apps, you just need to:

1. **Get your Chrome Extension ID** (see Step 1 below)
2. **Add the Chrome extension redirect URL to Supabase** (see Step 4 below)
3. **Add the Chrome extension redirect URL to Google Cloud Console** (see Step 2 below, skip creating new credentials)

That's it! You can reuse your existing Supabase project and Google OAuth credentials.

## Step 1: Get Your Chrome Extension ID

1. Load your extension in Chrome (Developer mode → Load unpacked)
2. Go to `chrome://extensions/`
3. Find your extension and copy the **Extension ID** (looks like: `abcdefghijklmnopqrstuvwxyz123456`)
4. Your extension URL will be: `chrome-extension://YOUR_EXTENSION_ID/index.html`

## Step 2: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**:

   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API" or "Google Identity Services"
   - Click **Enable**

4. Create OAuth 2.0 Credentials:

   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - If prompted, configure the OAuth consent screen first:
     - Choose **External** (unless you have a Google Workspace)
     - Fill in the required fields:
       - App name: `WordFlow Extension`
       - User support email: Your email
       - Developer contact: Your email
     - Add scopes: `email`, `profile`, `openid`
     - Add test users (if in testing mode)
     - Save and continue

5. Create OAuth Client:

   - Application type: **Web application**
   - Name: `WordFlow Extension`
   - **Authorized JavaScript origins**:

     ```
     https://YOUR_PROJECT_REF.supabase.co
     ```

     (Replace `YOUR_PROJECT_REF` with your Supabase project reference)

   - **Authorized redirect URIs** (add all of these):

     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     https://YOUR_EXTENSION_ID.chromiumapp.org
     ```

     (Replace both placeholders with your actual values)

     **Important**: The Chrome extension redirect URL format is `https://YOUR_EXTENSION_ID.chromiumapp.org` (not `chrome-extension://`). You can get this URL programmatically using `chrome.identity.getRedirectURL()` in your code.

6. Click **Create**
7. Copy the **Client ID** and **Client Secret** (you'll need these for Supabase)

## Step 3: Configure Supabase (If Not Already Done)

If you already have Google OAuth configured in Supabase for your Next.js/React Native apps, **you can skip this step** - your existing configuration will work!

If you need to set it up:

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project (the same one you use for your other apps)
3. Go to **Authentication** → **Providers**
4. Find **Google** and click to configure
5. Enable Google provider (if not already enabled)
6. Enter your Google OAuth credentials:
   - **Client ID (for OAuth)**: Your existing Google Client ID
   - **Client Secret (for OAuth)**: Your existing Google Client Secret
7. Click **Save**

## Step 4: Configure Supabase Redirect URLs

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:

   ```
   https://YOUR_EXTENSION_ID.chromiumapp.org
   ```

   (Replace `YOUR_EXTENSION_ID` with your actual extension ID)

   **Note**: This is the special Chrome extension redirect URL format. You can also get it programmatically in your code using `chrome.identity.getRedirectURL()`.

3. **Site URL** can be:

   ```
   https://YOUR_EXTENSION_ID.chromiumapp.org
   ```

   Or leave it as your default Supabase URL.

4. Click **Save**

## Step 5: Configure Your Extension

The code is already configured to use Google OAuth. You just need to add your Supabase credentials to the `.env` file:

1. Create a `.env` file in the project root (or update your existing one)
2. Add your Supabase credentials (the same ones you use for your Next.js/React Native apps):

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note**: Use the same Supabase project URL and anon key that you use for your other apps. This allows users to share the same account across all your applications!

## Step 6: Test the Setup

1. Build your extension:

   ```bash
   pnpm run build:extension
   ```

2. Load the extension in Chrome
3. Open the extension popup
4. Click "Continue with Google"
5. A new tab will open with Google's sign-in page
6. After signing in, the tab will automatically close
7. **Reopen the extension popup** - you should now be logged in!

### How It Works

The OAuth flow works as follows:

1. User clicks "Continue with Google" in the extension popup
2. Extension opens a new tab with Supabase's OAuth endpoint
3. Background script listens for the redirect to `https://YOUR_EXTENSION_ID.chromiumapp.org`
4. Background script extracts tokens from the URL and saves the session to Chrome storage
5. The OAuth tab is automatically closed
6. User reopens the extension popup and is automatically logged in

## Troubleshooting

### Issue: "redirect_uri_mismatch" Error

**Solution**: Make sure you've added the correct redirect URIs in both:

- Google Cloud Console (Authorized redirect URIs)
- Supabase Dashboard (Redirect URLs)

The format must match exactly:

- `https://YOUR_EXTENSION_ID.chromiumapp.org` (not `chrome-extension://`)

You can get this URL by calling `chrome.identity.getRedirectURL()` in your extension code.

### Issue: OAuth Opens in New Tab But Doesn't Redirect Back

**Solution**:

1. Check that your extension ID is correct in all configurations
2. Make sure the redirect URL in Supabase matches exactly
3. Check browser console for any errors

### Issue: "Invalid Client" Error

**Solution**:

1. Verify your Google Client ID and Secret are correct in Supabase
2. Make sure you copied the full Client ID (not truncated)
3. Check that the OAuth consent screen is properly configured

### Issue: Extension ID Changes After Reload

**Solution**:

- Extension IDs can change during development
- Update all redirect URIs with the new ID:
  - Google Cloud Console
  - Supabase Dashboard

### Issue: Session Not Persisting

**Solution**:

- The code uses Chrome storage for session persistence
- Make sure your extension has the `storage` permission in `manifest.json`
- Check that Chrome storage is working (not in incognito mode restrictions)

## Security Best Practices

1. **Never commit secrets**: Keep your `.env` file out of version control
2. **Use environment variables**: Store sensitive data in `.env` files
3. **Restrict redirect URIs**: Only add the exact URIs you need
4. **Enable RLS**: Make sure Row Level Security is enabled on your database tables
5. **Review OAuth scopes**: Only request the scopes you actually need

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Chrome Extension Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)

## Quick Checklist

- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 Client ID created
- [ ] Redirect URIs added in Google Console
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret added to Supabase
- [ ] Redirect URLs configured in Supabase
- [ ] Extension ID noted and used in all configurations
- [ ] Extension tested and working

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Check the Supabase logs in the dashboard
3. Verify all URLs match exactly (no trailing slashes, correct protocol)
4. Ensure your extension ID is correct everywhere
