import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { countryName, type CountryCode } from '../domain/countries';
import { type PrepItemId, prepItemLabel } from '../domain/costs';
import { formatDate } from '../domain/dates';
import { convert, CURRENCIES, type Currency, formatMoney, formatRange, type MoneyRange } from '../domain/money';
import { PRICE_BOOK, REFERENCE_RATES } from '../domain/rules/prices';
import { EMISSION_CLASSES, type EmissionClass } from '../domain/vignettes';
import { COPY } from '../pet-trip-copy';
import { PetTripPlanner } from '../pet-trip.planner';
import { ScenarioEditorComponent } from './scenario-editor.component';

const positive = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

/**
 * The cost side: settings every scenario shares, one editor per scenario
 * (A follows the trip; up to two alternatives), and the comparison, which
 * names a cheapest scenario only when the inputs support it.
 */
@Component({
  selector: 'app-pet-trip-costs',
  imports: [ReactiveFormsModule, ScenarioEditorComponent],
  templateUrl: './cost-planner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostPlannerComponent implements OnInit {
  readonly planner = inject(PetTripPlanner);
  readonly #fb = inject(FormBuilder).nonNullable;
  readonly #destroyRef = inject(DestroyRef);

  readonly lang = this.planner.lang;
  readonly copy = computed(() => COPY[this.lang()]);
  readonly currencies = CURRENCIES;
  readonly emissionClasses = EMISSION_CLASSES;
  readonly rateDate = computed(() => formatDate(REFERENCE_RATES.rsdDate, this.lang()));

  readonly form = this.#fb.group({
    rsdPerEur: [REFERENCE_RATES.rsdPerEur, [Validators.min(1)]],
    contingencyPercent: [10, [Validators.min(0), Validators.max(50)]],
    fuelConsumption: [null as number | null, [Validators.min(1), Validators.max(40)]],
    fuelPrice: [null as number | null, [Validators.min(0)]],
    emissionClass: ['' as EmissionClass | ''],
  });

  readonly currency = computed(() => this.planner.shared().currency);
  readonly anyCar = computed(() => this.planner.scenarios().some((scenario) => scenario.transport === 'car'));
  readonly romaniaByCar = computed(() =>
    this.planner
      .scenarios()
      .some((scenario) => scenario.transport === 'car' && [...scenario.transitCountries, scenario.destination].includes('RO')),
  );

  readonly prepFields = computed(() =>
    this.planner.prepItems().map((item) => {
      const fee = PRICE_BOOK.prepFees[item];
      const rates = { ...PRICE_BOOK.rates, rsdPerEur: this.planner.shared().rsdPerEur };
      const converted = fee ? convert(fee.amount, fee.currency, this.currency(), rates) : null;
      return {
        item,
        label: prepItemLabel(item, this.lang()),
        value: this.planner.shared().vetPrep[item] ?? null,
        estimate: converted !== null ? formatMoney(converted, this.currency(), this.lang()) : null,
      };
    }),
  );

  /** Rows of the comparison table, one column per scenario. */
  readonly columns = computed(() => {
    const reports = this.planner.scenarioReports();
    const breakdowns = this.planner.breakdowns();
    return this.planner.scenarios().map((scenario, index) => ({
      scenario,
      breakdown: breakdowns[index],
      report: reports[index],
      cheapest: this.planner.comparison().cheapestId === scenario.id,
    }));
  });

  readonly verdictText = computed(() => {
    const comparison = this.planner.comparison();
    const verdict = this.copy().compare.verdict[comparison.verdict];
    if (typeof verdict === 'string') return verdict;
    const cheapest = this.planner.scenarios().find((scenario) => scenario.id === comparison.cheapestId);
    return verdict(cheapest?.label ?? '', comparison.saving ? this.money(comparison.saving) : '');
  });

  ngOnInit(): void {
    const shared = this.planner.shared();
    this.form.patchValue({ ...shared, emissionClass: shared.emissionClass ?? '' }, { emitEvent: false });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      const value = this.form.getRawValue();
      this.planner.patchShared({
        rsdPerEur: positive(value.rsdPerEur) ?? REFERENCE_RATES.rsdPerEur,
        contingencyPercent: Math.min(50, Math.max(0, value.contingencyPercent ?? 0)),
        fuelConsumption: positive(value.fuelConsumption),
        fuelPrice: positive(value.fuelPrice),
        emissionClass: value.emissionClass || null,
      });
    });
  }

  setCurrency(event: Event): void {
    this.planner.setCurrency((event.target as HTMLSelectElement).value as Currency);
    this.form.patchValue({ fuelPrice: this.planner.shared().fuelPrice }, { emitEvent: false });
  }

  setPrep(item: PrepItemId, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? null : Number(raw);
    this.planner.patchVetPrep(item, value !== null && Number.isFinite(value) && value >= 0 ? value : null);
  }

  money(range: MoneyRange | null): string {
    return range ? formatRange(range, this.currency(), this.lang()) : '—';
  }

  nameOf(code: CountryCode): string {
    return countryName(code, this.lang());
  }
}
