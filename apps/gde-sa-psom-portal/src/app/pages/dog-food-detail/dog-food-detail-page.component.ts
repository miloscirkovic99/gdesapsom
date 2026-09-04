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
import { SeoService, SITE_ORIGIN } from '../../core/services/seo.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { OfferListComponent } from '../../shared/components/offer-list/offer-list.component';
import { RouteConstants } from '../../shared/constants/route.constant';
import { DogFoodDetail } from '../../shared/data-access/catalog/catalog.models';
import { LocalNamePipe } from '../../shared/pipes/local-name.pipe';
import { PackageWeightPipe } from '../../shared/pipes/package-weight.pipe';
import { RsdPricePipe } from '../../shared/pipes/rsd-price.pipe';
import { DogFoodStore } from '../../shared/store/dog-food.store';
import { injectActiveLang } from '../../shared/utils/active-lang';
import { pluralKey } from '../../shared/utils/plural';

const STRUCTURED_DATA_ID = 'dog-food-product';
const INGREDIENTS_CLAMP_LENGTH = 220;

@Component({
  selector: 'app-dog-food-detail-page',
  imports: [RouterLink, TranslocoModule, OfferListComponent, LocalNamePipe, PackageWeightPipe, RsdPricePipe],
  templateUrl: './dog-food-detail-page.component.html',
  styleUrl: './dog-food-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogFoodDetailPageComponent implements OnInit, OnDestroy {
  // ── DI ────────────────────────────────────────────────────────────────────
  readonly store = inject(DogFoodStore);
  readonly lang = injectActiveLang();
  readonly routes = RouteConstants;
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);
  private readonly seoService = inject(SeoService);
  private readonly snackbarService = inject(SnackbarService);
  private readonly translocoService = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  // ── UI state ──────────────────────────────────────────────────────────────
  readonly activeImage = signal(0);
  readonly showFullIngredients = signal(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  readonly product = this.store.detail;
  readonly images = computed(() => this.product()?.images ?? []);
  readonly currentImage = computed(() => this.images()[this.activeImage()] ?? null);
  readonly inStockOffers = computed(() => (this.product()?.offers ?? []).filter((o) => o.isInStock).length);
  readonly offerCountKey = computed(() =>
    pluralKey('offer_count', this.product()?.aggregate.offerCount ?? 0, this.lang()),
  );
  readonly canClampIngredients = computed(
    () => (this.product()?.ingredients?.length ?? 0) > INGREDIENTS_CLAMP_LENGTH,
  );

  constructor() {
    effect(() => {
      const product = this.store.detail();
      if (product) this.#updateSeo(product);
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) return;
      this.activeImage.set(0);
      this.showFullIngredients.set(false);
      this.store.loadDetail(slug);
    });
  }

  ngOnDestroy(): void {
    this.store.clearDetail();
    this.seoService.clearStructuredData(STRUCTURED_DATA_ID);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  selectImage(index: number): void {
    this.activeImage.set(index);
  }

  toggleIngredients(): void {
    this.showFullIngredients.update((open) => !open);
  }

  scrollToOffers(): void {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.document
      .getElementById('where-to-buy')
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
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
  /**
   * Per-product title, description, canonical and a schema.org Product block
   * with an AggregateOffer built from the numbers the API already computes.
   * Images are base64 so no og:image is passed (the service falls back to the logo).
   */
  #updateSeo(product: DogFoodDetail): void {
    const fullName = `${product.brand.name} ${product.name}`.trim();
    const typeName = product.foodType.nameSr || product.foodType.nameEn;
    const path = `/${RouteConstants.dogFood}/${product.slug}`;

    const priceSentence =
      product.minPrice !== null
        ? ` Cena od ${new Intl.NumberFormat('sr-Latn-RS').format(product.minPrice)} RSD.`
        : '';

    const fallbackDescription = [
      `${fullName} - ${typeName.toLowerCase()} za pse`,
      product.lifeStage.nameSr.toLowerCase(),
      product.breedSize.nameSr.toLowerCase(),
    ]
      .filter(Boolean)
      .join(', ');

    const description = `${product.description?.trim() || fallbackDescription + '.'}${priceSentence}`;

    this.seoService.update({
      title: `${fullName} - ${typeName} | Gde sa psom`,
      description,
      path,
    });

    const structuredData: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: fullName,
      brand: { '@type': 'Brand', name: product.brand.name },
      description,
      url: `${SITE_ORIGIN}${path}`,
      category: typeName,
    };

    if (product.packageWeightG) {
      structuredData['weight'] = {
        '@type': 'QuantitativeValue',
        value: product.packageWeightG,
        unitCode: 'GRM',
      };
    }

    const { lowPrice, highPrice, offerCount } = product.aggregate;
    if (offerCount > 0 && lowPrice !== null) {
      structuredData['offers'] = {
        '@type': 'AggregateOffer',
        priceCurrency: 'RSD',
        lowPrice,
        highPrice: highPrice ?? lowPrice,
        offerCount,
        availability: 'https://schema.org/InStock',
      };
    }

    this.seoService.setStructuredData(STRUCTURED_DATA_ID, structuredData);
  }
}
