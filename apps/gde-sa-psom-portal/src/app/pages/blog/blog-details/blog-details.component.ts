import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BlogService, Post, postCoverUrl } from '@gde/shared/data-access';
import { injectActiveLang, LocalNamePipe, pluralKey, RouteConstants } from '@gde/shared/util';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { SeoService, SITE_ORIGIN } from '../../../core/services/seo.service';
import { blogPostingStructuredData, postAuthorName } from '../../../shared/utils/structured-data';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { allHubLinks } from '../../../features/pet-friendly/pet-friendly-pages';

const STRUCTURED_DATA_ID = 'blog-post';

@Component({
  selector: 'app-blog-details',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbComponent, TranslocoModule, LocalNamePipe],
  templateUrl: './blog-details.component.html',
  styleUrl: './blog-details.component.scss',
})
export class BlogDetailsComponent implements OnInit, OnDestroy {
  private blogService = inject(BlogService);
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private seoService  = inject(SeoService);
  private transloco   = inject(TranslocoService);
  readonly lang       = injectActiveLang();

  post       = signal<Post | null>(null);
  ucitavanje = signal(false);
  /** Translation key of the message shown instead of the article; empty when there is none. */
  greska     = signal('');

  /** blog_comments_one / _few / _many: "1 komentar", "3 komentara", "5 komentara". */
  readonly commentsKey = computed(() =>
    pluralKey('blog_comments', Number(this.post()?.broj_komentara ?? 0), this.lang()),
  );

  // Uvek vraća stabilan niz — nikad undefined
  tagovi = computed<string[]>(() => {
    const t = this.post()?.tagovi;
    if (!t || typeof t !== 'string') return [];
    return t.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  });

  /** A legacy file name under /assets/slike/ or a full URL from the admin form. */
  coverUrl = computed(() => postCoverUrl(this.post()?.slika_naslovna));

  /** Null for posts written from the admin account: those are signed by the editorial team. */
  readonly author = computed(() => postAuthorName(this.post()?.autor));

  /**
   * From the article to the directory: the travel posts bring most of the
   * search visitors, and these are the pages that answer where to go next.
   */
  readonly directoryLinks = allHubLinks();
  readonly routes = RouteConstants;

  /** Početna › Blog › {naslov}; also published as BreadcrumbList. */
  breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { labelKey: 'blog', link: ['/', RouteConstants.blog] },
    { label: this.post()?.naslov ?? '' },
  ]);

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['slug']) {
        this.loadPost(params['slug']);
      }
    });
  }

  private loadPost(slug: string) {
    this.ucitavanje.set(true);
    this.greska.set('');

    this.blogService.getPost(slug).subscribe({
      next: (data: any) => {
        // The API answers an unknown slug with an empty list, not an error.
        const postData = data?.blogPostSingle?.[0] ?? (data?.naslov ? data : null);
        this.ucitavanje.set(false);

        if (!postData?.naslov) {
          this.showNotFound();
          return;
        }

        this.post.set(postData);

        const path = `/blog/${postData.slug ?? slug}`;
        // Crawlers get the same cover as the template, as an absolute URL.
        const image = postCoverUrl(postData.slika_naslovna, SITE_ORIGIN);

        this.seoService.update({
          title: `${postData.naslov} - Gde sa psom Blog`,
          description: postData.sadrzaj,
          path,
          image,
          type: 'article',
        });

        const structuredData = blogPostingStructuredData(postData, {
          url: `${SITE_ORIGIN}${path}`,
          image,
          tags: this.tagovi(),
        });
        if (structuredData) this.seoService.setStructuredData(STRUCTURED_DATA_ID, structuredData);
      },
      // An unknown slug comes back as an empty list (handled above), so an
      // error is an outage: no noindex, or every failed fetch by Googlebot
      // would de-index a live article.
      error: (err) => {
        this.seoService.clearStructuredData(STRUCTURED_DATA_ID);
        this.ucitavanje.set(false);
        this.greska.set('blog_post_load_error');
        console.error('Blog post loading error:', err);
      }
    });
  }

  /**
   * Stays on the URL with `noindex` instead of showing an empty article under
   * the generic route title: the SPA answers 200 for any slug, so the robots
   * tag is what keeps a dead post URL out of the index.
   */
  private showNotFound() {
    this.greska.set('blog_post_not_found');
    this.seoService.update({
      title: `${this.transloco.translate('blog_post_not_found_title')} - Gde sa psom Blog`,
      noindex: true,
    });
  }

  getReadingTime(htmlContent: string = ''): number {
    if (!htmlContent) return 1;
    const plainText = htmlContent.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    return readingTime < 1 ? 1 : readingTime;
  }

  goBack() {
    this.router.navigate(['/blog']);
  }

  ngOnDestroy() {
    this.seoService.clearStructuredData(STRUCTURED_DATA_ID);
  }
}
