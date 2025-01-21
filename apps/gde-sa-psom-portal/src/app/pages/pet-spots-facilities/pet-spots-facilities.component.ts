import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SpotsStore } from '../../shared/store/spots.store';
import { CardComponent } from '../../shared/components/card/card.component';
import AOS from 'aos';
import { HttpClient } from '@angular/common/http';
import { debounceTime, ReplaySubject, Subscriber, switchMap, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-pet-spots-facilities',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    CardComponent,
  ],
  templateUrl: './pet-spots-facilities.component.html',
  styleUrl: './pet-spots-facilities.component.scss',
})
export class PetSpotsFacilitiesComponent {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  spotsStore = inject(SpotsStore);
  form!: FormGroup;

  previousFormValues: any = {}; // To track previous dropdown values

  opstine = signal<any>([]);
  tipObjekta = signal<any>([]);
  private http = inject(HttpClient);

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      ops_id: new FormControl(''), // Multiple select
      sta_id: new FormControl(''), // Single select
      ugo_id: new FormControl(''), // Single select
    });

    // Initialize previous form values
    this.previousFormValues = this.form.value;

    // Track form changes
    this.form.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe((value) => {
      console.log(value);
      
    });
  }

  ngOnInit() {
    this.spotTypes();
    this.countryAndCites();
  }

  spotTypes() {
    this.http
      .get<any>('pet-friendly-spots-types/list')
      .pipe(takeUntil(this.destroyed$))
      .subscribe((response:any) => {
        this.tipObjekta.set(response.spotTypes);
      });
  }

  countryAndCites() {
    this.http
      .get<any>('township')
      .pipe(takeUntil(this.destroyed$))
      .subscribe((response:any) => {
        this.opstine.set(response.township);
      });
  }

  onSubmit() {
    const data = {
      ops_id: this.form.value.ops_id ? this.form.value.ops_id?.join(',') : null,
      ugo_id: this.form.value.ugo_id || null,
      sta_id: this.form.value.sta_id || null,
    };
    const resetOffset = this.form.touched

    // Check if dropdown values have changed
console.log(resetOffset);

    this.spotsStore.searchByFiltersTest(
      data.ops_id,
      data.ugo_id,
      data.sta_id,
      resetOffset
    );

    // Update previous form values
    this.previousFormValues = { ...this.form.value };
  }

  clearFilters() {
    this.form.reset();
    this.previousFormValues = {}; // Reset previous values
    this.spotsStore.searchByFiltersTest(null, null, null, true);
  }

  checkForChanges() {
    // Add logic if you need additional side-effects when dropdown values change
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
