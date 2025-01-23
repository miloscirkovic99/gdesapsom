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
    title:'Gde sa psom'

  },
  {
    path:RouteConstants.allSpots,
    loadComponent: () => {
      return import('./pages/pet-spots-facilities/pet-spots-facilities.component').then(
        (m) => m.PetSpotsFacilitiesComponent
      );
    },
    title:'Gde sa psom - Pet Spots'

  },
  {
    path:RouteConstants.petParks,
    loadComponent: () => {
      return import('./pages/pet-parks/pet-parks.component').then(
        (m) => m.PetParksComponent
      );
    },
    title:'Gde sa psom - Pet Parks'
  },
  {
    path:RouteConstants.about,
    loadComponent: () => {
      return import('./pages/about-us/about-us.component').then(
        (m) => m.AboutUsComponent
      );
    },
    title:'Gde sa psom - About Us'

  },
  {
    path:'**',
    redirectTo:'',
    pathMatch:'full'
  }
];
