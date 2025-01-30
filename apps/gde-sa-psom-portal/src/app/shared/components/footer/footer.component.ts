import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@ngneat/transloco';
import { RouterModule } from '@angular/router';
import { RouteConstants } from '../../constants/route.constant';

@Component({
  selector: 'app-footer',
  imports: [CommonModule,TranslocoModule,RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  date = new Date().getFullYear()
  routeConstants = RouteConstants;

}
