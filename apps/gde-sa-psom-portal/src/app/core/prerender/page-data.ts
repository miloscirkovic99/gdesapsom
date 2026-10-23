import {
  FetchBackend,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';

/**
 * Requests the build-time prerenderer answers itself with an empty result, so
 * the page is rendered without them and the browser loads them after it has
 * hydrated. Six random places with their base64 photos weigh up to 7 MB, and a
 * random pick frozen into the HTML would differ from the browser's anyway.
 */
const BROWSER_ONLY: readonly { path: string; empty: unknown }[] = [
  { path: 'pet-friendly-spots/random', empty: { randomSpots: [] } },
];

const isBrowserOnly = (req: HttpRequest<unknown>) => BROWSER_ONLY.some(({ path }) => req.url.includes(path));

/** One place with everything about it: what a spot page is rendered from. */
const SPOT_DETAIL = 'pet-friendly-spots/all/';
const SPOT_PHOTOS = ['iuo_slika_base64', 'iuo_slika_base64_unutra'] as const;
const PHOTOS_OMITTED = 'photosOmitted';

/**
 * True for a place that came with a prerendered page: its photos were left
 * out (see PrerenderBackend), so the page asks for it again once hydrated.
 */
export const photosOmitted = (spot: unknown): boolean =>
  (spot as Record<string, unknown> | null)?.[PHOTOS_OMITTED] === true;

/**
 * Which API answers a prerendered page hands to the browser
 * (`withHttpTransferCacheOptions`), so it hydrates from the data the HTML was
 * rendered with instead of asking again: lookups, and the place, product,
 * shop or post the page is about. Search lists stay out (POST): with their
 * base64 photos they weigh megabytes, and the browser loads them again anyway.
 */
export function transferToBrowser(req: HttpRequest<unknown>): boolean {
  if (isBrowserOnly(req)) return false;
  if (req.method === 'POST') return req.url.includes(SPOT_DETAIL);
  return true;
}

/**
 * A spot page carries its place in the HTML (transfer cache) so it hydrates
 * without a second request, but not the place's photos: the API sends them as
 * base64 inside the JSON, up to 3.6 MB for a single place. They are removed
 * here, below the transfer cache, so neither the markup nor the cached answer
 * has them. Registered in app.config.server.ts only; a FetchBackend itself, or
 * Angular warns that the server does not use fetch (NG02801).
 */
@Injectable()
export class PrerenderBackend extends FetchBackend {
  override handle(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return super.handle(req).pipe(
      map((event) =>
        event instanceof HttpResponse && req.url.includes(SPOT_DETAIL)
          ? event.clone({ body: withoutSpotPhotos(event.body) })
          : event,
      ),
    );
  }
}

function withoutSpotPhotos(body: unknown): unknown {
  const spots = (body as { spotsListSingle?: unknown } | null)?.spotsListSingle;
  if (!Array.isArray(spots)) return body;
  return {
    ...(body as object),
    spotsListSingle: spots.map((spot) => ({
      ...spot,
      ...Object.fromEntries(SPOT_PHOTOS.map((field) => [field, null])),
      [PHOTOS_OMITTED]: true,
    })),
  };
}

/** Registered in app.config.server.ts only. */
@Injectable()
export class PrerenderInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const browserOnly = BROWSER_ONLY.find(({ path }) => req.url.includes(path));
    if (browserOnly) return of(new HttpResponse({ status: 200, body: browserOnly.empty, url: req.url }));
    return next.handle(req);
  }
}
