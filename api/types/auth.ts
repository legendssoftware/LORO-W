/**
 * Auth-related types: sync profile, session, token. Aligned with server sync response.
 */

import type { AccessLevel } from './user';

/** Branch reference returned in profile */
export interface BranchRef {
  uid: number;
  name?: string;
}

/** Organisation reference returned in profile */
export interface OrganisationRef {
  ref?: string;
  name?: string;
}

/** Profile data returned from /auth/sync-clerk (staff or client) */
export interface SyncProfile {
  uid: number;
  email?: string;
  name?: string;
  surname?: string;
  username?: string;
  phone?: string;
  photoURL?: string | null;
  avatar?: string | null;
  businesscardURL?: string | null;
  accessLevel?: AccessLevel | string;
  role?: string;
  organisationRef?: string;
  branchUid?: number;
  organisation?: OrganisationRef | null;
  branch?: BranchRef | null;
  clerkUserId?: string;
}

/** Response shape of POST /auth/sync-clerk */
export interface SyncResult {
  profileData?: SyncProfile;
}

/** Full profile data (e.g. for auth flows that return license info) */
export interface ProfileData {
  uid: string;
  accessLevel: AccessLevel;
  name: string;
  email?: string;
  phone?: string;
  photoURL?: string;
  organisationRef?: string;
  platform?: string;
  licenseInfo?: {
    licenseId: string;
    plan: string;
    status: string;
    features: Record<string, boolean>;
  };
  branch?: BranchRef;
}
