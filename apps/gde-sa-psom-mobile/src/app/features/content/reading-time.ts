/** Minutes to read an HTML article at ~200 words a minute (at least 1). */
export function readingMinutes(html: string | null | undefined): number {
  const text = (html ?? '').replace(/<[^>]*>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
