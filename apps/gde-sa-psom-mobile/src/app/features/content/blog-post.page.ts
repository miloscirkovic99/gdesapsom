import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { shareSocialOutline } from 'ionicons/icons';
import { BlogService, Post, postCoverUrl } from '@gde/shared/data-access';
import { SITE_ORIGIN } from '@gde/shared/util';
import { ExternalLinkService } from '../../core/platform/external-link.service';
import { ShareService } from '../../core/platform/share.service';
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
    IonSpinner,
    TranslocoPipe,
    SlicePipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/more/blog" text="" />
        </ion-buttons>
        <ion-title>{{ post()?.naslov }}</ion-title>
        @if (post()) {
          <ion-buttons slot="end">
            <ion-button (click)="share()" [attr.aria-label]="'share' | transloco">
              <ion-icon slot="icon-only" name="share-social-outline" />
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @switch (status()) {
        @case ('loading') {
          <div class="state"><ion-spinner /></div>
        }
        @case ('error') {
          <div class="state">
            <h3>{{ 'mobile_not_found' | transloco }}</h3>
            <ion-button fill="outline" (click)="load(slug())">{{ 'try_again' | transloco }}</ion-button>
          </div>
        }
        @default {
          @let p = post()!;
          @if (cover(); as src) {
            <img class="cover" [src]="src" [alt]="p.naslov" />
          }
          <p class="meta">{{ p.kategorija }} · {{ minutes() }} min · {{ p.objavljen_u | slice: 0 : 10 }}</p>
          <h1>{{ p.naslov }}</h1>
          <!-- Sanitised by Angular. Links open in an in-app browser tab (see onContentClick). -->
          <article class="body" [innerHTML]="p.sadrzaj" (click)="onContentClick($event)"></article>
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
    .cover {
      width: 100%;
      border-radius: 12px;
      margin-bottom: 12px;
    }
    .meta {
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      color: var(--ion-color-medium);
      margin: 0;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.25;
    }
    .body {
      line-height: 1.6;
      font-size: 1.02rem;
    }
    .body ::ng-deep img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    .body ::ng-deep a {
      color: var(--ion-color-primary);
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

  constructor() {
    addIcons({ shareSocialOutline });
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
