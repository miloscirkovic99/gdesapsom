import { isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { type AbstractControl, FormBuilder, type ValidationErrors, Validators } from '@angular/forms';
import { map, startWith } from 'rxjs';
import { geocodeAddress, type GeocodeHit } from '../../shared/utils/geocode';
import { PET_TRIP_AI_ENABLED, PetTripInsightsApi } from './ai/insights.api';
import type { Insights, InsightsStatus, QuotaReason } from './ai/insights.models';
import { buildInsightsRequest } from './ai/insights-request';
import { compareScenarios } from './domain/compare';
import { type CountryCode, isCountryCode } from './domain/countries';
import { type CostScenario, defaultScenario, estimateScenario, type SharedCostSettings } from './domain/costs';
import { addDays, isIsoDate, todayIso } from './domain/dates';
import { estimateRoadKm } from './domain/distance';
import { type Currency, roundMoney } from './domain/money';
import { assessTrip, type ReadinessReport } from './domain/readiness';
import { PRICE_BOOK, REFERENCE_RATES } from './domain/rules/prices';
import { RULESET } from './domain/rules/ruleset';
import {
  type DogProfile,
  emptyDog,
  MAX_DOGS,
  MAX_TRAVELERS,
  type MicrochipStatus,
  type MovementPurpose,
  TRANSPORT_MODES,
  type TransportMode,
  tripNights,
  type TripPlan,
  type YesNoUnknown,
} from './domain/trip.models';
import { COPY, injectTripLang } from './pet-trip-copy';

export type PlannerView = 'trip' | 'dogs' | 'results';
export type ResultsTab = 'readiness' | 'costs' | 'summary';
export type EstimateError = 'needs-cities' | 'failed';

export interface InsightsState {
  status: InsightsStatus | 'idle' | 'loading';
  /** The last explanation that passed the checks; kept when a later request fails. */
  insights: Insights | null;
  /** The request the shown explanation was written for. */
  payload: string | null;
  /** This device's allowance from the server's last answer (null: unknown, or no limit). */
  remaining: number | null;
  limit: number | null;
  reason: QuotaReason | null;
}

const IDLE_INSIGHTS: InsightsState = { status: 'idle', insights: null, payload: null, remaining: null, limit: null, reason: null };

const STORAGE_KEY = 'gsp_pet_trip_v1';
const SCENARIO_IDS = ['A', 'B', 'C'] as const;
/** Default scenario names that older drafts saved as if typed. */
const LEGACY_LABEL = /^(Tvoj plan|Varijanta [ABC])$/;
/** Nominatim allows one request per second. */
const GEOCODE_GAP_MS = 1100;

const DEFAULT_SHARED: SharedCostSettings = {
  currency: 'EUR',
  rsdPerEur: REFERENCE_RATES.rsdPerEur,
  contingencyPercent: 10,
  fuelConsumption: null,
  fuelPrice: null,
  emissionClass: null,
  vetPrep: {},
};

/** Scenario fields that hold an amount in the planner's currency. */
const MONEY_FIELDS = [
  'tolls',
  'ticketPricePerPerson',
  'petTransportFee',
  'accommodationPerNight',
  'stayPetFee',
  'foodPerPersonPerDay',
  'dogFoodPerDogPerDay',
  'activities',
  'other',
] as const satisfies readonly (keyof CostScenario)[];

const YES_NO: readonly YesNoUnknown[] = ['yes', 'no', 'unknown'];
const MICROCHIP: readonly MicrochipStatus[] = ['iso', 'unknown-type', 'other', 'none'];

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;
const dateOrNull = (value: unknown): string | null => (isIsoDate(value) ? value : null);
const numberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * State of /putovanje-sa-psom, provided by the page so it lives as long as
 * the page does. The trip is entered once (two forms); the readiness report,
 * every cost scenario, the comparison and the AI request are signals derived
 * from it, so any change recalculates everything without a request.
 *
 * Scenario A follows the trip (destination, transport, transit, nights); B and
 * C start as copies of A and keep their own values.
 */
@Injectable()
export class PetTripPlanner {
  readonly #fb = inject(FormBuilder).nonNullable;
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #insightsApi = inject(PetTripInsightsApi);
  readonly #destroyRef = inject(DestroyRef);
  readonly aiEnabled = inject(PET_TRIP_AI_ENABLED);
  /** The site's language: the report, costs and AI request are written in it. */
  readonly lang = injectTripLang();

  readonly today = signal(todayIso());
  readonly view = signal<PlannerView>('trip');
  readonly tab = signal<ResultsTab>('readiness');

  readonly tripForm = this.#fb.group(
    {
      departureCity: ['', [Validators.maxLength(80)]],
      destination: ['HR' as CountryCode, [Validators.required]],
      destinationCity: ['', [Validators.maxLength(80)]],
      transitCountries: [[] as CountryCode[]],
      transport: ['car' as TransportMode, [Validators.required]],
      purpose: ['non-commercial' as MovementPurpose],
      departureDate: ['', [Validators.required, (control: AbstractControl) => this.#notPast(control)]],
      oneWay: [false],
      returnDate: [''],
      travelers: [2, [Validators.required, Validators.min(1), Validators.max(MAX_TRAVELERS)]],
    },
    { validators: [returnAfterDeparture] },
  );

  readonly dogsForm = this.#fb.array([this.#dogGroup()]);

  readonly #tripValue = toSignal(
    this.tripForm.valueChanges.pipe(startWith(null), map(() => this.tripForm.getRawValue())),
    { requireSync: true },
  );
  readonly #dogsValue = toSignal(
    this.dogsForm.valueChanges.pipe(startWith(null), map(() => this.dogsForm.getRawValue())),
    { requireSync: true },
  );

  readonly trip = computed<TripPlan>(() => toTripPlan(this.#tripValue(), this.#dogsValue()));
  readonly report = computed<ReadinessReport>(() => assessTrip(this.trip(), RULESET, this.today(), this.lang()));

  readonly shared = signal<SharedCostSettings>({ ...DEFAULT_SHARED });
  /** Scenario labels here are what the visitor typed; '' means the default name in the page's language. */
  readonly #scenarioInputs = signal<CostScenario[]>([defaultScenario('A', '', this.#tripBasics())]);

  readonly scenarios = computed<CostScenario[]>(() => {
    const trip = this.trip();
    const copy = COPY[this.lang()].costs;
    return this.#scenarioInputs().map((scenario) =>
      scenario.id === 'A'
        ? {
            ...scenario,
            label: copy.scenarioA,
            destination: trip.destination,
            destinationCity: trip.destinationCity,
            transport: trip.transport,
            transitCountries: [...trip.transitCountries],
            nights: tripNights(trip),
          }
        : { ...scenario, label: scenario.label || copy.scenarioDefault(scenario.id) },
    );
  });

  /** The readiness report behind each scenario: B and C may go elsewhere or another way. */
  readonly scenarioReports = computed<ReadinessReport[]>(() =>
    this.scenarios().map((scenario) =>
      scenario.id === 'A' ? this.report() : assessTrip(this.#tripFor(scenario), RULESET, this.today(), this.lang()),
    ),
  );

  readonly breakdowns = computed(() => {
    const trip = this.trip();
    const reports = this.scenarioReports();
    return this.scenarios().map((scenario, index) =>
      estimateScenario(scenario, this.shared(), {
        travelers: trip.travelers,
        dogs: trip.dogs.length,
        dogWeightsKg: trip.dogs.map((dog) => dog.weightKg),
        departureDate: trip.departureDate,
        roundTrip: trip.returnDate !== null,
        today: this.today(),
        prepItems: reports[index].prepItems,
        prices: PRICE_BOOK,
        lang: this.lang(),
      }),
    );
  });

  readonly comparison = computed(() => compareScenarios(this.scenarios(), this.breakdowns(), this.lang()));
  readonly canAddScenario = computed(() => this.#scenarioInputs().length < SCENARIO_IDS.length);

  /** Preparation any scenario needs: the vet prices the shared settings ask for. */
  readonly prepItems = computed(() => [...new Set(this.scenarioReports().flatMap((report) => report.prepItems))]);

  readonly insightsRequest = computed(() =>
    buildInsightsRequest({
      trip: this.trip(),
      report: this.report(),
      scenarios: this.scenarios(),
      breakdowns: this.breakdowns(),
      comparison: this.comparison(),
      today: this.today(),
      lang: this.lang(),
    }),
  );
  readonly insights = signal<InsightsState>(IDLE_INSIGHTS);
  /** The server said this device has no explanations left: no point in asking again. */
  readonly insightsUsedUp = computed(() => this.insights().remaining === 0);
  readonly insightsStale = computed(() => {
    const { payload } = this.insights();
    return payload !== null && payload !== JSON.stringify(this.insightsRequest());
  });

  /** Scenario id whose distance is being estimated. */
  readonly estimating = signal<string | null>(null);
  /** Why an estimate failed, per scenario id; the page words it in its language. */
  readonly estimateErrors = signal<Partial<Record<string, EstimateError>>>({});
  readonly #geocodeCache = new Map<string, GeocodeHit | null>();

  /** Off until the saved draft is back, so the defaults never overwrite it. */
  readonly #restored = signal(false);

  constructor() {
    effect(() => {
      if (!this.#restored()) return;
      const state = {
        v: 1,
        trip: this.#tripValue(),
        dogs: this.#dogsValue(),
        shared: this.shared(),
        scenarios: this.#scenarioInputs(),
        view: this.view(),
        tab: this.tab(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Private mode or a full quota: the planner works without the draft.
      }
    });
  }

  /** Brings back the visitor's last draft. Called after hydration, in the browser only. */
  restore(): void {
    if (!this.#isBrowser) return;
    this.today.set(todayIso());
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved?.v === 1) this.#apply(saved);
    } catch {
      // A broken draft is dropped, not repaired.
    }
    this.#restored.set(true);
  }

  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing saved to remove.
    }
    this.tripForm.reset();
    this.dogsForm.clear();
    this.dogsForm.push(this.#dogGroup());
    this.shared.set({ ...DEFAULT_SHARED });
    this.#scenarioInputs.set([defaultScenario('A', '', this.#tripBasics())]);
    // The allowance belongs to the device, not to the draft: it survives a reset.
    this.insights.update((state) => ({ ...IDLE_INSIGHTS, remaining: state.remaining, limit: state.limit }));
    this.view.set('trip');
    this.tab.set('readiness');
  }

  /** Moves between the steps; a step only opens when the ones before it are valid. */
  goTo(view: PlannerView): boolean {
    if (view !== 'trip' && this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      this.view.set('trip');
      return false;
    }
    if (view === 'results' && this.dogsForm.invalid) {
      this.dogsForm.markAllAsTouched();
      this.view.set('dogs');
      return false;
    }
    this.view.set(view);
    return true;
  }

  addDog(): void {
    if (this.dogsForm.length < MAX_DOGS) this.dogsForm.push(this.#dogGroup());
  }

  removeDog(index: number): void {
    if (this.dogsForm.length > 1) this.dogsForm.removeAt(index);
  }

  setTransit(transit: readonly CountryCode[]): void {
    const control = this.tripForm.controls.transitCountries;
    control.setValue([...new Set(transit)].filter((code) => code !== 'RS'));
    control.markAsDirty();
  }

  patchShared(patch: Partial<SharedCostSettings>): void {
    this.shared.update((shared) => ({ ...shared, ...patch, currency: shared.currency }));
  }

  /** Bumped when amounts are converted, so the editors re-read them. */
  readonly currencyVersion = signal(0);

  /**
   * Switches the planner's currency and converts every amount already typed
   * (prices, fees, budgets) at the current rate, so 60 € a night becomes
   * about 7 049 dinara instead of 60.
   */
  setCurrency(currency: Currency): void {
    const shared = this.shared();
    if (shared.currency === currency) return;
    const factor = currency === 'RSD' ? shared.rsdPerEur : 1 / shared.rsdPerEur;
    const convertAmount = (value: number | null | undefined): number | null =>
      value === null || value === undefined ? null : roundMoney(value * factor, currency);
    this.shared.set({
      ...shared,
      currency,
      fuelPrice: convertAmount(shared.fuelPrice),
      vetPrep: Object.fromEntries(Object.entries(shared.vetPrep).map(([item, value]) => [item, convertAmount(value)])),
    });
    this.#scenarioInputs.update((scenarios) =>
      scenarios.map((scenario) => ({
        ...scenario,
        ...Object.fromEntries(MONEY_FIELDS.map((field) => [field, convertAmount(scenario[field])])),
      })),
    );
    this.currencyVersion.update((version) => version + 1);
  }

  patchVetPrep(item: keyof SharedCostSettings['vetPrep'], value: number | null): void {
    this.shared.update((shared) => ({ ...shared, vetPrep: { ...shared.vetPrep, [item]: value } }));
  }

  patchScenario(id: string, patch: Partial<CostScenario>): void {
    this.#scenarioInputs.update((scenarios) =>
      scenarios.map((scenario) => (scenario.id === id ? { ...scenario, ...patch, id: scenario.id } : scenario)),
    );
  }

  /** A new scenario starts as a copy of A, so only what differs has to be changed. */
  addScenario(): void {
    const used = new Set(this.#scenarioInputs().map((scenario) => scenario.id));
    const id = SCENARIO_IDS.find((candidate) => !used.has(candidate));
    if (!id) return;
    const base = this.scenarios()[0];
    this.#scenarioInputs.update((scenarios) => [
      ...scenarios,
      {
        ...(JSON.parse(JSON.stringify(base)) as CostScenario),
        id,
        label: '',
      },
    ]);
  }

  /** The name the visitor gave a scenario; '' when it keeps its default one. */
  customLabel(id: string): string {
    return this.#scenarioInputs().find((scenario) => scenario.id === id)?.label ?? '';
  }

  removeScenario(id: string): void {
    if (id === 'A') return;
    this.#scenarioInputs.update((scenarios) => scenarios.filter((scenario) => scenario.id !== id));
  }

  /**
   * Straight-line distance between the two cities (Nominatim) times the road
   * factor. Two lookups, a second apart; any failure leaves the field to the
   * visitor.
   */
  async estimateDistance(id: string): Promise<void> {
    const scenario = this.scenarios().find((entry) => entry.id === id);
    const from = this.trip().departureCity;
    const to = scenario?.destinationCity.trim();
    const setError = (error: EstimateError | undefined) =>
      this.estimateErrors.update((errors) => ({ ...errors, [id]: error }));
    if (!scenario || !from || !to) {
      setError('needs-cities');
      return;
    }
    this.estimating.set(id);
    setError(undefined);
    try {
      const origin = await this.#geocode(from, 'rs');
      const target = await this.#geocode(to, scenario.destination.toLowerCase());
      if (!origin || !target) throw new Error('city not found');
      this.patchScenario(id, { distanceEstimateKm: estimateRoadKm(origin, target) });
    } catch {
      setError('failed');
    } finally {
      this.estimating.set(null);
    }
  }

  /** One click, one request: the button is locked while it runs, and identical facts are answered from memory. */
  explain(): void {
    if (!this.aiEnabled || this.insights().status === 'loading' || this.insightsUsedUp()) return;
    const request = this.insightsRequest();
    const payload = JSON.stringify(request);
    this.insights.update((state) => ({ ...state, status: 'loading', reason: null }));
    this.#insightsApi
      .explain(request)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((result) =>
        this.insights.update((state) => {
          // An answer without a limit is a server without one (dev); a failure that never
          // reached the limits (network, handler not deployed) says nothing about them.
          const unlimited = result.insights !== null && result.limit === null;
          return {
            status: result.status,
            insights: result.insights ?? state.insights,
            payload: result.insights ? payload : state.payload,
            remaining: unlimited ? null : (result.remaining ?? state.remaining),
            limit: unlimited ? null : (result.limit ?? state.limit),
            reason: result.reason,
          };
        }),
      );
  }

  async #geocode(query: string, country: string): Promise<GeocodeHit | null> {
    const key = `${country}|${query.toLowerCase()}`;
    if (this.#geocodeCache.has(key)) return this.#geocodeCache.get(key) ?? null;
    if (this.#geocodeCache.size) await new Promise((resolve) => setTimeout(resolve, GEOCODE_GAP_MS));
    const [hit] = await geocodeAddress(query, 1, country);
    this.#geocodeCache.set(key, hit ?? null);
    return hit ?? null;
  }

  #tripBasics() {
    const trip = this.trip();
    return {
      destination: trip.destination,
      transport: trip.transport,
      transitCountries: trip.transitCountries,
      nights: tripNights(trip),
    };
  }

  /** The trip as scenario B or C would make it, for its own readiness report. */
  #tripFor(scenario: CostScenario): TripPlan {
    const trip = this.trip();
    return {
      ...trip,
      destination: scenario.destination,
      destinationCity: scenario.destinationCity,
      transport: scenario.transport,
      transitCountries: scenario.transport === 'plane' ? [] : [...scenario.transitCountries],
      returnDate: trip.returnDate && trip.departureDate ? addDays(trip.departureDate, scenario.nights) : trip.returnDate,
    };
  }

  #dogGroup() {
    return this.#fb.group(
      {
        birthDate: ['', [(control: AbstractControl) => this.#notFuture(control)]],
        microchip: ['unknown-type' as MicrochipStatus],
        chipBeforeVaccination: ['unknown' as YesNoUnknown],
        rabiesVaccinated: ['unknown' as YesNoUnknown],
        rabiesVaccinationDate: [''],
        rabiesValidUntil: [''],
        rabiesPrimary: ['unknown' as YesNoUnknown],
        passport: ['unknown' as YesNoUnknown],
        restrictedBreed: ['unknown' as YesNoUnknown],
        fciRegistered: ['unknown' as YesNoUnknown],
        weightKg: [null as number | null, [Validators.min(0.5), Validators.max(100)]],
      },
      { validators: [vaccinationDatesInOrder] },
    );
  }

  #notPast(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    return isIsoDate(value) && value < this.today() ? { pastDeparture: true } : null;
  }

  #notFuture(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    return isIsoDate(value) && value > this.today() ? { futureBirth: true } : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #apply(saved: any): void {
    if (saved.trip && typeof saved.trip === 'object') this.tripForm.patchValue(saved.trip);
    if (Array.isArray(saved.dogs) && saved.dogs.length) {
      this.dogsForm.clear();
      for (const dog of saved.dogs.slice(0, MAX_DOGS)) {
        const group = this.#dogGroup();
        group.patchValue(dog);
        this.dogsForm.push(group);
      }
    }
    if (saved.shared && typeof saved.shared === 'object') {
      this.shared.set({ ...DEFAULT_SHARED, ...saved.shared, vetPrep: { ...(saved.shared.vetPrep ?? {}) } });
    }
    if (Array.isArray(saved.scenarios)) {
      const base = defaultScenario('A', '', this.#tripBasics());
      const scenarios = saved.scenarios
        .filter((scenario: { id?: unknown }) => SCENARIO_IDS.includes(scenario?.id as (typeof SCENARIO_IDS)[number]))
        .map((scenario: Partial<CostScenario>) => ({
          ...base,
          ...scenario,
          // Drafts from before the English version stored the default names.
          label: typeof scenario.label === 'string' && !LEGACY_LABEL.test(scenario.label) ? scenario.label : '',
          vignetteChoice: { ...(scenario.vignetteChoice ?? {}) },
        }));
      if (scenarios[0]?.id === 'A') this.#scenarioInputs.set(scenarios);
    }
    const view = pick(saved.view, ['trip', 'dogs', 'results'] as const, 'trip');
    this.tab.set(pick(saved.tab, ['readiness', 'costs', 'summary'] as const, 'readiness'));
    this.goTo(view);
  }
}

function returnAfterDeparture(group: AbstractControl): ValidationErrors | null {
  const { departureDate, returnDate, oneWay } = group.value as { departureDate: string; returnDate: string; oneWay: boolean };
  if (oneWay || !isIsoDate(departureDate) || !isIsoDate(returnDate)) return null;
  return returnDate < departureDate ? { returnBeforeDeparture: true } : null;
}

function vaccinationDatesInOrder(group: AbstractControl): ValidationErrors | null {
  const { rabiesVaccinationDate, rabiesValidUntil, rabiesVaccinated } = group.value as Record<string, string>;
  if (rabiesVaccinated !== 'yes' || !isIsoDate(rabiesVaccinationDate) || !isIsoDate(rabiesValidUntil)) return null;
  return rabiesValidUntil <= rabiesVaccinationDate ? { validUntil: true } : null;
}

type TripFormValue = ReturnType<PetTripPlanner['tripForm']['getRawValue']>;
type DogFormValue = ReturnType<PetTripPlanner['dogsForm']['getRawValue']>[number];

/** The forms' raw values as the domain's trip, with anything malformed dropped. */
export function toTripPlan(value: TripFormValue, dogs: DogFormValue[]): TripPlan {
  const destination = isCountryCode(value.destination) && value.destination !== 'RS' ? value.destination : 'HR';
  const transport = pick(value.transport, TRANSPORT_MODES, 'car');
  const departureDate = dateOrNull(value.departureDate);
  const returnDate = value.oneWay ? null : dateOrNull(value.returnDate);
  return {
    origin: 'RS',
    departureCity: value.departureCity.trim(),
    destination,
    destinationCity: value.destinationCity.trim(),
    transitCountries:
      transport === 'plane'
        ? []
        : value.transitCountries.filter((code) => isCountryCode(code) && code !== destination && code !== 'RS'),
    departureDate,
    returnDate: returnDate && departureDate && returnDate >= departureDate ? returnDate : null,
    transport,
    purpose: pick(value.purpose, ['non-commercial', 'commercial'] as const, 'non-commercial'),
    travelers: Math.min(MAX_TRAVELERS, Math.max(1, Math.floor(numberOrNull(value.travelers) ?? 1))),
    dogs: dogs.slice(0, MAX_DOGS).map((dog, index): DogProfile => {
      const vaccinated = pick(dog.rabiesVaccinated, YES_NO, 'unknown');
      return {
        ...emptyDog(index),
        birthDate: dateOrNull(dog.birthDate),
        microchip: pick(dog.microchip, MICROCHIP, 'unknown-type'),
        chipBeforeVaccination: pick(dog.chipBeforeVaccination, YES_NO, 'unknown'),
        rabiesVaccinated: vaccinated,
        rabiesVaccinationDate: vaccinated === 'yes' ? dateOrNull(dog.rabiesVaccinationDate) : null,
        rabiesValidUntil: vaccinated === 'yes' ? dateOrNull(dog.rabiesValidUntil) : null,
        rabiesPrimary: pick(dog.rabiesPrimary, YES_NO, 'unknown'),
        passport: pick(dog.passport, YES_NO, 'unknown'),
        restrictedBreed: pick(dog.restrictedBreed, YES_NO, 'unknown'),
        fciRegistered: pick(dog.fciRegistered, YES_NO, 'unknown'),
        weightKg: transport === 'plane' ? numberOrNull(dog.weightKg) : null,
      };
    }),
  };
}
