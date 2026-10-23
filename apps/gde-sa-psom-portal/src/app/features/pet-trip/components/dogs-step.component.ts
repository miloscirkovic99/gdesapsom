import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MAX_DOGS, type MicrochipStatus, type YesNoUnknown } from '../domain/trip.models';
import { COPY } from '../pet-trip-copy';
import { PetTripPlanner } from '../pet-trip.planner';

/**
 * Step 2: one card per dog. Questions appear only when a rule on this trip
 * needs the answer: weight for flights, breed for routes through Germany or
 * Croatia, FCI registration for Croatia. Each card is its own <form>, so the
 * radio groups of two dogs never merge.
 */
@Component({
  selector: 'app-pet-trip-dogs-step',
  imports: [ReactiveFormsModule],
  templateUrl: './dogs-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogsStepComponent {
  readonly planner = inject(PetTripPlanner);
  readonly dogs = this.planner.dogsForm;
  readonly copy = computed(() => COPY[this.planner.lang()]);
  readonly maxDogs = MAX_DOGS;
  readonly yesNo: readonly YesNoUnknown[] = ['yes', 'no', 'unknown'];
  readonly microchipOptions: readonly MicrochipStatus[] = ['iso', 'unknown-type', 'other', 'none'];

  readonly #route = computed(() => {
    const trip = this.planner.trip();
    return [...trip.transitCountries, trip.destination];
  });
  readonly flying = computed(() => this.planner.trip().transport === 'plane');
  readonly breedMatters = computed(() => this.#route().some((code) => code === 'DE' || code === 'HR'));
  readonly croatiaOnRoute = computed(() => this.#route().includes('HR'));

  invalid(index: number, name: keyof ReturnType<typeof this.dogs.getRawValue>[number]): boolean {
    const control = this.dogs.at(index).controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  datesInvalid(index: number): boolean {
    const group = this.dogs.at(index);
    const control = group.controls.rabiesValidUntil;
    return group.hasError('validUntil') && (control.touched || control.dirty);
  }
}
