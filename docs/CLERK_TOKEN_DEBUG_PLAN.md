# Plan: Run app in Cursor browser and read Network tab for Clerk token failure

## Do we get the token after sign-in?

**Yes, the app is designed to get it** — but the request that fetches the token is failing, so the app never receives one.

- After sign-in, the app uses Clerk’s `useAuth().getToken()` (see `web/api/hooks/use-api-client.ts`, `use-sync-clerk.ts`, `use-token-ready.ts`, `use-session-sync.ts`).
- `getToken()` triggers the Clerk frontend SDK to call Clerk’s token API (the `tokens?_clerk_api_version=...` request in the Network tab).
- That **request** is the one failing (“Failed to load response data”). So we never get a token, and every call that depends on it (sync-clerk, status, metrics, leave, etc.) fails.
- Conclusion: the bug is not “we don’t call getToken after sign-in” — it’s that **the Clerk token endpoint request fails**, so no token is ever returned.

## What we know

- **Symptom**: After sign-in, the Clerk token request fails → "Failed to load response data" for `tokens?_clerk_api_version=2025-11-10&_clerk_js_v...`. Downstream, `sync-clerk`, `status`, `metrics`, and `leave/user/...` show red X (failed).
- **Flow**: Sign in → Clerk sets session → frontend calls `getToken()` (from `useAuth()`) → Clerk SDK requests a JWT from Clerk’s token API → that request fails → no token → all backend calls that need `Authorization: Bearer <token>` fail.

## Steps to run in Cursor browser and inspect Network tab

1. **Open the app in Cursor’s built-in browser**
   - Use “Simple Browser” or “Open in Browser” on `http://localhost:3000` (dev server already running from repo root: `cd web && npm run dev`).

2. **Reproduce the failure**
   - Go to `http://localhost:3000/sign-in` and sign in.
   - After redirect, go to `http://localhost:3000/dashboard`.
   - Keep DevTools open with the **Network** tab visible.

3. **Filter and find the failing requests**
   - In Network, set filter to **Fetch/XHR**.
   - Find:
     - **Clerk token request**: URL contains `tokens?` and `_clerk_api_version`.
     - **Your API calls**: `sync-clerk`, `status`, `metrics`, `leave/user/...` (to `localhost:4400` or your `NEXT_PUBLIC_API_URL`).

4. **Inspect the Clerk `tokens?` request**
   - Click the `tokens?...` request.
   - **Headers**:
     - Request URL (full): is it `https://*.clerk.accounts.dev/...` or something else?
     - Status code: 200, 401, 403, 500, or (failed)?
   - **Response**:
     - If “Failed to load response data”, check **Status** and **Headers** for status code and any error headers.
   - **Timing**: Did the request never complete (blocked, CORS, or timeout)?

5. **Inspect a failed backend request (e.g. `sync-clerk`)**
   - Click a red X request to your API.
   - Check **Headers**: Is `Authorization: Bearer ...` present? If missing, frontend never got a token.
   - Check **Response**: Body and status (401/403 suggest backend rejecting token or missing token).

6. **Optional: hard refresh and retry**
   - Do a hard refresh (e.g. Cmd+Shift+R) on `/dashboard` and see if the `tokens?` request succeeds on retry (intermittent vs consistent failure).

## What to record

- **Clerk `tokens?`**: Status code, full request URL, and any response body or error message.
- **Backend requests**: Whether `Authorization` header is present; status codes and error bodies.

## Likely causes (from codebase + screenshots)

1. **Clerk token endpoint error or unreachable**
   - Wrong or revoked Clerk keys in `web/.env.local` (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).
   - Session invalid/expired so Clerk doesn’t issue a token.
   - Network/CORS/proxy blocking the request to Clerk’s domain.

2. **Token never passed to API**
   - If `tokens?` fails, `getToken()` returns null or throws, so `web/api/client.ts` interceptor never sets `Authorization`, and all authenticated calls fail (consistent with your screenshot).

## Next steps after you capture Network tab

- If **status is 401/403** on `tokens?`: check Clerk Dashboard (sessions, key validity, domain allowlist).
- If **status is 0 or CORS error**: check proxy/firewall and Clerk’s allowed origins.
- If **status 200** but still “Failed to load response data”: possible DevTools quirk; confirm in **Preview** or **Response** whether a token is actually returned.
- Share the recorded status code and URL for `tokens?` and we can target the fix (e.g. key refresh, Clerk config, or retry/error handling in the app).
