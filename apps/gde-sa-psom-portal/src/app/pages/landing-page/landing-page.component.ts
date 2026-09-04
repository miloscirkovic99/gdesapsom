import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import AOS from 'aos';
import { CardComponent } from '../../shared/components/card/card.component';
import { SpotsStore } from '../../shared/store/spots.store';
import { RouteConstants } from '../../shared/constants/route.constant';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { ParksStore } from '../../shared/store/parks.store';
import { VetClinicsStore } from '../../shared/store/vetclinics.store';

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, CardComponent,TranslocoModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  
})
export class LandingPageComponent {
  spotsStore = inject(SpotsStore);
  parksStore=inject(ParksStore)
  vetClinicsStore = inject(VetClinicsStore);
  routeConstants = RouteConstants;
  private router = inject(Router);
  howItWorks = [
    {
      id: 1,
      title: 'free_search',
      duration: 600,
    },
    {
      id: 2,
      title: 'free_add',
      duration: 700,
    },
    {
      id: 3,
      title: 'pet_welcome',
      duration: 850,
    },
  ];

  quickFilters = [
    { label: 'filter_restaurants', icon: '🍽️', type: 'spot', spotType: 'Restoran' },
    { label: 'filter_cafes', icon: '☕', type: 'spot', spotType: 'Kafić' },
    { label: 'filter_hotels', icon: '🏨', type: 'spot', spotType: 'Hotel' },
    { label: 'filter_parks', icon: '🌳', type: 'parks' },
    { label: 'filter_vet', icon: '🐾', type: 'vet' },
    { label: 'filter_dog_food', icon: '🦴', type: 'food' },
    { label: 'filter_pet_shops', icon: '🛍️', type: 'shops' },
  ];

  navigateTo(route: any) {
    this.router.navigate([`${route}`]);
  }

  onQuickFilter(filter: any) {
    if (filter.type === 'spot') {
      this.router.navigate([`/${RouteConstants.allSpots}`], {
        queryParams: { spotType: filter.spotType },
      });
    } else if (filter.type === 'parks') {
      this.router.navigate([`/${RouteConstants.petParks}`]);
    } else if (filter.type === 'vet') {
      this.router.navigate([`/${RouteConstants.vet_clinics}`]);
    } else if (filter.type === 'food') {
      this.router.navigate([`/${RouteConstants.dogFood}`]);
    } else if (filter.type === 'shops') {
      this.router.navigate([`/${RouteConstants.petShops}`]);
    }
  }
}
