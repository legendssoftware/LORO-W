# LORO Web

Minimal web app for LORO with Clerk auth and ATT (Attendance) button.

## Setup

Work from this directory (`web/`) so dependencies and the Next.js dev server resolve correctly (the repo root has no `node_modules` for this app).

1. Copy `.env.local.example` to `.env.local`
2. Use the **same** Clerk **application** as the Nest API and mobile app:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = apk `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (production: `clerk.loro.co.za`)
   - `CLERK_SECRET_KEY` = same instance’s secret as in `server/.env` (from [Clerk Dashboard](https://dashboard.clerk.com) → API Keys)
   - `NEXT_PUBLIC_API_URL` = backend URL (e.g. `http://localhost:4400`)

   Do **not** use a different Clerk project’s publishable key (for example template `*.clerk.accounts.dev` keys). If the JWT `kid` in errors does not match the API’s JWKS, keys are misaligned.

3. After changing Clerk env vars, **sign out** (or clear site data for this origin) and sign in again, then **restart** Next and Nest so nothing caches old keys.

4. Install and run the dev server (from `web/`):
   ```bash
   cd web
   npm install
   npm run dev
   ```
   From the monorepo root you can use: `npm install --prefix web && npm run dev --prefix web`.

## Routes

- `/` - Landing (redirects to dashboard if signed in)
- `/onboarding` - 5-slide onboarding
- `/sign-in` - Clerk sign-in
- `/sign-up` - Clerk sign-up
- `/dashboard` - ATT button (employees only)

## Session

Session expiration is configured in the Clerk Dashboard (Inactivity timeout, Max lifetime).
