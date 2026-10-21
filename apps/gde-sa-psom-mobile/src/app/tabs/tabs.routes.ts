import { Routes } from '@angular/router';
import { leaveFormGuard } from '../core/forms/leave-form';
import { TabsPage } from './tabs.page';

const spotDetail = () => import('../features/spots/spot-detail.page').then((m) => m.SpotDetailPage);

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
      { path: 'home/spots/:id', loadComponent: spotDetail },
      { path: 'places', loadComponent: () => import('../features/places/places.page').then((m) => m.PlacesPage) },
      { path: 'places/spots/:id', loadComponent: spotDetail },
      { path: 'vets', loadComponent: () => import('../features/vets/vets.page').then((m) => m.VetsPage) },
      { path: 'catalog', loadComponent: () => import('../features/catalog/catalog.page').then((m) => m.CatalogPage) },
      {
        path: 'catalog/food/:slug',
        loadComponent: () => import('../features/catalog/dog-food-detail.page').then((m) => m.DogFoodDetailPage),
      },
      {
        path: 'catalog/shops/:slug',
        loadComponent: () => import('../features/catalog/pet-shop-detail.page').then((m) => m.PetShopDetailPage),
      },
      { path: 'more', loadComponent: () => import('../features/more/more.page').then((m) => m.MorePage) },
      {
        path: 'more/suggest-spot',
        loadComponent: () => import('../features/suggest/suggest-spot.page').then((m) => m.SuggestSpotPage),
        canDeactivate: [leaveFormGuard],
      },
      {
        path: 'more/suggest-park',
        loadComponent: () => import('../features/suggest/suggest-park.page').then((m) => m.SuggestParkPage),
        canDeactivate: [leaveFormGuard],
      },
      { path: 'more/blog', loadComponent: () => import('../features/content/blog-list.page').then((m) => m.BlogListPage) },
      {
        path: 'more/blog/:slug',
        loadComponent: () => import('../features/content/blog-post.page').then((m) => m.BlogPostPage),
      },
      { path: 'more/about', loadComponent: () => import('../features/content/about.page').then((m) => m.AboutPage) },
      {
        path: 'more/business',
        loadComponent: () => import('../features/content/business.page').then((m) => m.BusinessPage),
      },
      {
        path: 'more/contact',
        loadComponent: () => import('../features/contact/contact.page').then((m) => m.ContactPage),
        canDeactivate: [leaveFormGuard],
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
];
