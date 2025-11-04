# Google OAuth Setup Guide

## Enable Google OAuth in Supabase

The error "Unsupported provider: provider is not enabled" means Google OAuth needs to be configured in your Supabase dashboard.

### Steps to Enable Google OAuth:

1. **Go to Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard
   - Select your project

2. **Open Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Click on "Providers" tab

3. **Enable Google Provider**
   - Find "Google" in the list of providers
   - Toggle it to "Enabled"

4. **Configure Google OAuth Credentials**
   - You'll need to add your Google OAuth credentials:
     - **Client ID**: Your Google OAuth Client ID (from your `.env` file: `GOOGLE_CLIENT_ID`)
     - **Client Secret**: Your Google OAuth Client Secret (from your `.env` file: `GOOGLE_CLIENT_SECRET`)

5. **Set Redirect URL in Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to your OAuth 2.0 Client ID
   - Add authorized redirect URI:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - Replace `<your-project-ref>` with your Supabase project reference ID
   - You can find your project reference in Supabase Dashboard > Settings > API

6. **Save and Test**
   - Click "Save" in Supabase
   - Try signing in with Google again

### Important Notes:

- The redirect URI format is: `https://<project-ref>.supabase.co/auth/v1/callback`
- Make sure your Google OAuth credentials are correct
- The redirect URI in Google Cloud Console must match exactly
- For local development, you might also need to add: `http://localhost:3000/auth/callback`

### Troubleshooting:

- **Still getting "provider is not enabled" error?**
  - Make sure you clicked "Save" after enabling Google in Supabase
  - Try refreshing the page
  - Check that the provider toggle is actually enabled (green/on)

- **Redirect URI mismatch error?**
  - Verify the redirect URI in Google Cloud Console matches the Supabase callback URL
  - Check that your project reference ID is correct

- **OAuth consent screen issues?**
  - Make sure your Google Cloud project has the OAuth consent screen configured
  - Required scopes: `email`, `profile`, `openid`

