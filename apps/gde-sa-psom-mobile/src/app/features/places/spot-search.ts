import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import type { Spot } from '@gde/shared/data-access';
import { catchError, forkJoin, map, Observable, of, Subscription, throwError } from 'rxjs';
import { NO_SPOT_FILTERS, SpotFilters, toSearchBody } from './spot-filters';

/** Venues per batch, split across the venue types searched (the website's hub pages do the same). */
export const PAGE_SIZE = 12;

/** One venue type of the search, paged on its own: the API filters by a single `ugo_id`. */
export interface SpotSource {
  /** Null when the search covers every type. */
  typeId: number | null;
  offset: number;
  total: number;
}

export interface SourcePage {
  typeId: number | null;
  spots: Spot[];
  /** Matches of this type for the whole query, not just the page. */
  total: number;
}

export function perSourceLimit(sources: number): number {
  return Math.max(1, Math.ceil(PAGE_SIZE / Math.max(1, sources)));
}

/** Drops repeats: the API pages by a non-unique sort, so a venue can come back twice. */
export function withoutRepeats(spots: readonly Spot[]): Spot[] {
  const seen = new Set<number>();
  return spots.filter((spot) => {
    if (seen.has(spot.iuo_id)) return false;
    seen.add(spot.iuo_id);
    return true;
  });
}

/**
 * Appends one batch (a page of every source). Each type comes back nearest
 * first from a "near me" search; the batch is put in that order as a whole,
 * so venues already on screen never move.
 */
export function appendBatch(shown: readonly Spot[], pages: readonly SourcePage[], byDistance: boolean): Spot[] {
  const batch = pages.flatMap((page) => page.spots);
  if (byDistance) {
    batch.sort((a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity));
  }
  return withoutRepeats([...shown, ...batch]);
}

/** Moves every source past what it returned; an empty page means the data changed under us: stop asking. */
export function advanceSources(sources: readonly SpotSource[], pages: readonly SourcePage[]): SpotSource[] {
  return sources.map((source) => {
    const page = pages.find((p) => p.typeId === source.typeId);
    if (!page) return source;
    const received = page.spots.length;
    return { ...source, offset: received ? source.offset + received : source.total };
  });
}

const isNotFound = (error: unknown): boolean => error instanceof HttpErrorResponse && error.status === 404;

/**
 * The venue list of the Places tab. Unlike SpotsStore it searches several
 * venue types at once (a category such as Kafić + Kafeterija), and it reports
 * an empty search as an empty list, not as an error. Provided by the page.
 */
@Injectable()
export class SpotSearch implements OnDestroy {
  readonly #http = inject(HttpClient);

  readonly spots = signal<Spot[]>([]);
  /** Matches for the whole search. */
  readonly total = signal(0);
  /** 'idle' until the first search. */
  readonly status = signal<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  readonly loadingMore = signal(false);
  readonly loadMoreFailed = signal(false);
  readonly #sources = signal<SpotSource[]>([]);
  readonly hasMore = computed(() => this.#sources().some((s) => s.offset < s.total));

  #filters: SpotFilters = NO_SPOT_FILTERS;
  #request: Subscription | null = null;

  /** A new list for `filters`; whatever was loading is dropped. */
  search(filters: SpotFilters): void {
    this.#request?.unsubscribe();
    this.#filters = filters;
    this.spots.set([]);
    this.total.set(0);
    this.#sources.set([]);
    this.status.set('loading');
    this.loadingMore.set(false);
    this.loadMoreFailed.set(false);

    const typeIds: (number | null)[] = filters.spotTypeIds.length ? filters.spotTypeIds : [null];
    const limit = perSourceLimit(typeIds.length);
    this.#request = forkJoin(typeIds.map((typeId) => this.#page(filters, typeId, 0, limit))).subscribe({
      next: (pages) => {
        this.#sources.set(pages.map((p) => ({ typeId: p.typeId, offset: p.spots.length, total: p.total })));
        this.spots.set(appendBatch([], pages, !!filters.near));
        this.total.set(pages.reduce((sum, p) => sum + p.total, 0));
        this.status.set('loaded');
      },
      error: () => this.status.set('error'),
    });
  }

  /** The last search again (after an error, or pull-to-refresh). */
  retry(): void {
    this.search(this.#filters);
  }

  /** The next batch, from every type that has more. */
  loadMore(): void {
    const pending = this.#sources().filter((s) => s.offset < s.total);
    if (!pending.length || this.loadingMore() || this.status() !== 'loaded') return;

    const filters = this.#filters;
    const limit = perSourceLimit(this.#sources().length);
    this.loadingMore.set(true);
    this.loadMoreFailed.set(false);
    this.#request = forkJoin(pending.map((s) => this.#page(filters, s.typeId, s.offset, limit))).subscribe({
      next: (pages) => {
        this.#sources.update((sources) => advanceSources(sources, pages));
        this.spots.update((shown) => appendBatch(shown, pages, !!filters.near));
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
        this.loadMoreFailed.set(true);
      },
    });
  }

  ngOnDestroy(): void {
    this.#request?.unsubscribe();
  }

  #page(filters: SpotFilters, typeId: number | null, offset: number, limit: number): Observable<SourcePage> {
    return this.#http
      .post<{ spotsList?: Spot[]; totalResults?: number | string }>(
        'pet-friendly-spots/search-query',
        toSearchBody(filters, typeId, offset, limit),
      )
      .pipe(
        map((response) => ({
          typeId,
          spots: response.spotsList ?? [],
          total: Number(response.totalResults) || 0,
        })),
        // "Nothing found" (or nothing past `offset`) is a 404.
        catchError((error) => (isNotFound(error) ? of({ typeId, spots: [], total: 0 }) : throwError(() => error))),
      );
  }
}
