/**
 * Same-origin return path from Clerk `redirect_url`. Rejects open redirects.
 * Shared by the auth proxy and page-level sign-in redirects.
 */
export function safeReturnPath(raw: string | null | undefined, requestUrl?: string): string | null {
  if (!raw) return null;
  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!value || value.includes('\\') || value.includes('\n') || value.includes('\r')) {
    return null;
  }
  if (value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  if (!requestUrl) return null;
  try {
    const target = new URL(value);
    if (target.origin !== new URL(requestUrl).origin) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}

/** Signed-in visitor on an auth route. Keeps a safe return path; otherwise the app home. */
export function signedInAuthDestination(
  redirectUrl: string | null | undefined,
  requestUrl: string,
): string {
  return safeReturnPath(redirectUrl, requestUrl) ?? '/dashboard';
}

/** Sign-in URL that restores the page the user was on after refresh. */
export function signInHref(returnPath: string): string {
  const safe = safeReturnPath(returnPath) ?? '/dashboard';
  return `/sign-in?redirect_url=${encodeURIComponent(safe)}`;
}
