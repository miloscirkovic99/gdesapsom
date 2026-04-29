import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post } from '../../shared/models/posts';
import { environment } from 'apps/gde-sa-psom-portal/src/env/env.dev';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private http = inject(HttpClient);

  getSviPostovi(): Observable<Post[]> {
    return this.http.get<Post[]>(`blog/getAll`);
  }

  getPost(slug: string): Observable<Post> {
    return this.http.get<Post>(`blog/getAll/${slug}`);
  }
}