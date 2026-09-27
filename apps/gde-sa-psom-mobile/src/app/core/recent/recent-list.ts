/**
 * Puts `item` first, drops any older entry with the same key, keeps `max` entries.
 * Pure, so the "recently searched / viewed" rules are testable without Preferences.
 */
export function pushRecent<T>(list: readonly T[], item: T, key: (entry: T) => string, max: number): T[] {
  const k = key(item);
  return [item, ...list.filter((entry) => key(entry) !== k)].slice(0, max);
}

/** Search words compare without case or surrounding space ("Dorćol " and "dorćol" are one). */
export function searchKey(word: string): string {
  return word.trim().toLocaleLowerCase('sr');
}

/** Parses a stored JSON array, falling back to [] for anything unexpected. */
export function parseStoredList<T>(value: string | null, isEntry: (entry: unknown) => entry is T): T[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}
