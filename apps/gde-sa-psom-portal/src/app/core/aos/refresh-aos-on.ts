import { effect } from '@angular/core';
import AOS from 'aos';

/**
 * Re-scans the page for `data-aos` elements whenever `source` changes, so
 * cards appended to a list animate in. Call it from a component constructor
 * or field initializer (it needs an injection context). The delay lets the
 * new cards render first.
 *
 * Stores stay free of UI code; the components that render their lists call
 * this instead.
 */
export function refreshAosOn(source: () => unknown): void {
  effect(() => {
    source();
    setTimeout(() => AOS.refresh(), 500);
  });
}
