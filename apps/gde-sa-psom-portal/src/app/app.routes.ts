import { Route } from '@angular/router';
import { RouteConstants } from './shared/constants/route.constant';
import { authGuard } from './core/guards/auth.guard';

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
      return import('./features/pet-spots-facilities/pet-spots-facilities.component').then(
        (m) => m.PetSpotsFacilitiesComponent
      );
    },
    title:'Gde sa psom - Pet Spots'

  },
  {
    path:RouteConstants.petParks,
    loadComponent: () => {
      return import('./features/pet-parks/pet-parks.component').then(
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
   path:RouteConstants.admin,
   loadComponent:()=>{
    return import('./features/admin-page/admin-page.component').then((m)=>m.AdminPageComponent)
   },
   canActivate:[authGuard],
   title:'Gde sa psom - Admin',
   children:[
    {
      path:'settings-spot',
      loadComponent: () => {
        return import('./features/pet-parks/pet-parks.component').then(
          (m) => m.PetParksComponent
        );
      },
    },
    {
      path:'suggested-spot',
      loadComponent: () => {
        return import('./features/pet-spots-facilities/pet-spots-facilities.component').then(
          (m) => m.PetSpotsFacilitiesComponent
        );
      },
    },
 
   ]
  },
  {
    path:'login',
    loadComponent: () => {
      return import('./features/auth/sign-in/sign-in.component').then(
        (m) => m.SignInComponent
      );
    },
   },
  {
    path:'**',
    redirectTo:'',
    pathMatch:'full'
  }
];
