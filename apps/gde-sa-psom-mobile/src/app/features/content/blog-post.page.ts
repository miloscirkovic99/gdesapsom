import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { SlicePipe } from '@angular/common';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonSkeletonText } from '@ionic/angular/ion-skeleton-text';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { alertCircleOutline, shareSocialOutline } from 'ionicons/icons';
import { BlogService, Post, postCoverUrl } from '@gde/shared/data-access';
import { SITE_ORIGIN } from '@gde/shared/util';
import { ExternalLinkService } from '../../core/platform/external-link.service';
import { ShareService } from '../../core/platform/share.service';
import { revealTitleOnScroll } from '../../shared/title-reveal';
import { readingMinutes } from './reading-time';

@Component({
  selector: 'app-blog-post',
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonSkeletonText,
    TranslocoPipe,
    SlicePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/more/blog" text="" />
        </ion-buttons>
        <ion-title class="title-reveal" [class.revealed]="title.shown()">{{ post()?.naslov }}</ion-title>
        @if (post()) {
          <ion-buttons slot="end">
            <ion-button (click)="share()" [attr.aria-label]="'share' | transloco">
              <ion-icon slot="icon-only" name="share-social-outline" />
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>
    <ion-content [scrollEvents]="true" (ionScroll)="title.onScroll($event)">
      @switch (status()) {
        @case ('loading') {
          <div class="skeleton" aria-hidden="true">
            <ion-skeleton-text [animated]="true" style="width: 40%" />
            <ion-skeleton-text [animated]="true" style="width: 90%; height: 24px" />
            <ion-skeleton-text [animated]="true" style="width: 70%; height: 24px" />
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <ion-skeleton-text [animated]="true" style="width: 100%" />
            }
          </div>
        }
        @case ('error') {
          <div class="app-state">
            <ion-icon name="alert-circle-outline" aria-hidden="true" />
            <h3>{{ 'mobile_not_found' | transloco }}</h3>
            <ion-button fill="outline" (click)="load(slug())">{{ 'try_again' | transloco }}</ion-button>
          </div>
        }
        @default {
          @let p = post()!;
          <article class="post">
            @if (cover(); as src) {
              <img class="cover" [src]="src" [alt]="p.naslov" />
            }
            <p class="app-eyebrow">{{ p.kategorija }} · {{ minutes() }} min · {{ p.objavljen_u | slice: 0 : 10 }}</p>
            <h1 #headline>{{ p.naslov }}</h1>
            <!-- Sanitised by Angular. Links open in an in-app browser tab (see onContentClick). -->
            <div class="body" [innerHTML]="p.sadrzaj" (click)="onContentClick($event)"></div>
          </article>
        }
      }
    </ion-content>
  `,
  styles: `
    .post {
      padding: 8px var(--app-gutter) 40px;
    }
    .cover {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      margin-bottom: 20px;
      border-radius: var(--app-radius-lg);
      object-fit: cover;
      background: var(--app-surface-sunken);
    }
    h1 {
      margin: 0 0 20px;
    }
    .body {
      color: var(--app-text);
      font-size: 1.0625rem;
      line-height: 1.65;
    }
    .body ::ng-deep h2,
    .body ::ng-deep h3 {
      margin: 32px 0 8px;
      line-height: 1.3;
    }
    .body ::ng-deep h2 {
      font-size: 1.25rem;
    }
    .body ::ng-deep h3 {
      font-size: 1.0625rem;
    }
    .body ::ng-deep p {
      margin: 0 0 16px;
    }
    .body ::ng-deep img {
      max-width: 100%;
      height: auto;
      border-radius: var(--app-radius-md);
    }
    .body ::ng-deep a {
      color: var(--app-primary);
      font-weight: 500;
      text-underline-offset: 2px;
    }
    .skeleton {
      padding: 16px var(--app-gutter) 0;
    }
    .skeleton ion-skeleton-text {
      height: 12px;
      margin: 0 0 12px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogPostPage {
  /** Route param `:slug`. */
  readonly slug = input.required<string>();

  private readonly blog = inject(BlogService);
  private readonly links = inject(ExternalLinkService);
  private readonly sharing = inject(ShareService);

  readonly post = signal<Post | null>(null);
  readonly status = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly minutes = computed(() => readingMinutes(this.post()?.sadrzaj));
  /** A legacy file name on the website or a full URL from the admin form, as in the portal. */
  readonly cover = computed(() => postCoverUrl(this.post()?.slika_naslovna, SITE_ORIGIN));
  private readonly headline = viewChild<ElementRef<HTMLElement>>('headline');
  readonly title = revealTitleOnScroll(this.headline);

  constructor() {
    addIcons({ alertCircleOutline, shareSocialOutline });
    effect(() => {
      const slug = this.slug();
      untracked(() => this.load(slug));
    });
  }

  load(slug: string): void {
    this.status.set('loading');
    this.blog.bySlug(slug).subscribe({
      next: (post) => {
        this.post.set(post);
        this.status.set(post ? 'loaded' : 'error');
      },
      error: () => this.status.set('error'),
    });
  }

  onContentClick(event: MouseEvent): void {
    const anchor = (event.target as HTMLElement | null)?.closest('a');
    const href = anchor?.getAttribute('href');
    if (!anchor || !href || href.startsWith('#')) return;
    // AnalyticsService has already reported the tap (document click listener).
    event.preventDefault();
    const url = href.startsWith('/') ? `${SITE_ORIGIN}${href}` : href;
    if (/^https?:\/\//i.test(url)) void this.links.openWeb(url);
    else window.open(url, '_blank');
  }

  share(): void {
    const p = this.post();
    if (p) void this.sharing.share(p.naslov, `/blog/${p.slug}`, { type: 'blog_post', id: p.slug });
  }
}
