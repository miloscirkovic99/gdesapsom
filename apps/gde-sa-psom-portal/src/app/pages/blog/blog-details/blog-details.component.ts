import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BlogService } from '../blog.service';
import { Post } from '../../../shared/models/posts';
import { SeoService } from '../../../core/services/seo.service';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { ScrollDepthDirective } from '../../../core/analytics/scroll-depth.directive';
import { classifyBlogLink } from '../../../core/analytics/blog-cta.helper';
import { ContentType, toSlug } from '../../../core/analytics/analytics.taxonomy';

@Component({
  selector: 'app-blog-details',
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollDepthDirective],
  templateUrl: './blog-details.component.html',
  styleUrl: './blog-details.component.scss',
})
export class BlogDetailsComponent implements OnInit {
  private blogService = inject(BlogService);
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private seoService  = inject(SeoService);
  private analytics   = inject(AnalyticsService);
  private document    = inject(DOCUMENT);

  post       = signal<Post | null>(null);
  ucitavanje = signal(false);
  greska     = signal('');
  /** Slug from the URL; used as the GA4 content id when the post itself has none. */
  slug       = signal('');

  // Uvek vraća stabilan niz — nikad undefined
  tagovi = computed<string[]>(() => {
    const t = this.post()?.tagovi;
    if (!t || typeof t !== 'string') return [];
    return t.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  });

  readonly contentId = computed(() => this.post()?.slug || this.slug());

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['slug']) {
        this.slug.set(params['slug']);
        this.loadPost(params['slug']);
      }
    });
  }

  private loadPost(slug: string) {
    this.ucitavanje.set(true);
    this.greska.set('');

    this.blogService.getPost(slug).subscribe({
      next: (data: any) => {
        const postData = data?.blogPostSingle?.[0] || data;
        this.post.set(postData);
        this.ucitavanje.set(false);

        if (postData?.naslov) {
          this.seoService.update({
            title: `${postData.naslov} - Gde sa psom Blog`,
            description: postData.sadrzaj,
            path: `/blog/${postData.slug ?? slug}`,
            image: postData.slika_naslovna,
            type: 'article',
          });
        }

        this.analytics.trackBlogView({
          content_id: postData?.slug ?? slug,
          content_category: toSlug(postData?.kategorija),
          content_type: ContentType.article,
        });
      },
      error: (err) => {
        this.greska.set('Članak nije pronađen ili je došlo do greške. Vrati se na blog.');
        this.ucitavanje.set(false);
        console.error('Blog post loading error:', err);
      }
    });
  }

  /**
   * The article body is CMS HTML rendered via innerHTML, so its links cannot
   * carry Angular handlers. One delegated listener classifies whichever anchor
   * was clicked and reports it as a blog CTA.
   */
  onArticleClick(event: MouseEvent): void {
    const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]');
    if (!anchor) return;

    const target = classifyBlogLink(anchor.getAttribute('href'), this.document.location.origin);
    if (!target) return;

    this.analytics.trackBlogCtaClick({
      content_id: this.contentId(),
      ...target,
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
}
