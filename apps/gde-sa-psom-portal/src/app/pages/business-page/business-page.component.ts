import { Component, effect, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { RouteConstants } from '@gde/shared/util';
import { SeoService } from '../../core/services/seo.service';
import { faqPageStructuredData } from '../../shared/utils/structured-data';

const FAQ_STRUCTURED_DATA_ID = 'business-faq';
/** The questions the page shows, in order; the FAQPage schema repeats them word for word. */
const FAQ_KEYS = ['faq_q1', 'faq_a1', 'faq_q2', 'faq_a2', 'faq_q3', 'faq_a3'];

@Component({
  selector: 'app-business-page',
  imports: [CommonModule, TranslocoModule, RouterLink],
  templateUrl: './business-page.component.html',
  styleUrl: './business-page.component.scss',
})
export class BusinessPageComponent implements OnDestroy {
  readonly #seo = inject(SeoService);
  readonly #faq = toSignal(inject(TranslocoService).selectTranslate<string[]>(FAQ_KEYS));
  routeConstants = RouteConstants;

  constructor() {
    effect(() => {
      const t = this.#faq();
      if (!t) return;
      const data = faqPageStructuredData([
        { question: t[0], answer: t[1] },
        { question: t[2], answer: t[3] },
        { question: t[4], answer: t[5] },
      ]);
      if (data) this.#seo.setStructuredData(FAQ_STRUCTURED_DATA_ID, data);
    });
  }

  ngOnDestroy(): void {
    this.#seo.clearStructuredData(FAQ_STRUCTURED_DATA_ID);
  }
}
