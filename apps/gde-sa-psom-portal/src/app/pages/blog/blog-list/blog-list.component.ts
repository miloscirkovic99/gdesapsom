import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlogService } from '../blog.service';
import { Post } from '../../../shared/models/posts';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-blog-list',
  imports: [CommonModule, RouterModule,TranslocoModule],
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.scss',
})
export class BlogListComponent implements OnInit {
  private blogService = inject(BlogService);

  postovi = signal<any[]>([]);
  ucitavanje = signal(false);
  greska = signal('');

  ngOnInit() {
    this.loadPostovi();
  }

  private loadPostovi() {
    this.ucitavanje.set(true);
    this.greska.set('');

    this.blogService.getSviPostovi().subscribe({
      next: (data: any) => {
        this.postovi.set(data?.blogList || []);
        this.ucitavanje.set(false);
      },
      error: (err) => {
        this.greska.set('Greška pri učitavanju članaka. Molimo pokušajte ponovno.');
        this.ucitavanje.set(false);
        console.error('Blog loading error:', err);
      }
    });
  }

  /**
   * Calculates reading time in minutes based on content
   * Average reading speed: 200 words per minute
   */
  getReadingTime(htmlContent: string): number {
    if (!htmlContent) return 1;
    
    // Remove HTML tags
    const plainText = htmlContent.replace(/<[^>]*>/g, '');
    
    // Count words (split by whitespace)
    const wordCount = plainText.trim().split(/\s+/).length;
    
    // Calculate reading time (200 words per minute is average)
    const readingTime = Math.ceil(wordCount / 200);
    
    return readingTime < 1 ? 1 : readingTime;
  }

  /**
   * Splits comma-separated tags into array
   */
  getTags(tagovi: string): string[] {
    if (!tagovi) return [];
    return tagovi.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  }
}
