/** Format enum-like strings for display (e.g. "event planner", "internal_sales_rep"). */
export function formatEnumLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
