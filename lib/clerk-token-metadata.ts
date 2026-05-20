/**
 * Extract metadata from Clerk JWT token (org role, org id, session).
 * Clerk session JWT template should expose org claims under `o.rol` and `o.id`.
 */
export function extractTokenMetadata(token: string | null): {
  clerkUserId: string | null;
  accessLevel: string | null;
  orgId: string | null;
  sessionId: string | null;
} {
  if (!token) {
    return { clerkUserId: null, accessLevel: null, orgId: null, sessionId: null };
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { clerkUserId: null, accessLevel: null, orgId: null, sessionId: null };
    }

    const payload = JSON.parse(atob(parts[1])) as {
      sub?: string;
      sid?: string;
      o?: { rol?: string; id?: string };
    };

    return {
      clerkUserId: payload.sub ?? null,
      accessLevel: payload.o?.rol ?? null,
      orgId: payload.o?.id ?? null,
      sessionId: payload.sid ?? null,
    };
  } catch {
    return { clerkUserId: null, accessLevel: null, orgId: null, sessionId: null };
  }
}
