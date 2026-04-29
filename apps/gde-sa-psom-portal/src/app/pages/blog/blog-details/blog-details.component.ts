import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BlogService } from '../blog.service';
import { Post } from '../../../shared/models/posts';

@Component({
  selector: 'app-blog-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-details.component.html',
  styleUrl: './blog-details.component.scss',
})
export class BlogDetailsComponent implements OnInit {
  private blogService = inject(BlogService);
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);

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
          document.title = postData.naslov + ' - Gde sa psom Blog';
        }
      },
      error: (err) => {
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
}