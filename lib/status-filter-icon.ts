/**
 * Text color for a status filter icon. Neutral or unknown values stay muted.
 */
export function statusFilterIconClass(status: string): string {
  const key = status.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (
    key === 'pending' ||
    key === 'pending_review' ||
    key === 'review' ||
    key === 'under_review' ||
    key === 'in_progress' ||
    key === 'processing' ||
    key === 'assigned' ||
    key === 'potential' ||
    key === 'watching' ||
    key === 'maintenance' ||
    key === 'early'
  ) {
    return 'text-amber-500';
  }

  if (
    key === 'published' ||
    key === 'approved' ||
    key === 'completed' ||
    key === 'paid' ||
    key === 'present' ||
    key === 'ready' ||
    key === 'recorded' ||
    key === 'active' ||
    key === 'converted' ||
    key === 'online' ||
    key === 'sent' ||
    key === 'viewed' ||
    key === 'acquired'
  ) {
    return 'text-green-600';
  }

  if (
    key === 'rejected' ||
    key === 'declined' ||
    key === 'cancelled' ||
    key === 'canceled' ||
    key === 'missed' ||
    key === 'absent' ||
    key === 'failed' ||
    key === 'banned' ||
    key === 'offline' ||
    key === 'disconnected' ||
    key === 'bankrupt'
  ) {
    return 'text-red-600';
  }

  if (key === 'draft' || key === 'planning' || key === 'generated') {
    return 'text-blue-500';
  }

  if (key === 'overdue' || key === 'late' || key === 'expired' || key === 'on_hold' || key === 'behind_on_hours') {
    return 'text-orange-500';
  }

  return 'text-muted-foreground';
}
