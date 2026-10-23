import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { COUNTRIES, countryName, type CountryCode } from '../domain/countries';
import {
  costCategoryLabel,
  type CostBreakdown,
  type CostScenario,
  type PetTransportCarrier,
  type PetTransportFeeUnit,
  type StayPetFeeUnit,
} from '../domain/costs';
import { LOCALE } from '../domain/lang';
import { convert, formatRange, type MoneyRange } from '../domain/money';
import type { ReadinessReport } from '../domain/readiness';
import { PRICE_BOOK, TOLL_LINKS } from '../domain/rules/prices';
import type { SourceRecord } from '../domain/rules/rule.models';
import { SOURCES } from '../domain/rules/sources';
import { TRANSPORT_MODES, type TransportMode } from '../domain/trip.models';
import { priceBounds } from '../domain/vignettes';
import { COPY } from '../pet-trip-copy';
import { PetTripPlanner } from '../pet-trip.planner';
import { SourceListComponent } from './source-list.component';
import { TransitPickerComponent } from './transit-picker.component';

const SOURCE_BY_ID = new Map(SOURCES.map((source) => [source.id, source]));
const isSource = (source: SourceRecord | undefined): source is SourceRecord => !!source;

/** A finite non-negative number, or null for an empty or broken field. */
const amount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

/**
 * One scenario's inputs and its breakdown. The fields follow the way of
 * travelling: fuel, tolls and vignettes for a car, tickets and the pet fee
 * otherwise. Scenario A takes destination, transport and dates from the trip;
 * B and C set their own.
 */
@Component({
  selector: 'app-pet-trip-scenario',
  imports: [ReactiveFormsModule, TransitPickerComponent, SourceListComponent],
  templateUrl: './scenario-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioEditorComponent implements OnInit {
  readonly scenario = input.required<CostScenario>();
  readonly breakdown = input.required<CostBreakdown>();
  readonly report = input.required<ReadinessReport>();

  readonly planner = inject(PetTripPlanner);
  readonly #fb = inject(FormBuilder).nonNullable;
  readonly #destroyRef = inject(DestroyRef);

  readonly lang = this.planner.lang;
  readonly copy = computed(() => COPY[this.lang()]);
  readonly transports = TRANSPORT_MODES;
  readonly destinations = computed(() =>
    COUNTRIES.filter((info) => info.code !== 'RS').map((info) => ({ code: info.code, name: info.name[this.lang()] })),
  );
  readonly carriers: readonly PetTransportCarrier[] = ['air-serbia', 'custom'];
  readonly petFeeUnits: readonly PetTransportFeeUnit[] = ['per-dog-per-direction', 'per-dog', 'total'];
  readonly stayFeeUnits: readonly StayPetFeeUnit[] = ['per-dog-per-night', 'per-dog-per-stay', 'per-stay'];

  readonly form = this.#fb.group({
    label: ['', [Validators.maxLength(40)]],
    destination: ['HR' as CountryCode],
    destinationCity: ['', [Validators.maxLength(80)]],
    transport: ['car' as TransportMode],
    nights: [0, [Validators.min(0), Validators.max(365)]],
    distanceKm: [null as number | null, [Validators.min(0)]],
    extraKm: [null as number | null, [Validators.min(0)]],
    tolls: [null as number | null, [Validators.min(0)]],
    ticketPricePerPerson: [null as number | null, [Validators.min(0)]],
    ticketIsReturn: [true],
    petTransportCarrier: ['custom' as PetTransportCarrier],
    flightsPerDirection: [1, [Validators.min(1), Validators.max(4)]],
    petTransportFee: [null as number | null, [Validators.min(0)]],
    petTransportFeeUnit: ['per-dog-per-direction' as PetTransportFeeUnit],
    accommodationPerNight: [null as number | null, [Validators.min(0)]],
    stayPetFee: [null as number | null, [Validators.min(0)]],
    stayPetFeeUnit: ['per-dog-per-night' as StayPetFeeUnit],
    foodPerPersonPerDay: [null as number | null, [Validators.min(0)]],
    dogFoodPerDogPerDay: [null as number | null, [Validators.min(0)]],
    activities: [null as number | null, [Validators.min(0)]],
    other: [null as number | null, [Validators.min(0)]],
  });

  readonly isBase = computed(() => this.scenario().id === 'A');
  readonly currency = computed(() => this.breakdown().currency);
  readonly prefix = computed(() => `pt-s${this.scenario().id}`);
  /** The name the scenario has while the visitor gives it none. */
  readonly defaultLabel = computed(() => this.copy().costs.scenarioDefault(this.scenario().id));
  readonly estimateError = computed(() => {
    const error = this.planner.estimateErrors()[this.scenario().id];
    if (!error) return null;
    return error === 'needs-cities' ? this.copy().costs.estimateNeedsCities : this.copy().costs.estimateFailed;
  });

  /** Vignette countries on this scenario's route, with the products a visitor can pick. */
  readonly vignetteCountries = computed(() => {
    const scenario = this.scenario();
    if (scenario.transport !== 'car') return [];
    const lang = this.lang();
    const rates = { ...PRICE_BOOK.rates, rsdPerEur: this.planner.shared().rsdPerEur };
    const emission = this.planner.shared().emissionClass;
    const route = [...new Set([...scenario.transitCountries, scenario.destination])];
    return route
      .map((code) => ({
        code,
        name: countryName(code, lang),
        choice: scenario.vignetteChoice[code] ?? 'auto',
        products: PRICE_BOOK.vignettes
          .filter((product) => product.country === code)
          .map((product) => {
            const bounds = priceBounds(product, emission);
            const min = convert(bounds.min, product.currency, this.currency(), rates);
            const max = convert(bounds.max, product.currency, this.currency(), rates);
            const price = min === null || max === null ? '' : formatRange({ min, max }, this.currency(), lang);
            const name = product.name[lang];
            return { id: product.id, label: price ? `${name} (${price})` : name };
          }),
      }))
      .filter((entry) => entry.products.length);
  });

  readonly tollSources = computed(() => {
    const scenario = this.scenario();
    const route = ['RS', ...scenario.transitCountries, scenario.destination];
    return TOLL_LINKS.filter((link) => route.includes(link.country))
      .map((link) => SOURCE_BY_ID.get(link.sourceId))
      .filter(isSource);
  });

  readonly verifiedSources = computed(() => {
    const ids = new Set(this.breakdown().lines.flatMap((line) => line.sourceIds));
    return [...ids].map((id) => SOURCE_BY_ID.get(id)).filter(isSource);
  });

  readonly missing = computed(() => this.breakdown().unknown.map((category) => costCategoryLabel(category, this.lang())));
  /** Optional lines left empty are listed once instead of as rows of dashes. */
  readonly shownLines = computed(() => this.breakdown().lines.filter((line) => line.basis !== 'not-included'));
  readonly notEntered = computed(() =>
    this.breakdown().lines.filter((line) => line.basis === 'not-included').map((line) => line.label),
  );

  ngOnInit(): void {
    const scenario = this.scenario();
    this.form.patchValue(
      {
        label: this.planner.customLabel(scenario.id),
        destination: scenario.destination,
        destinationCity: scenario.destinationCity,
        transport: scenario.transport,
        nights: scenario.nights,
        distanceKm: scenario.distanceKm,
        extraKm: scenario.extraKm,
        tolls: scenario.tolls,
        ticketPricePerPerson: scenario.ticketPricePerPerson,
        ticketIsReturn: scenario.ticketIsReturn,
        petTransportCarrier: scenario.petTransportCarrier,
        flightsPerDirection: scenario.flightsPerDirection,
        petTransportFee: scenario.petTransportFee,
        petTransportFeeUnit: scenario.petTransportFeeUnit,
        accommodationPerNight: scenario.accommodationPerNight,
        stayPetFee: scenario.stayPetFee,
        stayPetFeeUnit: scenario.stayPetFeeUnit,
        foodPerPersonPerDay: scenario.foodPerPersonPerDay,
        dogFoodPerDogPerDay: scenario.dogFoodPerDogPerDay,
        activities: scenario.activities,
        other: scenario.other,
      },
      { emitEvent: false },
    );

    this.form.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      const value = this.form.getRawValue();
      const patch: Partial<CostScenario> = {
        distanceKm: amount(value.distanceKm),
        extraKm: amount(value.extraKm),
        tolls: amount(value.tolls),
        ticketPricePerPerson: amount(value.ticketPricePerPerson),
        ticketIsReturn: value.ticketIsReturn,
        petTransportCarrier: value.petTransportCarrier,
        flightsPerDirection: Math.min(4, Math.max(1, Math.floor(amount(value.flightsPerDirection) ?? 1))),
        petTransportFee: amount(value.petTransportFee),
        petTransportFeeUnit: value.petTransportFeeUnit,
        accommodationPerNight: amount(value.accommodationPerNight),
        stayPetFee: amount(value.stayPetFee),
        stayPetFeeUnit: value.stayPetFeeUnit,
        foodPerPersonPerDay: amount(value.foodPerPersonPerDay),
        dogFoodPerDogPerDay: amount(value.dogFoodPerDogPerDay),
        activities: amount(value.activities),
        other: amount(value.other),
      };
      if (!this.isBase()) {
        Object.assign(patch, {
          label: value.label.trim(),
          destination: value.destination,
          destinationCity: value.destinationCity.trim(),
          transport: value.transport,
          nights: Math.min(365, Math.max(0, Math.floor(amount(value.nights) ?? 0))),
        });
      }
      this.planner.patchScenario(this.scenario().id, patch);
    });
  }

  setTransit(transit: CountryCode[]): void {
    this.planner.patchScenario(this.scenario().id, { transitCountries: transit });
  }

  setVignette(code: CountryCode, event: Event): void {
    const choice = (event.target as HTMLSelectElement).value;
    this.planner.patchScenario(this.scenario().id, {
      vignetteChoice: { ...this.scenario().vignetteChoice, [code]: choice },
    });
  }

  clearEstimate(): void {
    this.planner.patchScenario(this.scenario().id, { distanceEstimateKm: null });
  }

  money(range: MoneyRange | null): string {
    return range ? formatRange(range, this.currency(), this.lang()) : '—';
  }

  km(value: number): string {
    return new Intl.NumberFormat(LOCALE[this.lang()], { maximumFractionDigits: 0 }).format(value);
  }

  nameOf(code: CountryCode): string {
    return countryName(code, this.lang());
  }
}
