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
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonSkeletonText } from '@ionic/angular/ion-skeleton-text';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import type { RefresherCustomEvent } from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline } from 'ionicons/icons';
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
    IonSkeletonText,
    IonIcon,
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
          <div class="list-skeleton" aria-hidden="true">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="skeleton-row">
                <div class="skeleton-lines">
                  <ion-skeleton-text [animated]="true" style="width: 30%" />
                  <ion-skeleton-text [animated]="true" style="width: 85%; height: 16px" />
                  <ion-skeleton-text [animated]="true" style="width: 25%" />
                </div>
              </div>
            }
          </div>
        }
        @case ('error') {
          <div class="app-state">
            <ion-icon name="cloud-offline-outline" aria-hidden="true" />
            <p>{{ 'catalog_error' | transloco }}</p>
            <ion-button fill="outline" (click)="load()">{{ 'try_again' | transloco }}</ion-button>
          </div>
        }
        @default {
          <ion-list lines="inset" class="posts">
            @for (post of posts(); track post.post_id) {
              <ion-item [routerLink]="['/tabs/more/blog', post.slug]" detail="true">
                <ion-label class="ion-text-wrap">
                  <p class="app-eyebrow">{{ post.kategorija }} · {{ minutes(post) }} min</p>
                  <h2>{{ post.naslov }}</h2>
                  <p class="date">{{ post.objavljen_u | slice: 0 : 10 }}</p>
                </ion-label>
              </ion-item>
            }
          </ion-list>
        }
      }
    </ion-content>
  `,
  styles: `
    .list-skeleton,
    .posts {
      padding-top: 8px;
    }
    .posts ion-item {
      --min-height: 96px;
    }
    .posts ion-label {
      margin-block: 14px;
    }
    .posts h2 {
      margin: 2px 0 4px;
      font-size: 1.0625rem;
      line-height: 1.35;
    }
    .date {
      color: var(--app-text-2);
      font-size: 0.8125rem !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogListPage {
  private readonly blog = inject(BlogService);

  readonly posts = signal<Post[]>([]);
  readonly status = signal<'loading' | 'loaded' | 'error'>('loading');

  constructor() {
    addIcons({ cloudOfflineOutline });
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
