import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { SpotsStore } from '../../shared/store/spots.store';
import { ParksStore } from '../../shared/store/parks.store';
import { VetClinicsStore } from '../../shared/store/vetclinics.store';
import { RouteConstants } from '../../shared/constants/route.constant';
import { ContactFormService } from '../../shared/components/contact-form/contact-form.service';
import {
  descriptionToKeyMap,
  descriptionToKeyMapGarden,
  descriptionToKeyMapSpot,
} from '../../shared/helpers/map.helpers';

interface LandingCategory {
  /** i18n key for the chip label */
  label: string;
  /** null = "all", otherwise the spot type name the spots list filters on */
  spotType: string | null;
  /** target route; spot types all land on the spots list */
  route: string;
}

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  spotsStore = inject(SpotsStore);
  parksStore = inject(ParksStore);
  vetClinicsStore = inject(VetClinicsStore);
  routeConstants = RouteConstants;

  private router = inject(Router);
  private contactFormService = inject(ContactFormService);

  descriptionToKeyMap = descriptionToKeyMap;
  descriptionToKeyMapGarden = descriptionToKeyMapGarden;
  descriptionToKeyMapSpot = descriptionToKeyMapSpot;

  /** Hero search */
  query = signal('');
  township = signal('');

  /** Category chips under the hero search */
  categories: LandingCategory[] = [
    { label: 'lp_cat_all', spotType: null, route: RouteConstants.allSpots },
    { label: 'lp_cat_restaurants', spotType: 'Restoran', route: RouteConstants.allSpots },
    { label: 'lp_cat_cafes', spotType: 'Kafić', route: RouteConstants.allSpots },
    { label: 'lp_cat_hotels', spotType: 'Hotel', route: RouteConstants.allSpots },
    { label: 'lp_cat_parks', spotType: null, route: RouteConstants.petParks },
    { label: 'lp_cat_vets', spotType: null, route: RouteConstants.vet_clinics },
  ];
  activeCategory = signal<string>('lp_cat_all');

  /** "Kako radi" — three steps */
  steps = [
    { n: 1, title: 'lp_step1_title', text: 'lp_step1_text' },
    { n: 2, title: 'lp_step2_title', text: 'lp_step2_text' },
    { n: 3, title: 'lp_step3_title', text: 'lp_step3_text' },
  ];

  /** "Poznato?" — the pain points */
  painPoints = ['lp_pain_1', 'lp_pain_2', 'lp_pain_3'];

  /** "Naše rešenje" — each entry renders a bold lead-in plus the rest */
  solutions = [
    { lead: 'lp_solution_1_lead', text: 'lp_solution_1_text' },
    { lead: 'lp_solution_2_lead', text: 'lp_solution_2_text' },
    { lead: 'lp_solution_3_lead', text: 'lp_solution_3_text' },
  ];

  /** Newsletter */
  email = signal('');
  subscribed = signal(false);

  /** Three featured places, taken from the spots the store already loads. */
  featured = computed(() => (this.spotsStore.random() ?? []).slice(0, 3));

  navigateTo(route: string) {
    this.router.navigate([`/${route}`]);
  }

  onSearch() {
    const queryParams: Record<string, string> = {};
    const word = this.query().trim();
    const town = this.township().trim();
    const category = this.categories.find((c) => c.label === this.activeCategory());

    if (word) queryParams['word'] = word;
    if (town) queryParams['township'] = town;
    if (category?.spotType) queryParams['spotType'] = category.spotType;

    this.router.navigate([`/${category?.route ?? RouteConstants.allSpots}`], { queryParams });
  }

  onCategory(category: LandingCategory) {
    this.activeCategory.set(category.label);
    this.router.navigate(
      [`/${category.route}`],
      category.spotType ? { queryParams: { spotType: category.spotType } } : {},
    );
  }

  openSpot(spot: any) {
    this.router.navigate(['/spots', spot?.iuo_id || 0], { state: { spot } });
  }

  /** Card helpers — the store returns both spots (iuo_*) and parks (par_*). */
  spotName(spot: any): string {
    return spot?.iuo_ime ?? spot?.par_ime ?? '';
  }

  spotCity(spot: any): string {
    return spot?.grd_ime ?? '';
  }

  spotAddress(spot: any): string {
    return [spot?.iuo_adressa ?? spot?.par_lokacija, spot?.ops_ime, spot?.grd_ime]
      .filter(Boolean)
      .join(', ');
  }

  spotImage(spot: any): string {
    if (spot?.iuo_slika_base64) return spot.iuo_slika_base64;
    return spot?.par_ime ? 'assets/park.jpg' : 'assets/logo-normal.png';
  }

  onSubscribe() {
    const address = this.email().trim();
    if (!address) return;

    this.contactFormService.sendEmail({
      from: address,
      subject: 'Newsletter prijava',
      message: `Prijava na newsletter: ${address}`,
      showSnackbar: true,
    });

    this.subscribed.set(true);
    this.email.set('');
  }
}
