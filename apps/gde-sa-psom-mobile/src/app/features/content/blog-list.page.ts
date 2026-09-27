import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonRefresher } from '@ionic/angular/ion-refresher';
import { IonRefresherContent } from '@ionic/angular/ion-refresher-content';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import type { RefresherCustomEvent } from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { BlogService, Post } from '@gde/shared/data-access';
import { readingMinutes } from './reading-time';

@Component({
  selector: 'app-blog-list',
  imports: [
    RouterLink,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonList,
    IonItem,
    IonLabel,
    IonSpinner,
    IonButton,
    TranslocoPipe,
    SlicePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/more" text="" />
        </ion-buttons>
        <ion-title>{{ 'blog' | transloco }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="load($event)">
        <ion-refresher-content />
      </ion-refresher>
      @switch (status()) {
        @case ('loading') {
          <div class="state"><ion-spinner /></div>
        }
        @case ('error') {
          <div class="state ion-padding">
            <p>{{ 'catalog_error' | transloco }}</p>
            <ion-button fill="outline" (click)="load()">{{ 'try_again' | transloco }}</ion-button>
          </div>
        }
        @default {
          <ion-list lines="full">
            @for (post of posts(); track post.post_id) {
              <ion-item [routerLink]="['/tabs/more/blog', post.slug]" detail="true">
                <ion-label class="ion-text-wrap">
                  <p class="meta">{{ post.kategorija }} · {{ minutes(post) }} min</p>
                  <h2>{{ post.naslov }}</h2>
                  <p>{{ post.objavljen_u | slice: 0 : 10 }}</p>
                </ion-label>
              </ion-item>
            }
          </ion-list>
        }
      }
    </ion-content>
  `,
  styles: `
    .state {
      text-align: center;
      color: var(--ion-color-medium);
      padding-top: 64px;
    }
    .meta {
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
    }
    h2 {
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogListPage {
  private readonly blog = inject(BlogService);

  readonly posts = signal<Post[]>([]);
  readonly status = signal<'loading' | 'loaded' | 'error'>('loading');

  constructor() {
    this.load();
  }

  load(event?: RefresherCustomEvent): void {
    if (!event) this.status.set('loading');
    this.blog.list().subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.status.set('loaded');
        void event?.target.complete();
      },
      error: () => {
        this.status.set('error');
        void event?.target.complete();
      },
    });
  }

  minutes(post: Post): number {
    return readingMinutes(post.sadrzaj);
  }
}
