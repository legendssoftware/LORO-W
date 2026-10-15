import type { Journal } from '@/api/types/journal';
import type { SyncProfile } from '@/api/types/auth';
import { canManageMerchandise } from '@/lib/access';
import { isMerchandiseEditable } from './merchandise-display';

/**
 * Edit is open to the log owner and to admin or manager, until the row is published or archived.
 */
export function canEditMerchandiseEntry(
  accessLevel: string | undefined,
  journal: Pick<Journal, 'status' | 'owner' | 'ownerClerkUserId'>,
  viewer: Pick<SyncProfile, 'uid' | 'clerkUserId'> | null | undefined
): boolean {
  if (!isMerchandiseEditable(journal.status)) return false;
  if (canManageMerchandise(accessLevel)) return true;
  if (!viewer) return false;
  if (viewer.uid != null && journal.owner?.uid != null && journal.owner.uid === viewer.uid) {
    return true;
  }
  const clerk = journal.ownerClerkUserId ?? journal.owner?.clerkUserId;
  return Boolean(viewer.clerkUserId && clerk && viewer.clerkUserId === clerk);
}
