import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { RouteConstants } from '../../constants/route.constant';

/** Segmented switch between the two catalog lists, shown on both list pages. */
@Component({
  selector: 'app-catalog-nav',
  imports: [RouterLink, RouterLinkActive, TranslocoModule],
  template: `
    <nav class="join" [attr.aria-label]="'catalog_nav_label' | transloco">
      <a
        [routerLink]="'/' + routes.dogFood"
        routerLinkActive="btn-secondary"
        #food="routerLinkActive"
        [class.btn-ghost]="!food.isActive"
        [class.border-base-300]="!food.isActive"
        [attr.aria-current]="food.isActive ? 'page' : null"
        class="btn btn-sm join-item gap-1.5 border"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 11.25h18a9 9 0 0 1-18 0Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 11.25V8.5a3.75 3.75 0 0 1 7.5 0v2.75" />
        </svg>
        {{ 'catalog_nav_food' | transloco }}
      </a>
      <a
        [routerLink]="'/' + routes.petShops"
        routerLinkActive="btn-secondary"
        #shops="routerLinkActive"
        [class.btn-ghost]="!shops.isActive"
        [class.border-base-300]="!shops.isActive"
        [attr.aria-current]="shops.isActive ? 'page' : null"
        class="btn btn-sm join-item gap-1.5 border"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0-11.25h-3.02m0 0c.162-.224.243-.479.243-.75a1.5 1.5 0 0 0-1.5-1.5h-2.25a1.5 1.5 0 0 0-1.5 1.5c0 .271.081.526.243.75m9.02 0h-.808m-15.5 0H6m15 0a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5m12 0c0 .071-.005.142-.015.212M21 9V6a1.5 1.5 0 0 0-1.5-1.5H4.5A1.5 1.5 0 0 0 3 6v3" />
        </svg>
        {{ 'catalog_nav_shops' | transloco }}
      </a>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogNavComponent {
  readonly routes = RouteConstants;
}
