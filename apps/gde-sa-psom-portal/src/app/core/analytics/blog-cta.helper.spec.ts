import { CtaType, ItemCategory } from './analytics.taxonomy';
import { classifyBlogLink } from './blog-cta.helper';

describe('classifyBlogLink', () => {
  const origin = 'https://www.gdesapsom.com';

  it('recognises a single listing link', () => {
    expect(classifyBlogLink('/spots/41', origin)).toEqual({
      cta_type: CtaType.listingLink,
      destination_category: null,
    });
    expect(classifyBlogLink('https://www.gdesapsom.com/spots/41/', origin)?.cta_type).toBe(
      CtaType.listingLink
    );
  });

  it('does not confuse the add-spot form with a listing', () => {
    expect(classifyBlogLink('/spots/new', origin)?.cta_type).toBe(CtaType.internalLink);
  });

  it('maps category pages to a canonical destination_category', () => {
    expect(classifyBlogLink('/all-spots?spotType=Kafić', origin)).toEqual({
      cta_type: CtaType.categoryLink,
      destination_category: ItemCategory.cafe,
    });
    expect(classifyBlogLink('/all-spots', origin)).toEqual({
      cta_type: CtaType.categoryLink,
      destination_category: null,
    });
    expect(classifyBlogLink('/pet-parks', origin)?.destination_category).toBe(ItemCategory.park);
    expect(classifyBlogLink('/vet-clinics', origin)?.destination_category).toBe(
      ItemCategory.veterinary
    );
  });

  it('treats other internal links as internal and other origins as external', () => {
    expect(classifyBlogLink('/blog/drugi-clanak', origin)?.cta_type).toBe(CtaType.internalLink);
    expect(classifyBlogLink('https://example.com/x', origin)?.cta_type).toBe(CtaType.externalLink);
  });

  it('ignores non-navigation links', () => {
    expect(classifyBlogLink('mailto:info@example.com', origin)).toBeNull();
    expect(classifyBlogLink('tel:+381641234567', origin)).toBeNull();
    expect(classifyBlogLink(null, origin)).toBeNull();
  });
});
