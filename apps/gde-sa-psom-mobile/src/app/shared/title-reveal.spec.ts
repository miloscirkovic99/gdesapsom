import { ElementRef, signal } from '@angular/core';
import { revealTitleOnScroll } from './title-reveal';

/** An element whose box edges are fixed numbers. */
function box(top: number, bottom: number): HTMLElement {
  return { getBoundingClientRect: () => ({ top, bottom }) } as HTMLElement;
}

function scrollEvent(content: HTMLElement): Event {
  return { target: content } as unknown as Event;
}

describe('revealTitleOnScroll', () => {
  const content = box(56, 800);

  it('stays hidden while the headline is below the bar', () => {
    const title = revealTitleOnScroll(signal(new ElementRef(box(300, 340))));
    title.onScroll(scrollEvent(content));
    expect(title.shown()).toBe(false);
  });

  it('shows once the headline has scrolled under the bar, and hides again on the way back', () => {
    const headline = signal(new ElementRef(box(0, 40)));
    const title = revealTitleOnScroll(headline);
    title.onScroll(scrollEvent(content));
    expect(title.shown()).toBe(true);

    headline.set(new ElementRef(box(100, 140)));
    title.onScroll(scrollEvent(content));
    expect(title.shown()).toBe(false);
  });

  it('does nothing before the headline has rendered', () => {
    const title = revealTitleOnScroll(signal<ElementRef<HTMLElement> | undefined>(undefined));
    title.onScroll(scrollEvent(content));
    expect(title.shown()).toBe(false);
  });
});
