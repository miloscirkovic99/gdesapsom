import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { IonThumbnail } from '@ionic/angular/ion-thumbnail';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import type { RefresherCustomEvent } from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, newspaperOutline } from 'ionicons/icons';
import { BlogService, Post, postCoverUrl } from '@gde/shared/data-access';
import { injectActiveLang, SITE_ORIGIN } from '@gde/shared/util';
import { PostDatePipe, postTags } from './post-meta';
import { readingMinutes } from './reading-time';

/** A row shows this many tags; the rest are counted ("+7"). */
const TAGS_SHOWN = 3;

/** A post as a list row reads it. */
interface PostRow {
  post: Post;
  cover: string | null;
  minutes: number;
  tags: string[];
  moreTags: number;
}

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
    IonThumbnail,
    IonSkeletonText,
    IonIcon,
    IonButton,
    TranslocoPipe,
    PostDatePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/more" text="" [attr.aria-label]="'back' | transloco" />
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
                <ion-skeleton-text [animated]="true" class="skeleton-thumb" />
                <div class="skeleton-lines">
                  <ion-skeleton-text [animated]="true" style="width: 30%" />
                  <ion-skeleton-text [animated]="true" style="width: 85%; height: 16px" />
                  <ion-skeleton-text [animated]="true" style="width: 45%" />
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
            @for (row of rows(); track row.post.post_id) {
              <ion-item [routerLink]="['/tabs/more/blog', row.post.slug]" detail="false">
                <ion-thumbnail slot="start" class="cover">
                  @if (row.cover) {
                    <img [src]="row.cover" alt="" loading="lazy" />
                  } @else {
                    <span class="thumb-placeholder"><ion-icon name="newspaper-outline" aria-hidden="true" /></span>
                  }
                </ion-thumbnail>
                <ion-label class="ion-text-wrap">
                  <p class="app-eyebrow">
                    {{ row.post.kategorija || ('other' | transloco) }} · {{ row.minutes }} min
                  </p>
                  <h2>{{ row.post.naslov }}</h2>
                  <p class="meta">
                    {{ row.post.objavljen_u | postDate: lang() }} ·
                    {{ row.post.autor || ('blog_unknown_author' | transloco) }}
                  </p>
                  @if (row.tags.length) {
                    <span class="tags">
                      @for (tag of row.tags; track tag) {
                        <span class="tag">#{{ tag }}</span>
                      }
                      @if (row.moreTags) {
                        <span class="tag more">+{{ row.moreTags }}</span>
                      }
                    </span>
                  }
                </ion-label>
              </ion-item>
            } @empty {
              <div class="app-state">
                <ion-icon name="newspaper-outline" aria-hidden="true" />
                <p>{{ 'blog_list_empty' | transloco }}</p>
              </div>
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
      --min-height: 104px;
    }
    .posts ion-label {
      margin-block: 14px;
    }
    .posts h2 {
      margin: 2px 0 4px;
      font-size: 1.0625rem;
      line-height: 1.35;
    }
    /* Covers are wide photos: a square crop keeps the titles in one column. */
    ion-thumbnail.cover {
      --size: 72px;
      align-self: flex-start;
      margin: 16px 16px 16px 0;
    }
    ion-thumbnail.cover img {
      border-radius: var(--app-radius-sm);
      object-fit: cover;
      background: var(--app-surface-sunken);
    }
    .meta {
      color: var(--app-text-2);
      font-size: 0.8125rem !important;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .tag {
      padding: 2px 8px;
      border-radius: var(--app-radius-xs);
      background: var(--app-surface-sunken);
      color: var(--app-text-2);
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1.5;
    }
    .tag.more {
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogListPage {
  private readonly blog = inject(BlogService);

  readonly lang = injectActiveLang();
  readonly rows = signal<PostRow[]>([]);
  readonly status = signal<'loading' | 'loaded' | 'error'>('loading');

  constructor() {
    addIcons({ cloudOfflineOutline, newspaperOutline });
    this.load();
  }

  load(event?: RefresherCustomEvent): void {
    if (!event) this.status.set('loading');
    this.blog.list().subscribe({
      next: (posts) => {
        this.rows.set(posts.map((post) => this.#toRow(post)));
        this.status.set('loaded');
        void event?.target.complete();
      },
      error: () => {
        this.status.set('error');
        void event?.target.complete();
      },
    });
  }

  #toRow(post: Post): PostRow {
    const tags = postTags(post.tagovi);
    return {
      post,
      // A legacy file name on the website or a full URL from the admin form, as in the portal.
      cover: postCoverUrl(post.slika_naslovna, SITE_ORIGIN),
      minutes: readingMinutes(post.sadrzaj),
      tags: tags.slice(0, TAGS_SHOWN),
      moreTags: Math.max(0, tags.length - TAGS_SHOWN),
    };
  }
}
