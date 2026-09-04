import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { AnalyticsService } from './analytics.service';
import { ContentType, SCROLL_DEPTH_MILESTONES, ScrollDepth } from './analytics.taxonomy';

/**
 * Sends `scroll_depth` at 25 / 50 / 75 / 90 % of the host element, each
 * milestone at most once per content id.
 *
 * ```html
 * <article [appScrollDepth]="post.slug">…</article>
 * ```
 *
 * Listens outside the Angular zone so scrolling never triggers change
 * detection, and throttles measurement to one animation frame.
 */
@Directive({
  selector: '[appScrollDepth]',
})
export class ScrollDepthDirective implements OnInit, OnDestroy {
  readonly contentId = input.required<string>({ alias: 'appScrollDepth' });
  readonly contentType = input<ContentType>(ContentType.article, {
    alias: 'appScrollDepthContentType',
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly analytics = inject(AnalyticsService);
  private readonly zone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly reached = new Set<ScrollDepth>();
  private frame: number | null = null;
  private initialCheck: ReturnType<typeof setTimeout> | null = null;

  private readonly onScroll = (): void => {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.measure();
    });
  };

  constructor() {
    // Same component instance can show another article (slug change): start over.
    effect(() => {
      this.contentId();
      this.reached.clear();
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const win = this.document.defaultView;
    if (!win) return;

    this.zone.runOutsideAngular(() => {
      win.addEventListener('scroll', this.onScroll, { passive: true });
      win.addEventListener('resize', this.onScroll, { passive: true });
      // A short article can be fully visible without any scrolling.
      this.initialCheck = setTimeout(() => this.measure(), 0);
    });
  }

  ngOnDestroy(): void {
    const win = this.document.defaultView;
    win?.removeEventListener('scroll', this.onScroll);
    win?.removeEventListener('resize', this.onScroll);
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    if (this.initialCheck !== null) clearTimeout(this.initialCheck);
  }

  private measure(): void {
    const win = this.document.defaultView;
    const element = this.host.nativeElement;
    const height = element.offsetHeight;
    if (!win || !height) return;

    const top = element.getBoundingClientRect().top + win.scrollY;
    const viewportBottom = win.scrollY + win.innerHeight;
    const percent = Math.min(100, Math.max(0, ((viewportBottom - top) / height) * 100));

    for (const milestone of SCROLL_DEPTH_MILESTONES) {
      if (percent < milestone || this.reached.has(milestone)) continue;
      this.reached.add(milestone);
      this.analytics.trackScrollDepth({
        content_id: this.contentId(),
        content_type: this.contentType(),
        percent_scrolled: milestone,
      });
    }
  }
}
