import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
  { path: 'tabs', loadChildren: () => import('./tabs/tabs.routes').then((m) => m.TAB_ROUTES) },
  { path: '**', redirectTo: 'tabs/home' },
];
