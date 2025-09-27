# SuperHOME Scheduler - Setup Guide

## Quick Fix for Login Loading Issue

After a database reset, follow these steps to get authentication working:

### 1. Start Supabase
```bash
supabase start
```

### 2. Reset and Initialize Database
```bash
# Option A: Use the setup script
node setup-db.js

# Option B: Manual reset
supabase db reset
```

### 3. Configure OAuth Providers (Required for Login)

#### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:54321/auth/v1/callback`
6. Copy Client ID and Client Secret

#### Add OAuth credentials to environment:
Create `.env` file in project root:
```bash
SUPABASE_AUTH_GOOGLE_CLIENT_ID=your_google_client_id_here
SUPABASE_AUTH_GOOGLE_SECRET_KEY=your_google_secret_key_here
```

#### Configure in Supabase Studio:
1. Open http://localhost:54323
2. Go to Authentication > Providers
3. Enable Google provider
4. Add your Client ID and Secret

### 4. Start Development Server
```bash
cd app
npm run dev
```

## What Was Fixed

### Authentication Issues Resolved:
- **Infinite Loading**: Auth service now properly initializes even with database issues
- **Database Connection**: Added connection checks and fallback profiles
- **Error Handling**: Better error messages for missing tables or connection issues
- **OAuth Configuration**: Clear setup instructions for Google/Facebook login

### Key Improvements:
1. **Database Initialization Check**: App now verifies database tables exist before proceeding
2. **Fallback Authentication**: If database tables are missing, auth still works with fallback profiles
3. **Better Error Messages**: Clear feedback when Supabase isn't running or tables are missing
4. **Graceful Degradation**: App continues to function even with partial database issues

### Files Modified:
- `app/src/lib/auth.ts` - Enhanced error handling and fallback profiles
- `app/src/App.svelte` - Added database connection checks
- `app/src/lib/dbInit.ts` - New database initialization utilities
- `setup-db.js` - Database setup automation script

## Troubleshooting

### Login Still Loading?
1. Check browser console for errors
2. Verify Supabase is running: `supabase status`
3. Check database tables exist in Supabase Studio
4. Ensure OAuth providers are configured

### Database Connection Errors?
1. Run `supabase start` 
2. Run `node setup-db.js` to reset database
3. Check `supabase/config.toml` configuration

### OAuth Not Working?
1. Verify OAuth credentials in `.env` file
2. Check redirect URIs match exactly
3. Enable providers in Supabase Studio
4. Test with incognito/private browsing

## Architecture Overview

### Authentication Flow:
1. **App Start**: Check database connection and table existence
2. **Auth Init**: Initialize Supabase auth with fallback handling
3. **OAuth Login**: Redirect to provider, handle callback
4. **Profile Creation**: Create/fetch user profile with fallbacks
5. **Dashboard**: Load user-specific data with pull-to-refresh

### Security Features:
- Row-level security on all tables
- Admin privilege checking
- Secure OAuth implementation
- Type-safe database operations

### Mobile-First Design:
- Responsive layouts for all screen sizes
- Touch-friendly interactions
- Pull-to-refresh functionality
- Optimized for mobile performance
