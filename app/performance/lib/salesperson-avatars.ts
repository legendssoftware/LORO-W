import type { UserListItem } from '@/api/endpoints/user';

function normalizePersonKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Initials for an ERP salesperson label (e.g. BRANDON → BR, Jean Dre → JD).
 */
export function salespersonInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? '';
  const last = parts[parts.length - 1][0] ?? '';
  return `${first}${last}`.toUpperCase();
}

/**
 * Map unique normalized name keys to a photo URL. Ambiguous keys are omitted.
 */
export function buildSalespersonPhotoMap(users: UserListItem[]): Map<string, string> {
  const buckets = new Map<string, string[]>();

  function add(key: string, url: string) {
    if (!key || !url) return;
    const list = buckets.get(key) ?? [];
    list.push(url);
    buckets.set(key, list);
  }

  for (const user of users) {
    const url = (user.photoURL ?? user.avatar ?? '').trim();
    if (!url) continue;
    const full = normalizePersonKey([user.name, user.surname].filter(Boolean).join(' '));
    const first = normalizePersonKey(user.name ?? '');
    add(full, url);
    if (first && first !== full) add(first, url);
  }

  const unique = new Map<string, string>();
  for (const [key, urls] of buckets) {
    const distinct = Array.from(new Set(urls));
    if (distinct.length === 1) unique.set(key, distinct[0]);
  }
  return unique;
}

export function photoForSalesperson(
  name: string,
  photoByName: Map<string, string>
): string | undefined {
  const full = normalizePersonKey(name);
  if (photoByName.has(full)) return photoByName.get(full);
  const first = normalizePersonKey(name.split(/\s+/)[0] ?? '');
  if (first && first !== full) return photoByName.get(first);
  return undefined;
}
