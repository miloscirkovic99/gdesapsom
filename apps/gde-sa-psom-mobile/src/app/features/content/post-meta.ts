import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

/**
 * A post's publication date as each language writes it: "1. 10. 2026." in
 * Serbian, "Oct 1, 2026" in English.
 *
 * The API sends a zone-less timestamp ("2026-08-10 23:30:00"). Only its date
 * part is used, so the day does not move with the phone's time zone, and no
 * locale data has to be registered: the patterns are numeric for Serbian and
 * Angular's built-in English data names the month.
 */
export function formatPostDate(value: string | null | undefined, lang: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value?.trim() ?? '');
  if (!match) return '';
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return formatDate(date, lang.startsWith('en') ? 'MMM d, y' : 'd. M. y.', 'en');
}

/** The post's comma-separated `tagovi` as a list, as the website splits them. */
export function postTags(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** `{{ post.objavljen_u | postDate: lang() }}`, see formatPostDate. */
@Pipe({ name: 'postDate' })
export class PostDatePipe implements PipeTransform {
  transform(value: string | null | undefined, lang: string): string {
    return formatPostDate(value, lang);
  }
}
