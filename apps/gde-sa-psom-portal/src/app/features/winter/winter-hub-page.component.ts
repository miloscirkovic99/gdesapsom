import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '../../shared/components/breadcrumb/breadcrumb.component';
import { nationalHubLink } from '../pet-friendly/pet-friendly-pages';
import {
  countRestaurants,
  countStays,
  FaqItem,
  introFor,
  joinNames,
  liftStatus,
  PACKING_LIST,
} from './winter-copy';
import { destinationData, WinterSnapshot } from './winter-data';
import { WinterLiveData } from './winter-live-data';
import {
  destinationPath,
  EU_TRAVEL_PATH,
  findWinterPage,
  PLANNER_LIVE,
  PLANNER_PATH,
  WINTER_DESTINATIONS,
  WINTER_PAGE_DATA,
  WinterPage,
} from './winter-pages';
import { applyWinterSeo, isWinterPageIndexable } from './winter-seo';

interface DestinationCard {
  name: string;
  path: string;
  facts: string[];
}

/** /zimovanje-sa-psom: the three destinations, what to pack, and the way to the EU guide. */
@Component({
  selector: 'app-winter-hub-page',
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './winter-hub-page.component.html',
  styleUrl: './winter-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinterHubPageComponent {
  readonly page: WinterPage = findWinterPage(
    inject(ActivatedRoute).snapshot.data[WINTER_PAGE_DATA]
  ) as WinterPage;
  readonly #live = inject(WinterLiveData);

  readonly h1 = 'Zimovanje sa psom u Srbiji';
  readonly intro = introFor('hub');
  readonly packingList = PACKING_LIST;
  readonly breadcrumbs: BreadcrumbItem[] = [{ label: 'Zimovanje sa psom' }];
  readonly plannerPath = PLANNER_LIVE ? PLANNER_PATH : null;
  readonly paths = {
    euTravel: EU_TRAVEL_PATH,
    stays: nationalHubLink('smestaj').path,
  };

  readonly destinations = computed<DestinationCard[]>(() =>
    WINTER_DESTINATIONS.map((destination) => {
      const data = destinationData(destination.slug, this.#live.snapshot());
      const facts: string[] = [];
      if (data.stays.length)
        facts.push(`${countStays(data.stays.length)} koji primaju pse`);
      if (data.restaurants.length)
        facts.push(
          `${countRestaurants(data.restaurants.length)} gde psi smeju unutra`
        );
      const gondola = liftStatus(data.gondola);
      if (gondola)
        facts.push(
          `Gondola: ${gondola.charAt(0).toLowerCase()}${gondola.slice(1)}`
        );
      return {
        name: destination.name,
        path: destinationPath(destination),
        facts,
      };
    })
  );

  readonly faq = computed(() => this.#faq(this.#live.snapshot()));

  constructor() {
    // Structured data and robots follow the prerendered snapshot, which is what crawlers read.
    const snapshot = this.#live.snapshot();
    applyWinterSeo({
      page: this.page,
      headline: this.h1,
      faq: this.faq(),
      dateModified: snapshot.generatedAt,
      indexable: isWinterPageIndexable(this.page, snapshot),
      about: { '@type': 'Country', name: 'Srbija' },
    });
    afterNextRender(() => this.#live.refresh());
  }

  #faq(snapshot: WinterSnapshot): FaqItem[] {
    const faq: FaqItem[] = [];
    const names = WINTER_DESTINATIONS.map((destination) => destination.name);
    const counts = WINTER_DESTINATIONS.flatMap((destination) => {
      const n = destinationData(destination.slug, snapshot).stays.length;
      return n ? [`${destination.name}: ${countStays(n)}`] : [];
    });
    faq.push({
      question: 'Gde na zimovanje sa psom u Srbiji?',
      answer:
        `Za zimovanje sa psom pratimo ${joinNames(names)}.` +
        (counts.length ? ` Smeštaj koji prima pse: ${counts.join('; ')}.` : ''),
    });

    const lifts = WINTER_DESTINATIONS.flatMap((destination) => {
      const status = liftStatus(
        destinationData(destination.slug, snapshot).gondola
      );
      return status
        ? [
            `${destination.name}: ${status
              .charAt(0)
              .toLowerCase()}${status.slice(1)}`,
          ]
        : [];
    });
    if (lifts.length)
      faq.push({
        question: 'Da li psi smeju na gondole?',
        answer: `${lifts.join('. ')}.`,
      });

    faq.push({
      question: 'Šta da spakujem psu za zimovanje?',
      answer:
        'Toplu opremu za pse kratke dlake, zaštitu za šape od snega i soli, peškir, hranu za sve dane i pasoš ljubimca. Ceo spisak je na ovoj stranici.',
    });
    return faq;
  }
}
