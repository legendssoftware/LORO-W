# LORO Web

Minimal web app for LORO with Clerk auth and ATT (Attendance) button.

## Setup

1. Copy `.env.local.example` to `.env.local`
2. Use the **same** Clerk keys as the mobile app:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = apk `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY` = from [Clerk Dashboard](https://dashboard.clerk.com) (API Keys)
   - `NEXT_PUBLIC_API_URL` = backend URL (e.g. `http://localhost:4400`)

3. Run:
   ```bash
   yarn install
   yarn dev
   ```

## Routes

- `/` - Landing (redirects to dashboard if signed in)
- `/onboarding` - 5-slide onboarding
- `/sign-in` - Clerk sign-in
- `/sign-up` - Clerk sign-up
- `/dashboard` - ATT button (employees only)

## Session

Session expiration is configured in the Clerk Dashboard (Inactivity timeout, Max lifetime).
