import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import AOS from 'aos';
import { CardComponent } from '../../shared/components/card/card.component';
import { SpotsStore } from '../../shared/store/spots.store';
import { RouteConstants } from '../../shared/constants/route.constant';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { ParksStore } from '../../shared/store/parks.store';

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, CardComponent,TranslocoModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  spotsStore = inject(SpotsStore);
  parksStore=inject(ParksStore)
  routeConstants = RouteConstants;
  private router = inject(Router);
  howItWorks = [
    {
      id: 1,
      title: 'free_search',
      duration: 800,
    },
    {
      id: 2,
      title: 'free_add',
      duration: 1000,
    },
    {
      id: 3,
      title: 'pet_welcome',
      duration: 1200,
    },
  ];
  
  navigateTo(route: any) {
    this.router.navigate([`${route}`]);
  }
}
