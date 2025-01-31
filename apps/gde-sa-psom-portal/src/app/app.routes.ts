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
    data:["User"],
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
    path:RouteConstants.cookiesPolicy,
    loadComponent: () => {
      return import('./pages/cookies-page/cookie-page.component').then(
        (m) => m.CookiePageComponent
      );
    },
    title:'Gde sa psom - Cookies Policy'
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
      path: '', // This will be the default route for 'admin', automatically redirects to 'settingSpots'
      pathMatch: 'full',
      redirectTo: RouteConstants.settingSpots
    },
    {
      path:RouteConstants.settingSpots,
   
      loadComponent: () => {
        return import('./features/admin-page/components/setting-active-spots/setting-spots.component').then(
          (m) => m.SettingSpotsComponent
        ); 
      },
      data:['Admin']
    },
    {
      path:RouteConstants.pendingSpots,
      loadComponent: () => {
        return import('./features/admin-page/components/pending-spots/pending-spots.component').then(
          (m) => m.PendingSpotsComponent
        );
      },
    },
    {
      path:RouteConstants.townships,
      loadComponent: () => {
        return import('./features/admin-page/components/setting-townships/setting-township.component').then(
          (m) => m.SettingTownshipComponent
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
