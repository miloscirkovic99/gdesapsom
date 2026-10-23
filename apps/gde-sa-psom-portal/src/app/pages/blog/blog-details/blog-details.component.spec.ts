import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BlogService } from '@gde/shared/data-access';
import { TranslocoTestingModule } from '@ngneat/transloco';
import { Observable, of, throwError } from 'rxjs';
import { BlogDetailsComponent } from './blog-details.component';

describe('BlogDetailsComponent indexing', () => {
  let fixture: ComponentFixture<BlogDetailsComponent>;
  let response: () => Observable<unknown>;

  const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null;

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [
        BlogDetailsComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            rs: {
              blog_post_not_found: 'Članak nije pronađen. Možda je uklonjen ili je link pogrešan.',
              blog_post_load_error: 'Članak trenutno ne može da se učita. Pokušajte ponovo za nekoliko trenutaka.',
              blog_comments_one: 'i ima {{count}} komentar.',
              blog_comments_few: 'i ima {{count}} komentara.',
              blog_comments_many: 'i ima {{count}} komentara.',
              blog_reading_time: '{{minutes}} min čitanja',
              blog_editorial_team: 'Redakcija Gde sa psom',
              other: 'Ostalo',
            },
          },
          translocoConfig: { availableLangs: ['rs'], defaultLang: 'rs' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { params: of({ slug: 'nova-eu-pravila-putovanje-pas-april-2026' }) } },
        { provide: BlogService, useValue: { getPost: () => response() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogDetailsComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    document.head.querySelectorAll('meta[name="robots"]').forEach((node) => node.remove());
  });

  it('marks a post the API does not have as noindex', async () => {
    response = () => of({ blogPostSingle: [] });
    await render();

    expect(robots()).toBe('noindex, follow');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Članak nije pronađen.');
  });

  it('keeps the article indexable when the request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    response = () => throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }));
    await render();

    expect(robots()).not.toBe('noindex, follow');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Članak trenutno ne može da se učita');
  });

  it('counts the comments with the right Serbian plural', async () => {
    response = () =>
      of({
        blogPostSingle: [
          { naslov: 'Naslov', slug: 'naslov', sadrzaj: '<p>Tekst</p>', objavljen_u: '2026-04-29 01:03:21', broj_komentara: 3 },
        ],
      });
    await render();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('i ima 3 komentara.');
  });

  it('shows the reading time, category and author fallbacks in the active language', async () => {
    response = () =>
      of({ blogPostSingle: [{ naslov: 'Naslov', slug: 'naslov', sadrzaj: '<p>Tekst</p>', objavljen_u: '2026-04-29 01:03:21' }] });
    await render();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('1 min čitanja');
    expect(text).toContain('Ostalo');
    expect(text).toContain('Redakcija Gde sa psom');
  });

  it('signs posts from the admin account as the editorial team, and keeps a real name', async () => {
    response = () => of({ blogPostSingle: [{ naslov: 'Naslov', slug: 'naslov', sadrzaj: '<p>Tekst</p>', autor: 'Admin' }] });
    await render();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Redakcija Gde sa psom');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Admin');

    TestBed.resetTestingModule();
    response = () => of({ blogPostSingle: [{ naslov: 'Naslov', slug: 'naslov', sadrzaj: '<p>Tekst</p>', autor: 'Jelena Petrović' }] });
    await render();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Jelena Petrović');
  });

  it('links the article to the city and category pages', async () => {
    response = () => of({ blogPostSingle: [{ naslov: 'Naslov', slug: 'naslov', sadrzaj: '<p>Tekst</p>' }] });
    await render();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('nav[aria-labelledby="blog-directory-title"] a'),
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/beograd', '/novi-sad', '/kafici', '/smestaj', '/all-spots']),
    );
  });
});
