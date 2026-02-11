# Supabase Authentication Setup for Vocairo

This guide will help you set up Supabase authentication for your Vocairo browser extension.

## Prerequisites

- A Supabase account and project
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Create a new project
3. Wait for the project to be set up (this may take a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon/public key**
3. Create a `.env` file in your project root with these values:

```bash
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 3: Set Up Database Tables

Run the following SQL in your Supabase SQL editor:

### User Profiles Table

```sql
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Text Processing Table

```sql
CREATE TABLE text_processing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  selected_text TEXT NOT NULL,
  source_url TEXT,
  processed_text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE text_processing ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own text processing" ON text_processing
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own text processing" ON text_processing
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own text processing" ON text_processing
  FOR UPDATE USING (auth.uid() = user_id);
```

## Step 4: Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, add your extension's URL (you can use `chrome-extension://your-extension-id`)
3. Under **Redirect URLs**, add:
   - `chrome-extension://your-extension-id/index.html`
   - `chrome-extension://your-extension-id/auth/callback`

### Setting Up Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Choose **Web application** as the application type
6. Add these authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - `chrome-extension://your-extension-id/index.html`
7. Copy the **Client ID** and **Client Secret**
8. In your Supabase dashboard, go to **Authentication** → **Providers**
9. Enable **Google** and enter your Google Client ID and Client Secret
10. Save the configuration

## Step 5: Test the Setup

1. Run `npm run dev` to start the development server
2. Open your extension and try to sign up/sign in
3. Check the browser console for any errors

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your Supabase project allows requests from your extension's origin
2. **Authentication Errors**: Verify your environment variables are correct
3. **Database Errors**: Ensure you've created the necessary tables and policies

### Environment Variables

Make sure your `.env` file is in the project root and contains:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon/public key

### Security Notes

- Never commit your `.env` file to version control
- The anon key is safe to use in client-side code
- Row Level Security (RLS) ensures users can only access their own data

## Next Steps

Once authentication is working, you can:

1. Customize the UI components in `src/components/auth/`
2. Add more user profile fields
3. Implement text processing history
4. Add user preferences and settings

## Support

If you encounter issues:

1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review the browser console for error messages
3. Verify your database schema and policies
