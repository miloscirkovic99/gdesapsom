import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@ngneat/transloco';
import { RouterModule } from '@angular/router';
import { RouteConstants } from '@gde/shared/util';

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

}
