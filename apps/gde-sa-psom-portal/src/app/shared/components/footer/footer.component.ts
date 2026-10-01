import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@ngneat/transloco';
import { RouterModule } from '@angular/router';
import { RouteConstants } from '@gde/shared/util';
import { ConsentService } from '../../../core/consent/consent.service';

@Component({
  selector: 'app-footer',
  imports: [CommonModule,TranslocoModule,RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  date = new Date().getFullYear()
  routeConstants = RouteConstants;
  /** "Podešavanja kolačića" reopens the banner so the choice can be changed any time. */
  readonly consent = inject(ConsentService);

}
