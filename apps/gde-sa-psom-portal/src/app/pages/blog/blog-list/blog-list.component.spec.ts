import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BlogService } from '@gde/shared/data-access';
import { TranslocoTestingModule } from '@ngneat/transloco';
import { Observable, of, throwError } from 'rxjs';
import { BlogListComponent } from './blog-list.component';

describe('BlogListComponent', () => {
  let response: () => Observable<unknown>;

  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [
        BlogListComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            en: {
              blog_list_load_error: 'The articles cannot be loaded right now. Please try again in a moment.',
              blog_list_empty: 'No articles published yet. Follow us for new content!',
              other: 'Other',
              read_more: 'Read More',
            },
          },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
          preloadLangs: true,
        }),
      ],
      providers: [provideRouter([]), { provide: BlogService, useValue: { getSviPostovi: () => response() } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(BlogListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('reports a failed load in the active language', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    response = () => throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }));

    expect((await render()).textContent).toContain('The articles cannot be loaded right now.');
  });

  it('says so in the active language when there are no articles', async () => {
    response = () => of({ blogList: [] });

    expect((await render()).textContent).toContain('No articles published yet.');
  });

  it('labels a post without a category as Other', async () => {
    response = () =>
      of({ blogList: [{ post_id: 1, naslov: 'Naslov', slug: 'naslov', sadrzaj: '<p>Tekst</p>', objavljen_u: '2026-04-29' }] });

    expect((await render()).querySelector('.card-body .badge')?.textContent?.trim()).toBe('Other');
  });
});
