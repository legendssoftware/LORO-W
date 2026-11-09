/**
 * Report activity channels. Keep in step with
 * server/src/reports/lib/activity-quality.ts classifyActivityChannel.
 */

export type ActivityChannel = 'physical' | 'telephone' | 'landline' | 'email' | 'whatsapp' | 'other';

export const ACTIVITY_CHANNEL_FILTERS = [
  'physical',
  'telephone',
  'whatsapp',
  'email',
  'landline',
  'all',
] as const;

export type ActivityChannelFilter = (typeof ACTIVITY_CHANNEL_FILTERS)[number];

function contactValueFilled(value: string | null | undefined): boolean {
  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 && trimmed !== '-';
}

/**
 * Split a check-in into the report channel.
 * Landline is a Telephone log whose landline is filled and whose cell is empty.
 * A blank or unknown method is Other, not a physical visit.
 */
export function classifyActivityChannel(row: {
  methodOfContact?: string | null;
  contactCellPhone?: string | null;
  contactLandline?: string | null;
}): ActivityChannel {
  const method = String(row.methodOfContact ?? '').trim().toLowerCase();
  if (method === 'physical' || method === 'in-person' || method === 'in_person_visit') return 'physical';
  if (method === 'email') return 'email';
  if (method === 'whatsapp') return 'whatsapp';
  if (method === 'telephone' || method === 'phone-call' || method === 'phone_call') {
    if (contactValueFilled(row.contactLandline) && !contactValueFilled(row.contactCellPhone)) {
      return 'landline';
    }
    return 'telephone';
  }
  return 'other';
}

/** Display label for a report activity channel. */
export function activityChannelLabel(channel: ActivityChannel): string {
  switch (channel) {
    case 'physical':
      return 'Physical';
    case 'telephone':
      return 'Telephone';
    case 'landline':
      return 'Landline';
    case 'email':
      return 'Email';
    case 'whatsapp':
      return 'WhatsApp';
    case 'other':
      return 'Other';
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

/** Label used on the visits list and its exports. */
export function activityMethodLabel(row: {
  methodOfContact?: string | null;
  contactCellPhone?: string | null;
  contactLandline?: string | null;
}): string {
  return activityChannelLabel(classifyActivityChannel(row));
}

export function activityChannelFilterLabel(filter: ActivityChannelFilter): string {
  switch (filter) {
    case 'all':
      return 'All activity';
    case 'physical':
      return 'Physical visits';
    case 'telephone':
      return 'Telephone';
    case 'whatsapp':
      return 'WhatsApp';
    case 'email':
      return 'Email';
    case 'landline':
      return 'Landline';
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}
