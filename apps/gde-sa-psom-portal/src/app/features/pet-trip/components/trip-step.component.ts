import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { COUNTRIES, type CountryCode, type CountryInfo } from '../domain/countries';
import type { Lang } from '../domain/lang';
import { MAX_TRAVELERS, TRANSPORT_MODES } from '../domain/trip.models';
import { COPY } from '../pet-trip-copy';
import { PetTripPlanner } from '../pet-trip.planner';
import { TransitPickerComponent } from './transit-picker.component';

const options = (countries: readonly CountryInfo[], lang: Lang) =>
  countries.map((info) => ({ code: info.code, name: info.name[lang] }));

/** Step 1: where, when and how. Everything here is shared by the readiness check and the costs. */
@Component({
  selector: 'app-pet-trip-trip-step',
  imports: [ReactiveFormsModule, TransitPickerComponent],
  templateUrl: './trip-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripStepComponent {
  readonly planner = inject(PetTripPlanner);
  readonly form = this.planner.tripForm;
  readonly lang = this.planner.lang;
  readonly copy = computed(() => COPY[this.lang()]);
  readonly transports = TRANSPORT_MODES;
  readonly maxTravelers = MAX_TRAVELERS;
  readonly euDestinations = computed(() => options(COUNTRIES.filter((info) => info.inEu), this.lang()));
  readonly otherDestinations = computed(() =>
    options(COUNTRIES.filter((info) => !info.inEu && info.code !== 'RS'), this.lang()),
  );
  readonly purposes = ['non-commercial', 'commercial'] as const;

  readonly trip = this.planner.trip;
  readonly needsTransit = computed(() => this.trip().transport !== 'plane');

  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  get returnInvalid(): boolean {
    const control = this.form.controls.returnDate;
    return this.form.hasError('returnBeforeDeparture') && (control.touched || control.dirty);
  }

  setTransit(transit: CountryCode[]): void {
    this.planner.setTransit(transit);
  }
}
