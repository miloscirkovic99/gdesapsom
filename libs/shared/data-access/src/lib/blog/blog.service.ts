import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Post } from './post';

/** `blog/getAll` wraps the list, `blog/getAll/:slug` wraps a one-element array. */
export interface BlogListResponse {
  blogList: Post[];
}
export interface BlogPostResponse {
  blogPostSingle?: Post[];
}

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private http = inject(HttpClient);

  getSviPostovi(): Observable<BlogListResponse> {
    return this.http.get<BlogListResponse>(`blog/getAll`);
  }

  getPost(slug: string): Observable<BlogPostResponse> {
    return this.http.get<BlogPostResponse>(`blog/getAll/${slug}`);
  }

  /** Published posts, newest first as the API sends them. */
  list(): Observable<Post[]> {
    return this.getSviPostovi().pipe(map((r) => r?.blogList ?? []));
  }

  /** One post, or null when the slug does not exist. */
  bySlug(slug: string): Observable<Post | null> {
    return this.getPost(slug).pipe(map((r) => r?.blogPostSingle?.[0] ?? null));
  }
}
