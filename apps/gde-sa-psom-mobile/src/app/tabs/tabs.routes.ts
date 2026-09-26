import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

/**
 * One child per tab. Pages opened from a tab (details, forms) are nested under
 * it so each tab keeps its own navigation stack.
 */
export const TAB_ROUTES: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      { path: 'home', loadComponent: () => import('../features/home/home.page').then((m) => m.HomePage) },
      { path: 'places', loadComponent: () => import('../features/places/places.page').then((m) => m.PlacesPage) },
      { path: 'vets', loadComponent: () => import('../features/vets/vets.page').then((m) => m.VetsPage) },
      { path: 'catalog', loadComponent: () => import('../features/catalog/catalog.page').then((m) => m.CatalogPage) },
      { path: 'more', loadComponent: () => import('../features/more/more.page').then((m) => m.MorePage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
