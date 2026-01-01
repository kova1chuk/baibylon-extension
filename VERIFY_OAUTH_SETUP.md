# Verify OAuth Setup - Troubleshooting Guide

If OAuth is working but you can't find the credentials in Google Cloud Console, here's how to verify and fix it.

## Why OAuth Might Work Without Visible Credentials

1. **Credentials exist in a different Google Cloud project** - You might have multiple projects
2. **Credentials are in a different Google account** - Check all your Google accounts
3. **Supabase is using cached credentials** - Old credentials might still be active
4. **Multiple OAuth clients exist** - You might be looking at the wrong one

## Step 1: Find Your Current OAuth Client ID

### From Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Click on **Google** provider
5. Look at the **Client ID (for OAuth)** field
6. Copy this Client ID

### From Your Next.js/React Native Apps

Check your existing apps' configuration:
- Look in your `.env` files
- Check your Supabase configuration
- The Client ID should be the same across all apps

## Step 2: Find the Client ID in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Check **all your projects** (not just one):
   - Click the project dropdown at the top
   - Check each project
3. In each project, go to **APIs & Services** → **Credentials**
4. Look for an OAuth 2.0 Client ID that matches the one from Supabase
5. Check the **Authorized redirect URIs**:
   - Should include: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - May include: Your Next.js app URLs
   - May include: Your React Native redirect URLs

## Step 3: Verify the Setup

### Option A: Credentials Found ✅

If you found the Client ID:
1. **Add Chrome Extension Redirect URL**:
   - Click **Edit** on the OAuth client
   - Add to **Authorized redirect URIs**:
     ```
     https://YOUR_EXTENSION_ID.chromiumapp.org
     ```
   - Click **Save**

2. **Verify in Supabase**:
   - The Client ID in Supabase should match
   - Add Chrome extension redirect URL to Supabase too

### Option B: Credentials Not Found ❌

If you can't find the Client ID:

1. **Check if OAuth is actually working**:
   - Try signing in with Google in your Next.js/React Native apps
   - If it works, credentials definitely exist somewhere

2. **Check all Google accounts**:
   - You might be logged into a different Google account
   - Try logging out and logging in with different accounts

3. **Check organization/workspace accounts**:
   - If you're using Google Workspace, check your organization's Cloud Console

4. **Create new credentials** (if needed):
   - If you truly can't find them, create new OAuth credentials
   - Update Supabase with the new Client ID and Secret
   - Update all your apps to use the new credentials

## Step 4: Clean Up Orphaned Credentials

If you have multiple OAuth clients and want to clean up:

1. **Identify which one is active**:
   - Check which Client ID is in Supabase
   - Test OAuth in your apps to confirm it works

2. **Delete unused clients** (optional):
   - Only delete clients you're 100% sure are not in use
   - Keep a backup/note of the Client ID before deleting

3. **Consolidate to one client**:
   - Use one OAuth client for all your apps (Next.js, React Native, Chrome Extension)
   - Add all redirect URIs to that one client

## Step 5: Add Chrome Extension to Existing Setup

Once you've found your existing OAuth client:

1. **Get your Chrome Extension ID**:
   ```bash
   # Build and load extension, then get ID from chrome://extensions/
   ```

2. **Add redirect URL to Google Cloud Console**:
   ```
   https://YOUR_EXTENSION_ID.chromiumapp.org
   ```

3. **Add redirect URL to Supabase**:
   - Go to **Authentication** → **URL Configuration**
   - Add: `https://YOUR_EXTENSION_ID.chromiumapp.org`

4. **Test**:
   - The extension should now work with your existing OAuth setup

## Common Scenarios

### Scenario 1: OAuth Works But Can't Find Credentials

**Solution**: 
- Check all Google Cloud projects
- Check all Google accounts
- The credentials must exist somewhere if OAuth works

### Scenario 2: Multiple OAuth Clients Exist

**Solution**:
- Find which one Supabase is using (check Supabase dashboard)
- Add Chrome extension redirect URL to that specific client
- Consider consolidating to one client for easier management

### Scenario 3: Credentials Were Deleted But OAuth Still Works

**This shouldn't happen** - If OAuth works, credentials exist. You might be:
- Looking in the wrong project
- Looking in the wrong Google account
- The credentials might be in a service account or organization account

### Scenario 4: Want to Use Different Credentials

**Solution**:
1. Create new OAuth client in Google Cloud Console
2. Update Supabase with new Client ID and Secret
3. Update all your apps (Next.js, React Native, Chrome Extension) to use new credentials
4. Test OAuth in all apps

## Quick Checklist

- [ ] Found the Client ID in Supabase dashboard
- [ ] Located the OAuth client in Google Cloud Console
- [ ] Verified redirect URIs include Supabase callback URL
- [ ] Added Chrome extension redirect URL to Google Cloud Console
- [ ] Added Chrome extension redirect URL to Supabase
- [ ] Tested OAuth in all apps (Next.js, React Native, Chrome Extension)

## Need Help?

If you still can't find the credentials but OAuth is working:

1. **Check Supabase logs**:
   - Go to Supabase Dashboard → Logs
   - Look for OAuth-related errors or info

2. **Check browser network tab**:
   - When OAuth redirects happen, check the network requests
   - Look for the `client_id` parameter in OAuth URLs

3. **Contact support**:
   - Supabase support can help identify which Client ID is configured
   - Google Cloud support can help locate credentials

## Best Practice: Document Your Setup

Keep a record of:
- Which Google Cloud project you're using
- Which OAuth Client ID is active
- All redirect URIs configured
- Which apps use which credentials

This makes it easier to add new apps (like the Chrome extension) later!

