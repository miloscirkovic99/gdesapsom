import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PartnersSectionComponent } from '../../shared/components/partners-section/partners-section.component';

/**
 * /partneri: the link sent to partners and linked from the footer. For now the
 * same block as on the homepage, with "Partneri" as the page's h1.
 */
@Component({
  selector: 'app-partners-page',
  imports: [PartnersSectionComponent],
  template: `<app-partners-section asPage class="pt-8 sm:pt-12 lg:pt-16" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnersPageComponent {}
