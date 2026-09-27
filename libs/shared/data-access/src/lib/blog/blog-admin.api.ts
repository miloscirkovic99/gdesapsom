import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { num, numOrNull, RawRow, rows, str, strOrNull } from '../catalog/catalog.mappers';

export type BlogPostStatus = 'draft' | 'objavljen';

export interface BlogCategory {
  id: number;
  naziv: string;
}

export interface BlogTag {
  id: number;
  naziv: string;
}

/** Body of `POST blog/create`. A null `slug` lets the server derive it from `naslov`. */
export interface BlogPostPayload {
  naslov: string;
  slug: string | null;
  sadrzaj: string;
  kategorijaId: number | null;
  slikaNaslovna: string | null;
  status: BlogPostStatus;
  tagIds: number[];
}

export interface CreatedBlogPost {
  id: number;
  naslov: string;
  slug: string;
  status: BlogPostStatus;
  kategorijaId: number | null;
  slikaNaslovna: string | null;
  objavljenU: string | null;
  kreiranU: string | null;
  tagIds: number[];
}

/** A 4xx from `blog/create`. `field` names the payload key the message is about. */
export interface BlogPostApiError {
  status: number;
  message: string;
  field: keyof BlogPostPayload | null;
  suggestedSlug: string | null;
}

/** What `blog/create` accepts for `slug`: lowercase ASCII words joined by single dashes. */
export const BLOG_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** What `blog/create` accepts for `slikaNaslovna`: https:// or a site path (the CSP blocks http:// images). */
export const BLOG_COVER_URL_PATTERN = /^(https:\/\/\S+|\/(?!\/)\S*)$/i;

const PAYLOAD_FIELDS: ReadonlyArray<keyof BlogPostPayload> = [
  'naslov',
  'slug',
  'sadrzaj',
  'kategorijaId',
  'slikaNaslovna',
  'status',
  'tagIds',
];

const SERBIAN_LATIN: Record<string, string> = { č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'dj' };

/**
 * The slug `blog/create` derives from a title, so the form can suggest the
 * same one: lowercase, č/ć→c, š→s, ž→z, đ→dj, other accents dropped, every
 * other run of characters becomes one "-". Mirrors `slugify` in
 * apps/api/v2/blog/create.POST.js.
 */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[čćžšđ]/g, (letter) => SERBIAN_LATIN[letter])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200)
    .replace(/-+$/, '');
}

/** The handler's own message for a 4xx, or null for anything else (network, 5xx, HTML instead of JSON). */
export function blogPostApiError(error: unknown): BlogPostApiError | null {
  if (!(error instanceof HttpErrorResponse) || error.status < 400 || error.status >= 500) return null;
  const body = error.error as RawRow | null;
  const message = strOrNull(body?.['message']);
  if (!message) return null;

  const field = str(body?.['field']) as keyof BlogPostPayload;
  return {
    status: error.status,
    message,
    field: PAYLOAD_FIELDS.includes(field) ? field : null,
    suggestedSlug: strOrNull(body?.['suggestedSlug']),
  };
}

interface ListEnvelope {
  data: RawRow[];
  total?: number | null;
}

interface CreateEnvelope {
  data: RawRow;
  tagIds?: unknown;
  message?: string;
}

const toNamed = (row: RawRow): BlogCategory => ({ id: num(row['id']), naziv: str(row['naziv']) });

function toCreatedPost(response: CreateEnvelope): CreatedBlogPost {
  const row = response.data;
  return {
    id: num(row['id']),
    naslov: str(row['naslov']),
    slug: str(row['slug']),
    status: str(row['status']) === 'objavljen' ? 'objavljen' : 'draft',
    kategorijaId: numOrNull(row['kategorijaId']),
    slikaNaslovna: strOrNull(row['slikaNaslovna']),
    objavljenU: strOrNull(row['objavljenU']),
    kreiranU: strOrNull(row['kreiranU']),
    tagIds: Array.isArray(response.tagIds) ? response.tagIds.map((id) => num(id)) : [],
  };
}

function postBody(payload: BlogPostPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    naslov: payload.naslov.trim(),
    sadrzaj: payload.sadrzaj.trim(),
    kategorijaId: payload.kategorijaId,
    slikaNaslovna: strOrNull(payload.slikaNaslovna),
    status: payload.status,
    // A comma list, the shape Mars is known to read (see pet-shops/search-query).
    tagIds: payload.tagIds.join(','),
  };
  const slug = strOrNull(payload.slug);
  if (slug) body['slug'] = slug;
  return body;
}

/**
 * Admin access to the blog: create a post, plus the categories and tags the
 * form offers. Paths are relative; ApiPrefixInterceptor adds the API base and
 * the session id the handler checks.
 */
@Injectable({ providedIn: 'root' })
export class BlogAdminApi {
  readonly #http = inject(HttpClient);

  listCategories(): Observable<BlogCategory[]> {
    return this.#http
      .get<ListEnvelope>('blog/categories')
      .pipe(map((response) => rows(response?.data).map(toNamed)));
  }

  listTags(): Observable<BlogTag[]> {
    return this.#http
      .get<ListEnvelope>('blog/tags')
      .pipe(map((response) => rows(response?.data).map(toNamed)));
  }

  createPost(payload: BlogPostPayload): Observable<CreatedBlogPost> {
    return this.#http.post<CreateEnvelope>('blog/create', postBody(payload)).pipe(map(toCreatedPost));
  }
}
