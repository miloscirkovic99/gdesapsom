import { Route } from '@angular/router';
import { RouteConstants } from './shared/constants/route.constant';

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
    path:RouteConstants.allSpots,
    loadComponent: () => {
      return import('./pages/pet-spots-facilities/pet-spots-facilities.component').then(
        (m) => m.PetSpotsFacilitiesComponent
      );
    },
  },
  {
    path:RouteConstants.petParks,
    loadComponent: () => {
      return import('./pages/pet-parks/pet-parks.component').then(
        (m) => m.PetParksComponent
      );
    },
  },
  {
    path:RouteConstants.about,
    loadComponent: () => {
      return import('./pages/about-us/about-us.component').then(
        (m) => m.AboutUsComponent
      );
    },
  },
  {
    path:'**',
    redirectTo:'',
    pathMatch:'full'
  }
];
