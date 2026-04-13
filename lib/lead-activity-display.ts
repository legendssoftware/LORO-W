import type { LeadActivityLogItem, LeadListItem } from '@/api/types/leads';

export type ActivityActorLookupUser = {
  uid: number;
  clerkUserId?: string;
  name: string;
  surname: string;
  photoURL?: string | null;
  avatar?: string | null;
};

/** Badge label + Tailwind classes for the activity column and detail timeline. */
export function leadActivityActionPresentation(action: string | undefined): {
  label: string;
  className: string;
} {
  const a = action ?? '';
  const table: Record<string, { label: string; className: string }> = {
    created: {
      label: 'Created',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    },
    updated: {
      label: 'Updated',
      className: 'border-slate-200 bg-slate-50 text-slate-800',
    },
    status_changed: {
      label: 'Status',
      className: 'border-amber-200 bg-amber-50 text-amber-950',
    },
    deleted: {
      label: 'Deleted',
      className: 'border-red-200 bg-red-50 text-red-900',
    },
    restored: {
      label: 'Restored',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    },
    reactivated: {
      label: 'Reactivated',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    },
    system: {
      label: 'LORO',
      className: 'border-violet-200 bg-violet-50 text-violet-900',
    },
    follow_up_set: {
      label: 'Follow-up',
      className: 'border-sky-200 bg-sky-50 text-sky-950',
    },
    owner_changed: {
      label: 'Transfer',
      className: 'border-blue-200 bg-blue-50 text-blue-950',
    },
    assignees_changed: {
      label: 'Assignees',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-950',
    },
    interaction_recorded: {
      label: 'Interaction',
      className: 'border-teal-200 bg-teal-50 text-teal-950',
    },
    interaction_updated: {
      label: 'Interaction',
      className: 'border-teal-200 bg-teal-50 text-teal-950',
    },
    interaction_deleted: {
      label: 'Interaction',
      className: 'border-orange-200 bg-orange-50 text-orange-950',
    },
    engagement_sent: {
      label: 'Engage',
      className: 'border-pink-200 bg-pink-50 text-pink-950',
    },
  };
  if (table[a]) return table[a];
  const words = a.replace(/_/g, ' ').trim();
  const label = words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Activity';
  return {
    label,
    className: 'border-muted bg-muted/60 text-foreground',
  };
}

export function isLeadActivityLoroRow(entry: LeadActivityLogItem): boolean {
  const hasClerk =
    typeof entry.clerkUserId === 'string' && entry.clerkUserId.trim() !== '';
  return entry.action === 'system' || !hasClerk;
}

export function formatLeadActivitySummaryForRow(entry: LeadActivityLogItem): string {
  const raw = entry.summary?.trim() ?? '';
  if (!isLeadActivityLoroRow(entry)) return raw;
  if (/^LORO\b/i.test(raw)) return raw;
  if (entry.action === 'created') return 'LORO created this lead';
  if (entry.action === 'updated') return 'LORO updated this lead';
  return `LORO ${raw}`;
}

export function resolveActivityUserProfile(
  entry: LeadActivityLogItem,
  users: ActivityActorLookupUser[]
): { name: string; photoURL?: string | null } | undefined {
  if (isLeadActivityLoroRow(entry)) return undefined;
  if (entry.userId != null) {
    const u = users.find((x) => x.uid === entry.userId);
    if (u) {
      const name = [u.name, u.surname].filter(Boolean).join(' ').trim();
      if (name) return { name, photoURL: u.photoURL ?? u.avatar };
    }
  }
  const cid = entry.clerkUserId?.trim();
  if (cid) {
    const u = users.find((x) => x.clerkUserId === cid);
    if (u) {
      const name = [u.name, u.surname].filter(Boolean).join(' ').trim();
      if (name) return { name, photoURL: u.photoURL ?? u.avatar };
    }
  }
  const fallback = entry.userName?.trim();
  if (fallback) return { name: fallback };
  return undefined;
}

/** Uses the same headline rules as the leads table (LORO prefix when `lastActivityIsLoro`). */
export function formatListLastActivitySummaryLine(lead: LeadListItem, rawLine: string | undefined): string | undefined {
  if (!rawLine?.trim()) return undefined;
  const trimmed = rawLine.trim();
  if (lead.lastActivityIsLoro !== true) return trimmed;
  if (/^LORO\b/i.test(trimmed)) return trimmed;
  const action = lead.lastActivityAction;
  if (action === 'created') return 'LORO created this lead';
  if (action === 'updated') return 'LORO updated this lead';
  if (action === 'system' || action === 'status_changed') return `LORO ${trimmed}`;
  return `LORO ${trimmed}`;
}
