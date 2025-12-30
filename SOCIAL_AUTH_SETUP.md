# Social Authentication Setup Guide

Your application now supports social login with Google, Facebook, and GitHub. Users can sign in with just a few clicks using their existing social media accounts.

## What's Been Added

The authentication modal now includes:
- **Google Sign-In** - Most popular, fastest signup
- **Facebook Sign-In** - Wide user base, easy access
- **GitHub Sign-In** - Perfect for tech-savvy users

## Required: Configure OAuth Providers in Supabase

To activate social login, you need to enable and configure each provider in your Supabase dashboard. Follow these steps:

### 1. Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**

### 2. Configure Google Authentication

#### A. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
7. Copy the **Client ID** and **Client Secret**

#### B. Enable in Supabase

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Enable the provider
4. Paste your **Client ID** and **Client Secret**
5. Click **Save**

### 3. Configure Facebook Authentication

#### A. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click **My Apps** → **Create App**
3. Select **Consumer** as the app type
4. Fill in app details and create the app
5. In the dashboard, go to **Settings** → **Basic**
6. Copy the **App ID** and **App Secret**
7. Add **Facebook Login** product to your app
8. In **Facebook Login** → **Settings**, add Valid OAuth Redirect URIs:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

#### B. Enable in Supabase

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Facebook** and click to expand
3. Enable the provider
4. Paste your **App ID** as Client ID
5. Paste your **App Secret** as Client Secret
6. Click **Save**

### 4. Configure GitHub Authentication

#### A. Create GitHub OAuth App

1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in the application details:
   - **Application name**: Your app name
   - **Homepage URL**: Your app URL
   - **Authorization callback URL**:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy the **Client Secret**

#### B. Enable in Supabase

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **GitHub** and click to expand
3. Enable the provider
4. Paste your **Client ID** and **Client Secret**
5. Click **Save**

## Testing Social Login

Once you've configured at least one provider:

1. Open your application
2. Click **Sign In** or **Sign Up**
3. Click on one of the social login buttons
4. You'll be redirected to the provider's login page
5. Authorize the application
6. You'll be redirected back and automatically logged in

## How It Works

When users sign in with a social provider:

1. They click a social login button (Google, Facebook, or GitHub)
2. They're redirected to the provider's authorization page
3. After authorizing, they're redirected back to your app
4. Supabase automatically creates a user account and profile
5. The user is logged in and can start using the app immediately

## Profile Information

Social logins automatically populate user profiles with:
- **Username**: Extracted from their social account
- **Display Name**: From their social profile
- **Avatar URL**: Profile picture from their social account
- **Email**: Verified email from their social account

## Benefits

- **Faster Signup**: Users can sign up in seconds without filling forms
- **Better Security**: No passwords to remember or manage
- **Higher Conversion**: Reduces friction in the signup process
- **Verified Emails**: Social providers verify email addresses
- **Trust**: Users trust familiar login methods

## Privacy & Security

- Only basic profile information is requested
- Users control what information they share
- All authentication is handled securely by Supabase
- OAuth tokens are never exposed to your application
- Industry-standard OAuth 2.0 protocol

## Troubleshooting

### "Provider not enabled" error
- Make sure you've enabled and saved the provider in Supabase dashboard
- Check that you've entered the correct Client ID and Client Secret

### Redirect errors
- Verify the callback URL matches exactly: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Check that the callback URL is added in both the provider's settings and Supabase

### Profile not created
- The profile trigger should automatically create profiles for OAuth users
- Check the Supabase logs for any errors
- Verify the `handle_new_user()` function exists in your database

## Next Steps

1. Configure at least one OAuth provider (Google is recommended as it's most popular)
2. Test the login flow to ensure it works smoothly
3. Consider adding more providers based on your audience
4. Monitor signup conversion rates to see the impact

Need help? Check the [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/social-login) for more details.
