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
    title:'Gde sa psom - Pet-Friendly Restorani, Kafići, Hoteli i Parkovi za Pse u Srbiji',
    data:{
      description:'Pronađite gde su psi dobrodošli u Srbiji! Pretražite pet-friendly restorane, kafiće, hotele, parkove za pse i veterinarske klinike u Beogradu, Novom Sadu i širom Srbije.'
    }

  },
  {
    path:RouteConstants.allSpots,
    loadComponent: () => {
      return import('./features/pet-spots-facilities/pet-spots-facilities.component').then(
        (m) => m.PetSpotsFacilitiesComponent
      );
    },
    title:'Pet-Friendly Restorani i Kafići u Srbiji - Gde sa psom',
    data:{
      description:'Kompletna lista pet-friendly objekata u Srbiji. Pretražite restorane, kafiće, hotele i barove u koje možete sa psom - po gradu, tipu objekta ili u vašoj blizini.'
    }

  },
  {
    path:RouteConstants.vet_clinics,
    loadComponent: () => {
      return import('./features/veterinary-clinics/veterinary-clinics.component').then(
        (m) => m.VeterinaryClinicsComponent
      );
    },
    title:'Veterinarske Klinike i Ambulante u Srbiji - Gde sa psom',
    data:{
      description:'Pronađite veterinarske klinike i ambulante u Srbiji. Adrese, kontakti i lokacije veterinara u Beogradu, Novom Sadu, Nišu i drugim gradovima.'
    }

  },
  {
    path:RouteConstants.petParks,
    loadComponent: () => {
      return import('./features/pet-parks/pet-parks.component').then(
        (m) => m.PetParksComponent
      );
    },
    title:'Parkovi za Pse u Beogradu i Srbiji - Gde sa psom',
    data:{
      description:'Parkovi i ograđeni prostori za pse u Srbiji. Pronađite najbliži park za šetnju i trčanje sa vašim ljubimcem u Beogradu, Novom Sadu i širom zemlje.'
    }
  },
  {
    path:RouteConstants.about,
    loadComponent: () => {
      return import('./pages/about-us/about-us.component').then(
        (m) => m.AboutUsComponent
      );
    },
    title:'O nama - Gde sa psom | Platforma za Vlasnike Ljubimaca',
    data:{
      description:'Gde sa psom je besplatna platforma koja povezuje vlasnike ljubimaca sa pet-friendly objektima u Srbiji. Saznajte ko smo i zašto smo pokrenuli ovu zajednicu.'
    }

  },
  {
    path:RouteConstants.business,
    loadComponent: () => {
      return import('./pages/business-page/business-page.component').then(
        (m) => m.BusinessPageComponent
      );
    },
    title:'Za Biznise - Listaj Svoju Lokaciju na Gde sa psom',
    data:{
      description:'Vlasnik ste kafića, restorana ili hotela? Dodajte svoj objekat na Gde sa psom potpuno besplatno i dođite do novih gostiju koji putuju sa ljubimcima.'
    }
  },
  {
  path:RouteConstants.blog,
    loadComponent: () => {
      return import('./pages/blog/blog-list/blog-list.component').then(
        (m) => m.BlogListComponent
      );
    },
    title:'Blog - Saveti, Priče i Vesti za Vlasnike Pasa - Gde sa psom',
    data:{
      description:'Saveti o nezi, ishrani i obuci pasa, vodiči za putovanja sa ljubimcem i vesti iz sveta pet-friendly Srbije. Blog platforme Gde sa psom.'
    }
  },
  {
    path:RouteConstants.blogDetails,
    loadComponent: () => {
      return import('./pages/blog/blog-details/blog-details.component').then(
        (m) => m.BlogDetailsComponent
      );
    },
    title:'Blog članak - Gde sa psom',
    // BlogDetailsComponent overwrites the title and description once the post loads.
    data:{
      description:'Saveti, priče i vesti za vlasnike pasa na blogu platforme Gde sa psom.'
    }
  },
  {
    path:RouteConstants.cookiesPolicy,
    loadComponent: () => {
      return import('./pages/cookies-page/cookie-page.component').then(
        (m) => m.CookiePageComponent
      );
    },
    title:'Politika Kolačića - Gde sa psom',
    data:{
      description:'Politika kolačića platforme Gde sa psom - koje kolačiće koristimo, zašto ih koristimo i kako možete da upravljate svojim izborom.'
    }
  },
  {
    path: RouteConstants.addSpot,
    loadComponent: () => {
      return import('./pages/add-spot/add-spot-page.component').then(
        (m) => m.AddSpotPageComponent
      );
    },
    title: 'Dodaj Pet-Friendly Objekat - Gde sa psom',
    data:{
      description:'Predložite novi pet-friendly objekat i pomozite drugim vlasnicima ljubimaca da ga pronađu. Dodavanje je besplatno.'
    }
  },
  {
    path: RouteConstants.addPark,
    loadComponent: () => {
      return import('./pages/add-park/add-park-page.component').then(
        (m) => m.AddParkPageComponent
      );
    },
    title: 'Dodaj Park za Ljubimce - Gde sa psom',
    data:{
      description:'Predložite park ili ograđeni prostor za pse i pomozite drugim vlasnicima ljubimaca da ga pronađu. Dodavanje je besplatno.'
    }
  },
  {
    path: RouteConstants.spotDetail,
    loadComponent: () => {
      return import('./pages/spot-detail/spot-detail-page.component').then(
        (m) => m.SpotDetailPageComponent
      );
    },
    title: 'Gde sa psom - Spot Details',
    // SpotDetailPageComponent overwrites the title and description once the spot loads.
    data:{
      description:'Detalji pet-friendly objekta - adresa, kontakt, tip objekta i koji ljubimci su dobrodošli.'
    }
  },
  {
    path: RouteConstants.dogFood,
    loadComponent: () => {
      return import('./features/dog-food/dog-food-catalog.component').then(
        (m) => m.DogFoodCatalogComponent
      );
    },
    title: 'Hrana za Pse - Uporedite Cene i Pronađite Prodavnicu - Gde sa psom',
    data:{
      description:'Katalog hrane za pse u Srbiji. Filtrirajte po brendu, tipu hrane, uzrastu i veličini rase, uporedite cene i pronađite prodavnicu u kojoj možete da kupite hranu za svog psa.'
    }
  },
  {
    path: RouteConstants.dogFoodDetail,
    loadComponent: () => {
      return import('./pages/dog-food-detail/dog-food-detail-page.component').then(
        (m) => m.DogFoodDetailPageComponent
      );
    },
    title: 'Hrana za pse - Gde sa psom',
    // DogFoodDetailPageComponent overwrites the title and description once the product loads.
    data:{
      description:'Detalji proizvoda - sastav, pakovanje, cene i prodavnice u kojima je hrana za pse dostupna.'
    }
  },
  {
    path: RouteConstants.petShops,
    loadComponent: () => {
      return import('./features/pet-shops/pet-shops.component').then(
        (m) => m.PetShopsComponent
      );
    },
    title: 'Prodavnice za Ljubimce u Srbiji - Pet Shop u Blizini - Gde sa psom',
    data:{
      description:'Pronađite pet shop u blizini. Adrese, kontakti, dostava preko Wolta i Glova i asortiman hrane za pse u prodavnicama za ljubimce širom Srbije.'
    }
  },
  {
    path: RouteConstants.petShopDetail,
    loadComponent: () => {
      return import('./pages/pet-shop-detail/pet-shop-detail-page.component').then(
        (m) => m.PetShopDetailPageComponent
      );
    },
    title: 'Prodavnica za ljubimce - Gde sa psom',
    // PetShopDetailPageComponent overwrites the title and description once the shop loads.
    data:{
      description:'Detalji prodavnice za ljubimce - adresa, kontakt, dostava i asortiman hrane za pse.'
    }
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
