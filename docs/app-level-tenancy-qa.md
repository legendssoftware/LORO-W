# App-level tenancy QA checklist

Use with `CLERK_APP_LEVEL_TENANCY=true` on the API. Staff should have `users.organisationRef` matching `organisation.clerk_org_id` (e.g. `loro_org_…`), with **no** Clerk Organization membership required.

## Web

1. Sign in as staff with only `publicMetadata.organisationRef` set (no Clerk org). Open dashboard; confirm no Clerk console errors about invalid `organizationId`.
2. Confirm API calls return 200 (Axios uses `getToken()` without `organizationId` for non-`org_…` tenant ids — see `web/lib/clerk-session-token.ts`).
3. New session before metadata sync: `initialOrgId` may be null on first SSR; after client `useUser` loads, org context should hydrate from `organisationRef` (`web/lib/org-id-context.tsx`).

## API (server)

1. Org-scoped `GET`/`POST` (e.g. products, attendance) succeed with Bearer token that has **no** JWT `o.id`.
2. `RoleGuard` allows routes when JWT has no `o.rol` but DB user has `accessLevel` (global `ClerkAuthGuard` runs before `RoleGuard`).

## APK

1. Sign in; confirm home loads (Clerk `choose-organization` task URL points to `/(tabs)/home`).
2. Confirm `getToken` is not called with a bogus `organizationId` for app-owned tenant ids (Expo client already uses org-less token pattern).

## Regression

1. Tenant still using real Clerk org ids (`org_…`): web should still pass `organizationId` into `getToken` for org-scoped Clerk sessions.
