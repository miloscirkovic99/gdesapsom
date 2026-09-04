import { DOCUMENT, Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import * as L from 'leaflet';
import { SeoService, SITE_ORIGIN } from '../../core/services/seo.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { DeliveryLinksComponent } from '../../shared/components/delivery-links/delivery-links.component';
import { RouteConstants } from '../../shared/constants/route.constant';
import {
  LookupRef,
  PetShopDetail,
  PetShopOffer,
} from '../../shared/data-access/catalog/catalog.models';
import { normalizeSearchText } from '../../shared/data-access/catalog/dog-food.api';
import { LocalNamePipe } from '../../shared/pipes/local-name.pipe';
import { PackageWeightPipe } from '../../shared/pipes/package-weight.pipe';
import { RsdPricePipe } from '../../shared/pipes/rsd-price.pipe';
import { PetShopsStore } from '../../shared/store/pet-shops.store';
import { injectActiveLang } from '../../shared/utils/active-lang';
import { pluralKey } from '../../shared/utils/plural';

const STRUCTURED_DATA_ID = 'pet-shop';
const MAP_ELEMENT_ID = 'shop-map';

interface AssortmentGroup {
  type: LookupRef;
  offers: PetShopOffer[];
}

@Component({
  selector: 'app-pet-shop-detail-page',
  imports: [RouterLink, TranslocoModule, DeliveryLinksComponent, LocalNamePipe, PackageWeightPipe, RsdPricePipe],
  templateUrl: './pet-shop-detail-page.component.html',
  styleUrl: './pet-shop-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetShopDetailPageComponent implements OnInit, OnDestroy {
  // ── DI ────────────────────────────────────────────────────────────────────
  readonly store = inject(PetShopsStore);
  readonly lang = injectActiveLang();
  readonly routes = RouteConstants;
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);
  private readonly seoService = inject(SeoService);
  private readonly snackbarService = inject(SnackbarService);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private map: L.Map | undefined;

  // ── UI state ──────────────────────────────────────────────────────────────
  readonly assortmentQuery = signal('');

  // ── Derived ───────────────────────────────────────────────────────────────
  readonly shop = this.store.detail;

  /** "Vračar, Beograd" - collapses township and city when they share a name. */
  readonly locationLine = computed(() => {
    const shop = this.shop();
    if (!shop) return '';
    return [...new Set([shop.townshipName, shop.cityName].filter((v): v is string => !!v))].join(', ');
  });

  readonly itemCountKey = computed(() =>
    pluralKey('item_count', this.shop()?.summary.offerCount ?? 0, this.lang()),
  );

  readonly brandCountKey = computed(() =>
    pluralKey('brand_count', this.shop()?.summary.brandCount ?? 0, this.lang()),
  );

  /** Assortment grouped by food type, narrowed by the local search box. */
  readonly groups = computed<AssortmentGroup[]>(() => {
    const shop = this.shop();
    if (!shop) return [];

    const query = normalizeSearchText(this.assortmentQuery());
    const groups = new Map<string, AssortmentGroup>();

    for (const offer of shop.offers) {
      if (query && !normalizeSearchText(`${offer.food.brandName} ${offer.food.name}`).includes(query)) {
        continue;
      }
      const group = groups.get(offer.food.foodType.code) ?? { type: offer.food.foodType, offers: [] };
      group.offers.push(offer);
      groups.set(offer.food.foodType.code, group);
    }

    return [...groups.values()];
  });

  constructor() {
    effect(() => {
      const shop = this.store.detail();
      if (!shop) return;
      this.#updateSeo(shop);
      // The map container is rendered by the same change detection pass that
      // reacts to `detail`, so Leaflet has to wait a tick for it to exist.
      setTimeout(() => this.#initMap(shop));
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) return;
      this.assortmentQuery.set('');
      this.store.loadDetail(slug);
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
    this.store.clearDetail();
    this.seoService.clearStructuredData(STRUCTURED_DATA_ID);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  onAssortmentSearch(event: Event): void {
    this.assortmentQuery.set((event.target as HTMLInputElement).value);
  }

  directionsUrl(shop: PetShopDetail): string | null {
    if (shop.latitude === null || shop.longitude === null) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.document.location.href).then(() => {
      this.snackbarService.openSnackbar(
        this.translocoService.translate('link_copied'),
        this.translocoService.translate('close'),
        'success-snackbar',
      );
    });
  }

  goBack(): void {
    this.location.back();
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  #initMap(shop: PetShopDetail): void {
    if (shop.latitude === null || shop.longitude === null) return;

    const container = this.document.getElementById(MAP_ELEMENT_ID);
    if (!container) return;

    this.map?.remove();
    this.map = L.map(container, {
      center: [shop.latitude, shop.longitude],
      zoom: 16,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    // Same marker artwork as the spot detail page.
    const icon = new L.Icon({
      iconUrl: 'assets/logo-small.png',
      iconSize: [56, 56],
      iconAnchor: [28, 56],
      popupAnchor: [0, -52],
    });

    L.marker([shop.latitude, shop.longitude], { icon })
      .addTo(this.map)
      .bindPopup(`<b>${shop.name}</b><br>${shop.address}`);
  }

  /**
   * Per-shop title, description, canonical and a schema.org PetStore block
   * with address, geo coordinates and contact details.
   */
  #updateSeo(shop: PetShopDetail): void {
    const path = `/${RouteConstants.petShops}/${shop.slug}`;
    const place = [shop.townshipName, shop.cityName]
      .filter((v): v is string => !!v)
      .filter((v, i, all) => all.indexOf(v) === i)
      .join(', ');

    const summary =
      shop.summary.offerCount > 0
        ? ` U ponudi ${shop.summary.offerCount} artikala hrane za pse.`
        : '';

    const description =
      shop.description?.trim() ||
      `${shop.name} je prodavnica za ljubimce, ${shop.address}${place ? `, ${place}` : ''}.${summary}`;

    this.seoService.update({
      title: `${shop.name} - Prodavnica za ljubimce${place ? `, ${place}` : ''} | Gde sa psom`,
      description,
      path,
    });

    const structuredData: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'PetStore',
      name: shop.name,
      description,
      url: `${SITE_ORIGIN}${path}`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: shop.address,
        addressLocality: shop.cityName ?? shop.townshipName ?? undefined,
        addressCountry: 'RS',
      },
    };

    if (shop.phone) structuredData['telephone'] = shop.phone;
    if (shop.websiteUrl) structuredData['sameAs'] = [shop.websiteUrl];
    if (shop.latitude !== null && shop.longitude !== null) {
      structuredData['geo'] = {
        '@type': 'GeoCoordinates',
        latitude: shop.latitude,
        longitude: shop.longitude,
      };
    }

    this.seoService.setStructuredData(STRUCTURED_DATA_ID, structuredData);
  }
}
