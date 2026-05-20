/**
 * User mode utilities — client portal vs staff (mirrors apk/lib/utils/user-mode.ts).
 */

import { extractTokenMetadata } from '@/lib/clerk-token-metadata';

type BackendUserData = {
  accessLevel?: string;
  role?: string;
  uid?: number;
} | null | undefined;

const isClientLevel = (value?: string | null): boolean =>
  typeof value === 'string' && value.toLowerCase().trim() === 'client';

export function canDetermineRouteFromTokenOnly(token: string | null): boolean {
  if (!token) return false;
  const { accessLevel } = extractTokenMetadata(token);
  return typeof accessLevel === 'string' && accessLevel.trim() !== '';
}

export function isClientMode(
  backendUserData?: BackendUserData,
  token?: string | null
): boolean {
  if (token) {
    const meta = extractTokenMetadata(token);
    if (isClientLevel(meta.accessLevel)) return true;
  }
  if (backendUserData) {
    if (
      isClientLevel(backendUserData.accessLevel) ||
      isClientLevel(backendUserData.role)
    ) {
      return true;
    }
  }
  return false;
}

export function isUserMode(
  backendUserData?: BackendUserData,
  token?: string | null
): boolean {
  return !isClientMode(backendUserData, token);
}

export function getDefaultRoute(
  backendUserData?: BackendUserData,
  token?: string | null
): string {
  if (isClientMode(backendUserData, token)) {
    return '/store';
  }
  return '/dashboard';
}

export function getUserMode(
  backendUserData?: BackendUserData,
  token?: string | null
): 'client' | 'user' {
  return isClientMode(backendUserData, token) ? 'client' : 'user';
}
