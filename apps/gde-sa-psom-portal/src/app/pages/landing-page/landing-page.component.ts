import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import AOS from 'aos';
import { CardComponent } from '../../shared/components/card/card.component';
import { SpotsStore } from '../../shared/store/spots.store';
import { RouteConstants } from '../../shared/constants/route.constant';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, CardComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  spotsStore = inject(SpotsStore);
  routeConstants = RouteConstants;
  private router = inject(Router);
  howItWorks = [
    {
      id: 1,
      title: 'Besplatno pretražujete pet-friendly lokacije',
      duration: 800,
    },
    {
      id: 2,
      title: 'Besplatno dodajete nove objekte i pomažete zajednici',
      duration: 1000,
    },
    {
      id: 3,
      title: 'Uvek znate gde je vaš ljubimac zaista dobrodošao!',
      duration: 1200,
    },
  ];
  
  navigateTo(route: any) {
    this.router.navigate([`${route}`]);
  }
}
