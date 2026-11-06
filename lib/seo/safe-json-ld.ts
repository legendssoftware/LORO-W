/**
 * Serialize JSON-LD for a script tag. JSON.stringify leaves `<` intact, which can
 * close the script element if a value ever contains `</script>`.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
