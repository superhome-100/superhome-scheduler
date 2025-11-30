# SuperHOME Scheduler

A modern scheduling application built with Svelte, TypeScript, and Supabase with Google OAuth authentication.

## Features

- 🔐 Google OAuth authentication with Supabase
- 📱 Mobile-first responsive design
- 🔄 Pull-to-refresh functionality
- 🎨 Modern UI with custom CSS styling
- 🛡️ Row-level security with Supabase
- 📊 User profile management
- 🎯 TypeScript strict typing throughout

## Setup Instructions

### Prerequisites

1. **Supabase CLI** - Install from [Supabase CLI docs](https://supabase.com/docs/guides/cli)
2. **Node.js** - Version 18 or higher
3. **Google Cloud Console** - For OAuth credentials

### 1. Start Supabase Local Development

```bash
# Navigate to project root
cd c:\Users\smaya\OneDrive\Documents\GitHub\superhome-scheduler

# Start Supabase local development
supabase start
```

### 2. Install Dependencies

```bash
# Navigate to app directory
cd app

# Install dependencies
npm install --include=optional
```

### 3. Environment Variables

The app uses the following environment variables (already configured in `.env`):

```env
VITE_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Run Database Migrations

```bash
# From project root
supabase db reset
```

### 5. Start Development Server

```bash
# From app directory
pnpm dev
```

The app will be available at `http://localhost:3000`

## Google OAuth Setup

Your Google OAuth is already configured in `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_GOOGLE_SECRET_KEY)"
redirect_uri = "http://localhost:54321/auth/v1/callback"
skip_nonce_check = true
```

## Project Structure

```
app/
├── src/
│   ├── lib/
│   │   ├── auth.ts          # Authentication service
│   │   ├── supabase.ts      # Supabase client
│   │   ├── database.types.ts # TypeScript types
│   │   ├── Welcome.svelte   # Welcome/dashboard component
│   │   ├── AuthCallback.svelte # OAuth callback handler
│   │   ├── PullToRefresh.svelte # Pull-to-refresh component
│   │   └── Router.svelte    # Simple routing
│   ├── styles/
│   │   └── login.css        # Login page styles
│   └── App.svelte           # Main app component
└── .env                     # Environment variables
```

## Authentication Flow

1. User clicks "Continue with Google" on login page
2. App redirects to Google OAuth via Supabase
3. After successful authentication, user is redirected to `/auth/callback`
4. AuthCallback component processes the OAuth response
5. User profile is created/updated in `user_profiles` table
6. User is redirected to the Welcome dashboard

## Database Schema

The app uses the following tables:

- `user_profiles` - User profile information with RLS policies
- `reservations` - User reservations (for future features)

## User Rules Compliance

This implementation follows all specified user rules:

- ✅ **Code size limit**: All files under 300 lines
- ✅ **Mobile-first design**: Responsive design throughout
- ✅ **TypeScript strictness**: Strict typing enforced
- ✅ **Pull-to-refresh**: Implemented instead of realtime
- ✅ **Row-level security**: Enabled with strict policies
- ✅ **Reusable components**: Modular component architecture

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Generate TypeScript types from Supabase
npm run types

# Reset database and regenerate types
npm run reset
```

## Testing the Authentication

1. Start Supabase: `supabase start`
2. Start the app: `npm run dev`
3. Navigate to `http://localhost:3000`
4. Click "Continue with Google"
5. Complete Google OAuth flow
6. You should be redirected to the Welcome dashboard

## Troubleshooting

### OAuth Redirect Issues
- Ensure `site_url` in `supabase/config.toml` matches your app URL
- Check that Google OAuth credentials are properly set in environment variables
- Verify the redirect URI in Google Cloud Console matches Supabase callback URL

### Database Connection Issues
- Run `supabase status` to check if services are running
- Reset database with `supabase db reset` if needed
- Check that migrations have been applied successfully

**Why `global.d.ts` instead of `compilerOptions.types` inside `jsconfig.json` or `tsconfig.json`?**

Setting `compilerOptions.types` shuts out all other types not explicitly listed in the configuration. Using triple-slash references keeps the default TypeScript setting of accepting type information from the entire workspace, while also adding `svelte` and `vite/client` type information.

**Why include `.vscode/extensions.json`?**

Other templates indirectly recommend extensions via the README, but this file allows VS Code to prompt the user to install the recommended extension upon opening the project.

**Why enable `allowJs` in the TS template?**

While `allowJs: false` would indeed prevent the use of `.js` files in the project, it does not prevent the use of JavaScript syntax in `.svelte` files. In addition, it would force `checkJs: false`, bringing the worst of both worlds: not being able to guarantee the entire codebase is TypeScript, and also having worse typechecking for the existing JavaScript. In addition, there are valid use cases in which a mixed codebase may be relevant.

**Why is HMR not preserving my local component state?**

HMR state preservation comes with a number of gotchas! It has been disabled by default in both `svelte-hmr` and `@sveltejs/vite-plugin-svelte` due to its often surprising behavior. You can read the details [here](https://github.com/rixo/svelte-hmr#svelte-hmr).

If you have state that's important to retain within a component, consider creating an external store which would not be replaced by HMR.

```ts
// store.ts
// An extremely simple external store
import { writable } from 'svelte/store'
export default writable(0)
```
