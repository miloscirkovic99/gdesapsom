import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RouteConstants } from '@gde/shared/util';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '../../shared/components/breadcrumb/breadcrumb.component';
import { nationalHubLink } from '../pet-friendly/pet-friendly-pages';
import {
  destinationFaq,
  dogSizeLabel,
  formatFee,
  formatKm,
  introFor,
  liftStatus,
  PACKING_LIST,
} from './winter-copy';
import { destinationData } from './winter-data';
import { WinterLiveData } from './winter-live-data';
import {
  destinationPath,
  EU_TRAVEL_PATH,
  findWinterPage,
  PLANNER_LIVE,
  PLANNER_PATH,
  WINTER_DESTINATIONS,
  WINTER_HUB_PATH,
  WINTER_PAGE_DATA,
  WinterDestination,
  WinterPage,
} from './winter-pages';
import { applyWinterSeo, isWinterPageIndexable } from './winter-seo';

/**
 * /zimovanje-sa-psom/<destination>: stays that take dogs, restaurants where
 * dogs may come inside, winter walks, lifts, the nearest vet, a packing list
 * and an FAQ, in that order. Prerendered from the build-time snapshot.
 */
@Component({
  selector: 'app-winter-destination-page',
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './winter-destination-page.component.html',
  styleUrl: './winter-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinterDestinationPageComponent {
  readonly page: WinterPage = this.#resolvePage();
  readonly destination: WinterDestination = this.page
    .destination as WinterDestination;
  readonly #live = inject(WinterLiveData);
  /** The build-time snapshot until the live answer arrives (WinterLiveData). */
  readonly data = computed(() =>
    destinationData(this.destination.slug, this.#live.snapshot())
  );

  readonly h1 = `Zimovanje sa psom ${this.destination.locative}`;
  readonly intro = introFor(this.destination.slug);
  readonly faq = computed(() => destinationFaq(this.destination, this.data()));
  readonly packingList = PACKING_LIST;
  readonly gondola = computed(() => liftStatus(this.data().gondola));
  readonly skiLifts = computed(() => liftStatus(this.data().skiLifts));

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'Zimovanje sa psom', link: WINTER_HUB_PATH },
    { label: this.destination.name },
  ];

  readonly plannerPath = PLANNER_LIVE ? PLANNER_PATH : null;
  readonly otherDestinations = WINTER_DESTINATIONS.filter(
    (item) => item.slug !== this.destination.slug
  ).map((item) => ({
    label: `${item.name} sa psom`,
    path: destinationPath(item),
  }));
  readonly paths = {
    hub: WINTER_HUB_PATH,
    euTravel: EU_TRAVEL_PATH,
    stays: nationalHubLink('smestaj').path,
    vets: `/${RouteConstants.vet_clinics}`,
    addSpot: `/${RouteConstants.addSpot}`,
  };

  readonly formatFee = formatFee;
  readonly formatKm = formatKm;
  readonly dogSizeLabel = dogSizeLabel;

  constructor() {
    // Structured data and robots follow the prerendered snapshot, which is what crawlers read.
    const snapshot = this.#live.snapshot();
    applyWinterSeo({
      page: this.page,
      headline: this.h1,
      faq: this.faq(),
      dateModified: snapshot.generatedAt,
      indexable: isWinterPageIndexable(this.page, snapshot),
      about: {
        '@type': 'Place',
        name: this.destination.name,
        containedInPlace: { '@type': 'Country', name: 'Srbija' },
      },
    });
    afterNextRender(() => this.#live.refresh());
  }

  /** `spot-<id>` names the venue in GA4 (`venue_slug`), as on the spot page. */
  venueSlug(id: number): string {
    return `spot-${id}`;
  }

  #resolvePage(): WinterPage {
    const page = findWinterPage(
      inject(ActivatedRoute).snapshot.data[WINTER_PAGE_DATA]
    );
    if (!page?.destination)
      throw new Error(
        'WinterDestinationPageComponent needs a destination route'
      );
    return page;
  }
}
