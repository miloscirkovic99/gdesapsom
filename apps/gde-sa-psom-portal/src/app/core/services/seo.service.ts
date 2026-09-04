import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/** Canonical host. Must match robots.txt, the sitemap, and the .htaccess redirect. */
export const SITE_ORIGIN = 'https://www.gdesapsom.com';

const DEFAULT_TITLE =
  'Gde sa psom - Pet-Friendly Restorani, Kafići, Hoteli i Parkovi za Pse u Srbiji';
const DEFAULT_DESCRIPTION =
  'Pronađite gde su psi dobrodošli u Srbiji! Pretražite pet-friendly restorane, kafiće, hotele, parkove za pse i veterinarske klinike u Beogradu, Novom Sadu, Nišu i širom Srbije.';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/assets/logo-big.png`;

const MAX_DESCRIPTION_LENGTH = 160;

export interface SeoMetadata {
  title?: string | null;
  description?: string | null;
  /** Site-relative path starting with '/', e.g. '/blog/moj-clanak'. */
  path?: string | null;
  /** Absolute or site-relative image URL. Base64 data URIs are ignored. */
  image?: string | null;
  type?: 'website' | 'article';
}

/**
 * Sets the per-page metadata Google reads: title, description, canonical, and
 * the Open Graph / Twitter tags.
 *
 * index.html ships no canonical, so a page that never calls this self-canonicalises
 * - which is the correct default. Calling it with a path pins the canonical to that
 * URL instead.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  update(metadata: SeoMetadata): void {
    const title = metadata.title?.trim() || DEFAULT_TITLE;
    const description = this.toDescription(metadata.description) || DEFAULT_DESCRIPTION;
    const url = this.toAbsoluteUrl(metadata.path);
    const image = this.toImageUrl(metadata.image);
    const type = metadata.type ?? 'website';

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'title', content: title });
    this.meta.updateTag({ name: 'description', content: description });

    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:image', content: image });
    if (url) this.meta.updateTag({ property: 'og:url', content: url });

    this.meta.updateTag({ property: 'twitter:title', content: title });
    this.meta.updateTag({ property: 'twitter:description', content: description });
    this.meta.updateTag({ property: 'twitter:image', content: image });
    if (url) this.meta.updateTag({ property: 'twitter:url', content: url });

    this.setCanonical(url);
  }

  /**
   * Adds or replaces a JSON-LD block identified by `id` (schema.org Product,
   * PetStore, ...). Detail pages call it once their data arrives and
   * `clearStructuredData` on destroy so the block never outlives the page.
   */
  setStructuredData(id: string, data: Record<string, unknown>): void {
    const head = this.document.head;
    let script = head.querySelector<HTMLScriptElement>(
      `script[type="application/ld+json"][data-seo-id="${id}"]`,
    );

    if (!script) {
      script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-id', id);
      head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
  }

  clearStructuredData(id: string): void {
    this.document.head
      .querySelector(`script[type="application/ld+json"][data-seo-id="${id}"]`)
      ?.remove();
  }

  /** Strips HTML, collapses whitespace, and truncates on a word boundary. */
  private toDescription(value: string | null | undefined): string {
    if (!value) return '';

    const text = value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length <= MAX_DESCRIPTION_LENGTH) return text;

    const clipped = text.slice(0, MAX_DESCRIPTION_LENGTH);
    const lastSpace = clipped.lastIndexOf(' ');
    return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
  }

  private toAbsoluteUrl(path: string | null | undefined): string | null {
    if (!path) return null;

    // Drop query strings and fragments: filter state is not a distinct page.
    const [pathname] = path.split(/[?#]/);
    if (pathname === '/' || pathname === '') return `${SITE_ORIGIN}/`;

    return `${SITE_ORIGIN}/${pathname.replace(/^\/+/, '').replace(/\/+$/, '')}`;
  }

  /** Spot and blog images arrive as base64 data URIs, which are useless to crawlers. */
  private toImageUrl(image: string | null | undefined): string {
    const value = image?.trim();
    if (!value || value.startsWith('data:')) return DEFAULT_IMAGE;
    if (/^https?:\/\//i.test(value)) return value;
    return `${SITE_ORIGIN}/${value.replace(/^\/+/, '')}`;
  }

  private setCanonical(url: string | null): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!url) {
      link?.remove();
      return;
    }

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }

    link.setAttribute('href', url);
  }
}
