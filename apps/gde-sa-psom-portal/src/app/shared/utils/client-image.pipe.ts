import { isPlatformBrowser } from '@angular/common';
import { inject, Pipe, PipeTransform, PLATFORM_ID } from '@angular/core';

/**
 * The API sends photos and logos as base64 `data:` URIs inside its JSON.
 * Written into the prerendered HTML they made a hub page 2 MB, so while the
 * build prerenders a page an inline image gets no `src` at all; the browser
 * sets it when it hydrates the page. Files and URLs are left alone.
 *
 * Usage: `<img [src]="spot.iuo_slika_base64 | clientImage" ...>`
 */
@Pipe({ name: 'clientImage' })
export class ClientImagePipe implements PipeTransform {
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  transform(src: string | null | undefined): string | null {
    if (!src) return null;
    return this.#isBrowser || !src.startsWith('data:') ? src : null;
  }
}
