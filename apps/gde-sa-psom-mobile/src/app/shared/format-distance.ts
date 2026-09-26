/** "850 m" / "2,4 km" (sr) / "2.4 km" (en) for searches that sent a location. */
export function formatDistance(metres: number | null | undefined, lang: string): string | null {
  if (metres === undefined || metres === null || !Number.isFinite(metres)) return null;
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  const km = new Intl.NumberFormat(lang.startsWith('en') ? 'en-US' : 'sr-Latn-RS', {
    maximumFractionDigits: 1,
  }).format(metres / 1000);
  return `${km} km`;
}
