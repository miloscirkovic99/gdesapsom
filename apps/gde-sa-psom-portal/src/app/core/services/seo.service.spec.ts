import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';

import { SeoService, SITE_ORIGIN } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let meta: Meta;
  let title: Title;

  const canonicalHref = () =>
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href');

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoService);
    meta = TestBed.inject(Meta);
    title = TestBed.inject(Title);

    document.head.querySelectorAll('link[rel="canonical"]').forEach((link) => link.remove());
  });

  describe('canonical', () => {
    it('points at the current route, not the homepage', () => {
      service.update({ path: '/spots/41' });

      expect(canonicalHref()).toBe(`${SITE_ORIGIN}/spots/41`);
    });

    it('creates the link element when index.html ships without one', () => {
      expect(canonicalHref()).toBeUndefined();

      service.update({ path: '/blog/neki-clanak' });

      expect(canonicalHref()).toBe(`${SITE_ORIGIN}/blog/neki-clanak`);
    });

    it('reuses the same element across navigations instead of stacking duplicates', () => {
      service.update({ path: '/blog' });
      service.update({ path: '/all-spots' });

      expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
      expect(canonicalHref()).toBe(`${SITE_ORIGIN}/all-spots`);
    });

    it('keeps a trailing slash for the root and none elsewhere', () => {
      service.update({ path: '/' });
      expect(canonicalHref()).toBe(`${SITE_ORIGIN}/`);

      service.update({ path: '/pet-parks/' });
      expect(canonicalHref()).toBe(`${SITE_ORIGIN}/pet-parks`);
    });

    it('drops query strings so filter state is not a separate page', () => {
      service.update({ path: '/all-spots?spotType=Kafić' });

      expect(canonicalHref()).toBe(`${SITE_ORIGIN}/all-spots`);
    });
  });

  describe('description', () => {
    it('strips markup out of blog HTML', () => {
      service.update({ description: '<p>Prvi maj je <strong>savršena</strong> prilika.</p>' });

      expect(meta.getTag('name="description"')?.content).toBe('Prvi maj je savršena prilika.');
    });

    it('truncates on a word boundary', () => {
      const description = meta.getTag('name="description"');
      service.update({ description: 'lorem ipsum '.repeat(40) });

      const content = meta.getTag('name="description"')?.content ?? '';
      expect(content.length).toBeLessThanOrEqual(161);
      expect(content.endsWith('…')).toBe(true);
      expect(content).not.toContain('lore…');
      expect(description).toBeDefined();
    });

    it('falls back to the site description when a post has none', () => {
      service.update({ path: '/blog/x', description: null });

      expect(meta.getTag('name="description"')?.content).toContain('pet-friendly');
    });
  });

  describe('og:image', () => {
    it('ignores base64 payloads, which crawlers cannot use', () => {
      service.update({ image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==' });

      expect(meta.getTag('property="og:image"')?.content).toBe(`${SITE_ORIGIN}/assets/logo-big.png`);
    });

    it('keeps an absolute image URL as-is', () => {
      service.update({ image: 'https://cdn.example.com/a.png' });

      expect(meta.getTag('property="og:image"')?.content).toBe('https://cdn.example.com/a.png');
    });

    it('makes a site-relative image absolute', () => {
      service.update({ image: 'assets/post.png' });

      expect(meta.getTag('property="og:image"')?.content).toBe(`${SITE_ORIGIN}/assets/post.png`);
    });
  });

  it('sets the document title and mirrors it into og/twitter tags', () => {
    service.update({ title: 'Šupa - Kafić u Beogradu | Gde sa psom', path: '/spots/3' });

    expect(title.getTitle()).toBe('Šupa - Kafić u Beogradu | Gde sa psom');
    expect(meta.getTag('property="og:title"')?.content).toBe('Šupa - Kafić u Beogradu | Gde sa psom');
    expect(meta.getTag('property="og:url"')?.content).toBe(`${SITE_ORIGIN}/spots/3`);
  });
});
