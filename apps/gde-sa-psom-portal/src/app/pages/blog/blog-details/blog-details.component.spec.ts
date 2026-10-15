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
          langs: { rs: {} },
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
  });

  it('keeps the article indexable when the request fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    response = () => throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }));
    await render();

    expect(robots()).not.toBe('noindex, follow');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Članak trenutno ne može da se učita');
  });
});
