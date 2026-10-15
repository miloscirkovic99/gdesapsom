import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@ngneat/transloco';
import { RouterModule } from '@angular/router';
import { injectActiveLang, LocalNamePipe, RouteConstants } from '@gde/shared/util';
import { ConsentService } from '../../../core/consent/consent.service';
import { allHubLinks } from '../../../features/pet-friendly/pet-friendly-pages';

@Component({
  selector: 'app-footer',
  imports: [CommonModule,TranslocoModule,RouterModule,LocalNamePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  date = new Date().getFullYear()
  routeConstants = RouteConstants;
  /** "Podešavanja kolačića" reopens the banner so the choice can be changed any time. */
  readonly consent = inject(ConsentService);
  /** Every page links to the city and category hubs, so crawlers reach them from anywhere. */
  readonly hubs = allHubLinks();
  readonly lang = injectActiveLang();

}
