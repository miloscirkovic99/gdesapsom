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
    title:'Gde sa psom - Pet-Friendly Restorani, Kafići, Hoteli i Parkovi za Pse u Srbiji'

  },
  {
    path:RouteConstants.allSpots,
    loadComponent: () => {
      return import('./features/pet-spots-facilities/pet-spots-facilities.component').then(
        (m) => m.PetSpotsFacilitiesComponent
      );
    },
    data:["User"],
    title:'Pet-Friendly Restorani i Kafići u Srbiji - Gde sa psom'

  },
  {
    path:RouteConstants.vet_clinics,
    loadComponent: () => {
      return import('./features/veterinary-clinics/veterinary-clinics.component').then(
        (m) => m.VeterinaryClinicsComponent
      );
    },
    title:'Veterinarske Klinike i Ambulante u Srbiji - Gde sa psom'

  },
  {
    path:RouteConstants.petParks,
    loadComponent: () => {
      return import('./features/pet-parks/pet-parks.component').then(
        (m) => m.PetParksComponent
      );
    },
    title:'Parkovi za Pse u Beogradu i Srbiji - Gde sa psom'
  },
  {
    path:RouteConstants.about,
    loadComponent: () => {
      return import('./pages/about-us/about-us.component').then(
        (m) => m.AboutUsComponent
      );
    },
    title:'O nama - Gde sa psom | Platforma za Vlasnike Ljubimaca'
  
  },
  {
    path:RouteConstants.cookiesPolicy,
    loadComponent: () => {
      return import('./pages/cookies-page/cookie-page.component').then(
        (m) => m.CookiePageComponent
      );
    },
    title:'Politika Kolačića - Gde sa psom'
  },
  {
    path: RouteConstants.addSpot,
    loadComponent: () => {
      return import('./pages/add-spot/add-spot-page.component').then(
        (m) => m.AddSpotPageComponent
      );
    },
    title: 'Dodaj Pet-Friendly Objekat - Gde sa psom'
  },
  {
    path: RouteConstants.addPark,
    loadComponent: () => {
      return import('./pages/add-park/add-park-page.component').then(
        (m) => m.AddParkPageComponent
      );
    },
    title: 'Dodaj Park za Ljubimce - Gde sa psom'
  },
  {
    path: RouteConstants.spotDetail,
    loadComponent: () => {
      return import('./pages/spot-detail/spot-detail-page.component').then(
        (m) => m.SpotDetailPageComponent
      );
    },
    title: 'Gde sa psom - Spot Details'
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
      path: '', 
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
