import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Park, Spot, VetClinic } from '@gde/shared/data-access';
import { cleanApiText, injectActiveLang, LocalizedName } from '@gde/shared/util';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { SeoService, SITE_ORIGIN } from '../../core/services/seo.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { CardComponent } from '../../shared/components/card/card.component';
import {
  faqPageStructuredData,
  hubCollectionStructuredData,
} from '../../shared/utils/structured-data';
import { copyLang, CopyLang, HUB_CHROME_PATHS, ListingFacts, pageCopy, uiCopy } from './pet-friendly-copy';
import { PetFriendlyListingsService, SpotPage } from './pet-friendly-listings.service';
import {
  categoryPath,
  cityCategoryLabel,
  cityPath,
  findPetFriendlyPage,
  PET_FRIENDLY_CATEGORIES,
  PET_FRIENDLY_CITIES,
  PET_FRIENDLY_PAGE_DATA,
  PetFriendlyPage,
} from './pet-friendly-pages';

/** Listings per batch, split across the venue types of the category. */
const PAGE_SIZE = 12;
/** Vet clinics shown on a city hub; the rest are on /vet-clinics. */
const VETS_SHOWN = 6;
/** Dog parks shown on a city hub; the rest are on /pet-parks. */
const PARKS_SHOWN = 6;

const LIST_STRUCTURED_DATA_ID = 'pet-friendly-list';
const FAQ_STRUCTURED_DATA_ID = 'pet-friendly-faq';

/** One venue type of the page, paged on its own: the API filters by a single type. */
interface ListingSource {
  /** Null on a city hub, which lists every type. */
  typeId: number | null;
  offset: number;
  total: number;
}

interface HubLink {
  label: string;
  path: string;
  /** The page the visitor is on: rendered as text, not a link. */
  current?: boolean;
}

interface LinkGroup {
  title: string;
  links: HubLink[];
}

const pick = (name: LocalizedName, lang: CopyLang): string => (lang === 'en' ? name.nameEn : name.nameSr);

/** Drops repeats: the API pages by a non-unique sort, so a venue can come back twice. */
function withoutRepeats(spots: readonly Spot[]): Spot[] {
  const seen = new Set<number>();
  return spots.filter((spot) => {
    if (seen.has(spot.iuo_id)) return false;
    seen.add(spot.iuo_id);
    return true;
  });
}

/**
 * A pet-friendly hub: national category (/smestaj), city (/novi-sad) or city ×
 * category (/novi-sad/kafici). Which one comes from the route data that
 * `petFriendlyRoutes()` sets; the copy is rendered at once, the listings as
 * soon as the API answers.
 *
 * A city × category page with fewer listings than the taxonomy's threshold is
 * switched to noindex, so a thin combination never competes with its city or
 * category hub. The sitemap applies the same rule.
 */
@Component({
  selector: 'app-pet-friendly-page',
  imports: [RouterLink, BreadcrumbComponent, CardComponent],
  templateUrl: './pet-friendly-page.component.html',
  styleUrl: './pet-friendly-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetFriendlyPageComponent implements OnDestroy {
  readonly #route = inject(ActivatedRoute);
  readonly #listings = inject(PetFriendlyListingsService);
  readonly #seo = inject(SeoService);
  readonly #destroyRef = inject(DestroyRef);

  readonly page: PetFriendlyPage = this.#resolvePage();
  readonly paths = HUB_CHROME_PATHS;

  readonly #lang = injectActiveLang();
  readonly lang = computed(() => copyLang(this.#lang()));
  readonly copy = computed(() => pageCopy(this.page, this.lang(), PET_FRIENDLY_CATEGORIES));
  readonly ui = computed(() => uiCopy(this.lang()));

  readonly status = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly spots = signal<Spot[]>([]);
  readonly total = signal<number | null>(null);
  readonly loadingMore = signal(false);
  readonly loadMoreFailed = signal(false);
  readonly #sources = signal<ListingSource[]>([]);
  #townshipIds: readonly number[] | null = null;

  readonly parks = signal<Park[]>([]);
  readonly vets = signal<VetClinic[]>([]);

  readonly hasMore = computed(() => this.#sources().some((source) => source.offset < source.total));

  readonly facts = computed<ListingFacts>(() => ({
    total: this.total(),
    examples: this.spots()
      .slice(0, 3)
      .map((spot) => cleanApiText(spot.iuo_ime))
      .filter((name): name is string => !!name),
  }));

  readonly faq = computed(() => this.copy().faq(this.facts()));

  readonly countLine = computed(() => {
    const total = this.total();
    return total ? this.copy().countLine(total) : null;
  });

  readonly shownParks = computed(() => this.parks().slice(0, PARKS_SHOWN));

  /** Početna › Pet friendly Novi Sad › Kafići (also published as BreadcrumbList). */
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const lang = this.lang();
    const { city, category } = this.page;

    if (city && category) {
      return [{ label: pick(city.hubLabel, lang), link: cityPath(city) }, { label: pick(category.label, lang) }];
    }
    return [{ label: pick((city ?? category)?.hubLabel ?? { nameSr: '', nameEn: '' }, lang) }];
  });

  /**
   * The links under the introduction: the categories of a city, the cities of
   * a category, or the sibling categories of a city × category page.
   */
  readonly subnav = computed<HubLink[]>(() => {
    const lang = this.lang();
    const { kind, city, category } = this.page;

    if (kind === 'city' && city) {
      return PET_FRIENDLY_CATEGORIES.map((item) => ({
        label: pick(cityCategoryLabel(item, city), lang),
        path: categoryPath(item, city),
      }));
    }
    if (kind === 'category' && category) {
      return PET_FRIENDLY_CITIES.map((item) => ({
        label: pick(cityCategoryLabel(category, item), lang),
        path: categoryPath(category, item),
      }));
    }
    if (city && category) {
      return PET_FRIENDLY_CATEGORIES.map((item) => ({
        label: pick(item.label, lang),
        path: categoryPath(item, city),
        current: item.slug === category.slug,
      }));
    }
    return [];
  });

  readonly subnavTitle = computed(() =>
    this.page.kind === 'cityCategory' && this.page.city
      ? this.ui().sameCityTitle(this.page.city)
      : this.ui().subnavTitle(this.page),
  );

  /** "Pretražite dalje": the neighbouring hubs, so every hub links to every other level. */
  readonly linkGroups = computed<LinkGroup[]>(() => {
    const lang = this.lang();
    const ui = this.ui();
    const { kind, city, category } = this.page;
    const groups: LinkGroup[] = [];

    if (kind === 'cityCategory' && city && category) {
      groups.push({
        title: ui.otherCitiesTitle(category),
        links: [
          ...PET_FRIENDLY_CITIES.filter((item) => item.slug !== city.slug).map((item) => ({
            label: pick(cityCategoryLabel(category, item), lang),
            path: categoryPath(category, item),
          })),
          { label: pick(category.hubLabel, lang), path: categoryPath(category) },
        ],
      });
      groups.push({ title: ui.citiesTitle, links: [{ label: pick(city.hubLabel, lang), path: cityPath(city) }] });
    }

    if (kind === 'category' && category) {
      groups.push({
        title: ui.otherCategoriesTitle,
        links: PET_FRIENDLY_CATEGORIES.filter((item) => item.slug !== category.slug).map((item) => ({
          label: pick(item.hubLabel, lang),
          path: categoryPath(item),
        })),
      });
    }

    if (kind !== 'cityCategory') {
      groups.push({
        title: ui.citiesTitle,
        links: PET_FRIENDLY_CITIES.filter((item) => item.slug !== city?.slug).map((item) => ({
          label: pick(item.hubLabel, lang),
          path: cityPath(item),
        })),
      });
    }

    if (kind === 'city') {
      groups.push({
        title: ui.otherCategoriesTitle,
        links: PET_FRIENDLY_CATEGORIES.map((item) => ({ label: pick(item.hubLabel, lang), path: categoryPath(item) })),
      });
    }

    groups.push({
      title: ui.forYourDogTitle,
      links: [
        { label: ui.dogParks, path: this.paths.parks },
        { label: ui.vets, path: this.paths.vets },
        { label: ui.allSpots, path: this.paths.allSpots },
      ],
    });

    return groups.filter((group) => group.links.length > 0);
  });

  constructor() {
    this.#loadListings();
    if (this.page.kind === 'city') this.#loadCityExtras();

    effect(() => {
      const data = faqPageStructuredData(this.faq());
      if (data) this.#seo.setStructuredData(FAQ_STRUCTURED_DATA_ID, data);
      else this.#seo.clearStructuredData(FAQ_STRUCTURED_DATA_ID);
    });

    effect(() => {
      const copy = this.copy();
      const data = hubCollectionStructuredData({
        name: copy.h1,
        description: copy.lead,
        url: `${SITE_ORIGIN}${this.page.path}`,
        inLanguage: this.lang() === 'en' ? 'en' : 'sr-Latn',
        about: this.#about(),
        total: this.total(),
        items: this.spots().flatMap((spot) => {
          const name = cleanApiText(spot.iuo_ime);
          return name ? [{ name, url: `${SITE_ORIGIN}/spots/${spot.iuo_id}` }] : [];
        }),
      });
      if (data) this.#seo.setStructuredData(LIST_STRUCTURED_DATA_ID, data);
      else this.#seo.clearStructuredData(LIST_STRUCTURED_DATA_ID);
    });
  }

  ngOnDestroy(): void {
    this.#seo.clearStructuredData(LIST_STRUCTURED_DATA_ID);
    this.#seo.clearStructuredData(FAQ_STRUCTURED_DATA_ID);
  }

  retry(): void {
    this.#loadListings();
  }

  loadMore(): void {
    const pending = this.#sources().filter((source) => source.offset < source.total);
    if (!pending.length || this.loadingMore()) return;

    this.loadingMore.set(true);
    this.loadMoreFailed.set(false);
    const limit = this.#perSourceLimit(this.#sources().length);

    forkJoin(
      pending.map((source) =>
        this.#search(source.typeId, source.offset, limit).pipe(map((result) => ({ typeId: source.typeId, result }))),
      ),
    )
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (results) => {
          this.#sources.update((sources) =>
            sources.map((source) => {
              const hit = results.find((item) => item.typeId === source.typeId);
              if (!hit) return source;
              // An empty page means the data changed under us: stop asking.
              const received = hit.result.spots.length;
              return { ...source, offset: received ? source.offset + received : source.total };
            }),
          );
          this.spots.update((spots) => withoutRepeats([...spots, ...results.flatMap((item) => item.result.spots)]));
          this.loadingMore.set(false);
        },
        error: () => {
          this.loadingMore.set(false);
          this.loadMoreFailed.set(true);
        },
      });
  }

  /** "park-<id>" names the park in GA4 (`venue_slug`), as on the parks page. */
  parkSlug(park: Park): string {
    return `park-${park.par_id}`;
  }

  parkMapsUrl(park: Park): string {
    const location = [park.par_lokacija, park.ops_ime, park.grd_ime].filter(Boolean).join(' ');
    return `https://www.google.com/maps?q=${encodeURIComponent(location)}`;
  }

  vetSlug(clinic: VetClinic): string {
    return `vet-${clinic.vetc_id}`;
  }

  vetPhone(clinic: VetClinic): string | null {
    return cleanApiText(clinic.vetc_telefon);
  }

  vetAddress(clinic: VetClinic): string {
    return [cleanApiText(clinic.vetc_adresa), cleanApiText(clinic.ops_ime)].filter(Boolean).join(', ');
  }

  #resolvePage(): PetFriendlyPage {
    const path = this.#route.snapshot.data[PET_FRIENDLY_PAGE_DATA];
    const page = findPetFriendlyPage(path);
    if (!page) throw new Error(`No pet-friendly hub for route data "${path}"`);
    return page;
  }

  #perSourceLimit(sources: number): number {
    return Math.max(1, Math.ceil(PAGE_SIZE / Math.max(1, sources)));
  }

  #search(typeId: number | null, offset: number, limit: number): Observable<SpotPage> {
    return this.#listings.searchSpots({ townshipIds: this.#townshipIds, typeId, offset, limit });
  }

  #loadListings(): void {
    const { city, category } = this.page;
    this.status.set('loading');

    forkJoin([
      city ? this.#listings.cityArea(city.names).pipe(map((area) => area.townshipIds)) : of(null),
      category ? this.#listings.typeIds(category.spotTypes) : of(null),
    ])
      .pipe(
        switchMap(([townshipIds, typeIds]) => {
          this.#townshipIds = townshipIds;
          // A city hub lists every type; a category with no known type lists nothing.
          const sources: (number | null)[] = typeIds ?? [null];
          if (!sources.length) return of([]);

          const limit = this.#perSourceLimit(sources.length);
          return forkJoin(
            sources.map((typeId) => this.#search(typeId, 0, limit).pipe(map((result) => ({ typeId, result })))),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: (results) => {
          this.#sources.set(
            results.map(({ typeId, result }) => ({ typeId, offset: result.spots.length, total: result.total })),
          );
          this.spots.set(withoutRepeats(results.flatMap((item) => item.result.spots)));
          this.total.set(results.reduce((sum, item) => sum + item.result.total, 0));
          this.status.set('loaded');
          this.#applyIndexing();
        },
        error: () => this.status.set('error'),
      });
  }

  /** Parks and vets of the city: what a dog owner needs besides cafés. */
  #loadCityExtras(): void {
    const city = this.page.city;
    if (!city) return;

    this.#listings
      .parksIn(city.names)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((parks) => this.parks.set(parks));

    this.#listings
      .cityArea(city.names)
      .pipe(
        switchMap((area) => this.#listings.vetsIn(area.cityIds[0] ?? null, VETS_SHOWN)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({ next: ({ clinics }) => this.vets.set(clinics), error: () => this.vets.set([]) });
  }

  /**
   * Below the taxonomy threshold the page stays reachable but asks not to be
   * indexed. After an API error nothing changes: an outage must not de-index.
   */
  #applyIndexing(): void {
    const total = this.total();
    if (total === null || total >= this.page.minListingsToIndex) return;

    this.#seo.update({
      title: this.page.title,
      description: this.page.description,
      path: this.page.path,
      noindex: true,
    });
  }

  #about(): Record<string, unknown> | null {
    const city = this.page.city;
    if (city) {
      return {
        '@type': 'City',
        name: city.name.nameSr,
        containedInPlace: { '@type': 'Country', name: 'Srbija' },
      };
    }
    return { '@type': 'Country', name: 'Srbija' };
  }
}
