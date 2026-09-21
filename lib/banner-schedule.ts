export type BannerScheduleStatus = 'hidden' | 'scheduled' | 'live' | 'ended';

export const BANNER_SCHEDULE_FILTERS = ['all', 'live', 'scheduled', 'ended', 'hidden'] as const;

export type BannerScheduleFilter = (typeof BANNER_SCHEDULE_FILTERS)[number];

type BannerScheduleFields = {
  isPublished: boolean;
  startsAt: string | null | undefined;
  endsAt: string | null | undefined;
};

/**
 * Converts an ISO datetime to a value for `<input type="datetime-local">`.
 */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Converts a datetime-local input value to an ISO string.
 */
export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

/** End of today, used when switching a banner into until-date mode. */
export function defaultEndsAtIso(): string {
  const until = new Date();
  until.setHours(23, 59, 0, 0);
  return until.toISOString();
}

/**
 * Play-window status for planning badges and list filters.
 */
export function getBannerScheduleStatus(
  banner: BannerScheduleFields,
  now = new Date()
): BannerScheduleStatus {
  if (!banner.isPublished) return 'hidden';
  const start = banner.startsAt ? new Date(banner.startsAt) : null;
  const end = banner.endsAt ? new Date(banner.endsAt) : null;
  if (start && start > now) return 'scheduled';
  if (end && end < now) return 'ended';
  return 'live';
}

function formatScheduleInstant(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Human-readable play window for list cards and carousel slots.
 */
export function getBannerScheduleLabel(banner: Pick<BannerScheduleFields, 'startsAt' | 'endsAt'>): string {
  if (!banner.startsAt && !banner.endsAt) return 'No schedule';
  if (banner.startsAt && banner.endsAt) {
    return `${formatScheduleInstant(banner.startsAt)} → ${formatScheduleInstant(banner.endsAt)}`;
  }
  if (banner.startsAt) return `from ${formatScheduleInstant(banner.startsAt)} · no end`;
  return `until ${formatScheduleInstant(banner.endsAt ?? '')}`;
}

export function bannerScheduleStatusLabel(status: BannerScheduleStatus): string {
  switch (status) {
    case 'live':
      return 'Live';
    case 'scheduled':
      return 'Scheduled';
    case 'ended':
      return 'Ended';
    case 'hidden':
      return 'Hidden';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function bannerScheduleFilterLabel(filter: BannerScheduleFilter): string {
  switch (filter) {
    case 'all':
      return 'All';
    case 'live':
      return 'Live';
    case 'scheduled':
      return 'Scheduled';
    case 'ended':
      return 'Ended';
    case 'hidden':
      return 'Hidden';
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}
