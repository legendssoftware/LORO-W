import { format, isSameDay, parse } from 'date-fns';

/** Format lastAppAccessAt for display: "Last seen today at 07:39" or "Last seen Thu 26 00:34" */
export function formatLastSeen(dateStr: string): string {
  try {
    const d = parse(dateStr, 'MMM d, yyyy h:mm a', new Date());
    const now = new Date();
    if (isSameDay(d, now)) {
      return `Last seen today at ${format(d, 'HH:mm')}`;
    }
    return `Last seen ${format(d, 'EEE d HH:mm')}`;
  } catch {
    return `Last seen ${dateStr}`;
  }
}
