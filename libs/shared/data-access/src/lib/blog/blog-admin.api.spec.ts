import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  BLOG_COVER_URL_PATTERN,
  BLOG_SLUG_PATTERN,
  BlogAdminApi,
  BlogPostPayload,
  blogPostApiError,
  CreatedBlogPost,
  slugifyTitle,
} from './blog-admin.api';
import { postCoverUrl } from './post';

describe('slugifyTitle', () => {
  it('follows the rule blog/create uses', () => {
    expect(slugifyTitle('Šetnja po Košutnjaku sa psom: đak & ŽUĆA čćžšđ!')).toBe(
      'setnja-po-kosutnjaku-sa-psom-djak-zuca-cczsdj',
    );
    expect(slugifyTitle('  Café -- Crème  ')).toBe('cafe-creme');
    expect(slugifyTitle('!!!')).toBe('');
  });

  it('never ends on a dash after cutting to 200 characters', () => {
    const slug = slugifyTitle(`${'a'.repeat(199)} b`);
    expect(slug.length).toBeLessThanOrEqual(200);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('always produces a slug the handler accepts', () => {
    expect(BLOG_SLUG_PATTERN.test(slugifyTitle('Pas i mačka: 10 saveta'))).toBe(true);
  });
});

describe('BLOG_COVER_URL_PATTERN', () => {
  it('takes https URLs and site paths only', () => {
    expect(BLOG_COVER_URL_PATTERN.test('https://cdn.example.com/a.jpg')).toBe(true);
    expect(BLOG_COVER_URL_PATTERN.test('/assets/slike/a.jpg')).toBe(true);
    expect(BLOG_COVER_URL_PATTERN.test('http://example.com/a.jpg')).toBe(false);
    expect(BLOG_COVER_URL_PATTERN.test('//example.com/a.jpg')).toBe(false);
    expect(BLOG_COVER_URL_PATTERN.test('a.jpg')).toBe(false);
  });
});

describe('postCoverUrl', () => {
  it('keeps full URLs and site paths, and resolves legacy file names under /assets/slike/', () => {
    expect(postCoverUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(postCoverUrl('/assets/blog/a.jpg')).toBe('/assets/blog/a.jpg');
    expect(postCoverUrl('naslovna.jpg')).toBe('/assets/slike/naslovna.jpg');
    expect(postCoverUrl('naslovna.jpg', 'https://www.gdesapsom.com')).toBe(
      'https://www.gdesapsom.com/assets/slike/naslovna.jpg',
    );
    expect(postCoverUrl('https://cdn.example.com/a.jpg', 'https://www.gdesapsom.com')).toBe(
      'https://cdn.example.com/a.jpg',
    );
  });

  it('is null without a cover', () => {
    expect(postCoverUrl(null)).toBeNull();
    expect(postCoverUrl('  ')).toBeNull();
  });
});

describe('blogPostApiError', () => {
  const httpError = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

  it('reads the message, the field and the suggested slug of a 409', () => {
    expect(
      blogPostApiError(httpError(409, { message: 'Slug "x" vec koristi drugi post.', field: 'slug', suggestedSlug: 'x-2' })),
    ).toEqual({ status: 409, message: 'Slug "x" vec koristi drugi post.', field: 'slug', suggestedSlug: 'x-2' });
  });

  it('drops a field name the form does not have', () => {
    expect(blogPostApiError(httpError(400, { message: 'Nope', field: 'autor_id' }))?.field).toBeNull();
  });

  it('is null for server errors and bodies without a message', () => {
    expect(blogPostApiError(httpError(500, { message: 'boom' }))).toBeNull();
    expect(blogPostApiError(httpError(400, '<html>'))).toBeNull();
    expect(blogPostApiError(new Error('x'))).toBeNull();
  });
});

describe('BlogAdminApi', () => {
  let api: BlogAdminApi;
  let http: HttpTestingController;

  const payload: BlogPostPayload = {
    naslov: '  Šetnja  ',
    slug: null,
    sadrzaj: '<p>Čćžšđ</p>\n',
    kategorijaId: 2,
    slikaNaslovna: '',
    status: 'objavljen',
    tagIds: [3, 1],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(BlogAdminApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts the trimmed body with tags as a comma list and without an empty slug', () => {
    let created: CreatedBlogPost | undefined;
    api.createPost(payload).subscribe((post) => (created = post));

    const request = http.expectOne('blog/create');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      naslov: 'Šetnja',
      sadrzaj: '<p>Čćžšđ</p>',
      kategorijaId: 2,
      slikaNaslovna: null,
      status: 'objavljen',
      tagIds: '3,1',
    });

    request.flush(
      {
        message: 'Post je objavljen.',
        data: {
          id: '42',
          naslov: 'Šetnja',
          slug: 'setnja',
          status: 'objavljen',
          kategorijaId: 2,
          slikaNaslovna: null,
          autorId: 7,
          objavljenU: '2026-09-26 12:00:00',
          kreiranU: '2026-09-26 12:00:00',
        },
        tagIds: [3, 1],
      },
      { status: 201, statusText: 'Created' },
    );

    expect(created).toEqual({
      id: 42,
      naslov: 'Šetnja',
      slug: 'setnja',
      status: 'objavljen',
      kategorijaId: 2,
      slikaNaslovna: null,
      objavljenU: '2026-09-26 12:00:00',
      kreiranU: '2026-09-26 12:00:00',
      tagIds: [3, 1],
    });
  });

  it('sends a slug the admin typed', () => {
    api.createPost({ ...payload, slug: 'moj-slug' }).subscribe();
    expect(http.expectOne('blog/create').request.body.slug).toBe('moj-slug');
  });

  it('maps categories and tags from the data envelope', () => {
    let categories: unknown;
    let tags: unknown;
    api.listCategories().subscribe((value) => (categories = value));
    api.listTags().subscribe((value) => (tags = value));

    http.expectOne('blog/categories').flush({ data: [{ id: '1', naziv: 'Saveti' }], total: 1 });
    http.expectOne('blog/tags').flush({ data: [{ id: 5, naziv: 'Šetnja' }], total: 1 });

    expect(categories).toEqual([{ id: 1, naziv: 'Saveti' }]);
    expect(tags).toEqual([{ id: 5, naziv: 'Šetnja' }]);
  });
});
