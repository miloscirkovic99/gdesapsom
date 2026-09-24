/**
 * Trimmed text from an API field, or null when there is nothing to show.
 * Some spot rows were saved with the literal string "null" (`iuo_opis` on most
 * of them), which would otherwise be printed on the page and used as the meta
 * description.
 */
export function cleanApiText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.toLowerCase() !== 'null' ? text : null;
}
