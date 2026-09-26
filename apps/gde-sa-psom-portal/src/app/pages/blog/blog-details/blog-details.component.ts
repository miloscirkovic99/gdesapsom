import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BlogService, Post } from '@gde/shared/data-access';
import { SeoService, SITE_ORIGIN } from '../../../core/services/seo.service';
import { blogPostingStructuredData } from '../../../shared/utils/structured-data';

const STRUCTURED_DATA_ID = 'blog-post';

@Component({
  selector: 'app-blog-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-details.component.html',
  styleUrl: './blog-details.component.scss',
})
export class BlogDetailsComponent implements OnInit, OnDestroy {
  private blogService = inject(BlogService);
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private seoService  = inject(SeoService);

  post       = signal<Post | null>(null);
  ucitavanje = signal(false);
  greska     = signal('');

  // Uvek vraća stabilan niz — nikad undefined
  tagovi = computed<string[]>(() => {
    const t = this.post()?.tagovi;
    if (!t || typeof t !== 'string') return [];
    return t.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  });

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
        const postData = data?.blogPostSingle?.[0] || data;
        this.post.set(postData);
        this.ucitavanje.set(false);

        if (postData?.naslov) {
          const path = `/blog/${postData.slug ?? slug}`;
          // The template loads the cover from /assets/slike/, and so must crawlers.
          const image = postData.slika_naslovna
            ? `${SITE_ORIGIN}/assets/slike/${postData.slika_naslovna}`
            : null;

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
        }
      },
      error: (err) => {
        this.seoService.clearStructuredData(STRUCTURED_DATA_ID);
        this.greska.set('Članak nije pronađen ili je došlo do greške. Vrati se na blog.');
        this.ucitavanje.set(false);
        console.error('Blog post loading error:', err);
      }
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