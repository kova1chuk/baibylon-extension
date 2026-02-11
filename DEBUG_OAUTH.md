# Debug OAuth Redirect Issues

If OAuth is not redirecting after authentication, follow these debugging steps:

## Step 1: Check Background Script Logs

1. Go to `chrome://extensions/`
2. Find your extension
3. Click **"service worker"** or **"background page"** link (next to "Inspect views")
4. This opens the background script console
5. Try OAuth again and watch for logs

Look for:
- `"Vocairo: Detected chromiumapp.org URL"`
- `"Vocairo: OAuth redirect detected"`
- `"Vocairo: Handling OAuth callback"`
- Any error messages

## Step 2: Verify Redirect URL

The redirect URL should be:
```
https://kiogdmfbgfbchngigkhfadpogfneapgi.chromiumapp.org
```

Check:
1. **In Supabase Dashboard**:
   - Go to Authentication → URL Configuration
   - Make sure `https://kiogdmfbgfbchngigkhfadpogfneapgi.chromiumapp.org` is in Redirect URLs
   - No trailing slash!

2. **In Google Cloud Console**:
   - Go to APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID
   - Make sure `https://kiogdmfbgfbchngigkhfadpogfneapgi.chromiumapp.org` is in Authorized redirect URIs
   - No trailing slash!

## Step 3: Check What URL Supabase Redirects To

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try OAuth again
4. Look for the redirect request to `chromiumapp.org`
5. Check the full URL - does it match exactly?

## Step 4: Verify Background Script is Running

1. Open background script console (see Step 1)
2. You should see: `"Vocairo Extension: Background service worker loaded"`
3. If not, the background script isn't loading

## Step 5: Check for Common Issues

### Issue: Redirect URL Has Trailing Slash

**Wrong**: `https://kiogdmfbgfbchngigkhfadpogfneapgi.chromiumapp.org/`
**Correct**: `https://kiogdmfbgfbchngigkhfadpogfneapgi.chromiumapp.org`

### Issue: Extension ID Changed

Extension IDs can change during development. Check your current ID:
1. Go to `chrome://extensions/`
2. Find your extension
3. Copy the ID shown
4. Update redirect URLs if it changed

### Issue: Background Script Not Catching Redirect

The background script listens for tab updates. If it's not catching:
1. Make sure `tabs` permission is in manifest.json ✅ (already added)
2. Check background script console for errors
3. Try reloading the extension

### Issue: Supabase Credentials Not Set

The background script needs Supabase credentials. Check:
1. Open extension popup
2. Check browser console for errors
3. The popup should send credentials to background script on load

## Step 6: Manual Test

1. Open a new tab
2. Navigate to: `https://kiogdmfbgfbchngigkhfadpogfneapgi.chromiumapp.org#access_token=test&refresh_token=test`
3. Check background script console - does it detect this?

## Step 7: Check Supabase Redirect

Supabase might be redirecting with query parameters instead of hash. The code handles both, but check:
- Hash: `#access_token=...&refresh_token=...`
- Query: `?access_token=...&refresh_token=...`

## Still Not Working?

1. **Check Supabase logs**:
   - Go to Supabase Dashboard → Logs
   - Look for OAuth-related errors

2. **Check browser console** (popup):
   - Open extension popup
   - Right-click → Inspect
   - Check for errors

3. **Verify manifest permissions**:
   - `identity` ✅
   - `tabs` ✅
   - `storage` ✅
   - `host_permissions` for `https://*.supabase.co/*` ✅

4. **Try rebuilding**:
   ```bash
   pnpm run build:extension
   ```
   Then reload the extension

## Expected Flow

1. User clicks "Continue with Google"
2. New tab opens with Google OAuth
3. User signs in
4. Google redirects to Supabase
5. Supabase redirects to `https://kiogdmfbgfbchngigkhfadpogfneapgi.chromiumapp.org#access_token=...`
6. Background script detects the redirect
7. Background script extracts tokens
8. Background script saves session
9. Tab closes
10. User reopens extension → logged in

If step 5-6 isn't happening, that's the issue!

