import { ElementRef, Signal, signal } from '@angular/core';

/**
 * A detail page's toolbar title, shown only once the page's own headline has
 * scrolled under the bar, so the name is never on screen twice.
 *
 * `<ion-content [scrollEvents]="true" (ionScroll)="title.onScroll($event)">`
 * `<ion-title class="title-reveal" [class.revealed]="title.shown()">`
 */
export function revealTitleOnScroll(headline: Signal<ElementRef<HTMLElement> | undefined>) {
  const shown = signal(false);
  return {
    shown: shown.asReadonly(),
    onScroll(event: Event): void {
      const content = event.target as HTMLElement | null;
      const h1 = headline()?.nativeElement;
      if (!content || !h1) return;
      shown.set(h1.getBoundingClientRect().bottom < content.getBoundingClientRect().top);
    },
  };
}
