import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => {
      return import('./pages/landing-page/landing-page.component').then(
        (m) => m.LandingPageComponent
      );
    },
  },
  {
    path:'**',
    redirectTo:'',
    pathMatch:'full'
  }
];
