/**
 * Use the saved field value as the input placeholder when one exists.
 * Empty fields keep the example hint.
 */
export function savedFieldPlaceholder(value: unknown, fallback: string): string {
  if (value == null || typeof value === 'boolean') return fallback;
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}
