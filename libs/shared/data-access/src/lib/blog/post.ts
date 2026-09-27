export interface Post {
  post_id: number;
  naslov: string;
  slug: string;
  sadrzaj: string;
  slika_naslovna: string;
  status: string;
  objavljen_u: string;
  kor_id: number;
  autor: string;
  autor_email: string;
  kategorija: string;
  tagovi: string;
  broj_komentara: number;
}

/**
 * The cover image of a post as a URL, or null when it has none.
 *
 * Older posts hold a bare file name under /assets/slike/; posts made in the
 * admin form hold an https:// URL or a site path (/assets/...). Pass `origin`
 * where a site-relative URL will not do (structured data, the mobile app).
 */
export function postCoverUrl(value: string | null | undefined, origin = ''): string | null {
  const cover = (value ?? '').trim();
  if (!cover) return null;
  if (/^https?:\/\//i.test(cover)) return cover;
  return cover.startsWith('/') ? `${origin}${cover}` : `${origin}/assets/slike/${cover}`;
}
