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

  search=new FormControl<string>('');

  opstine = signal<any>([]);
  tipObjekta = signal<any>([]);
  private http = inject(HttpClient);

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      ops_id: new FormControl('', Validators.required), // Multiple select
      sta_id: new FormControl(null, Validators.required), // Single select
      ugo_id: new FormControl(null), // Single select
    });
  }

  ngOnInit() {
    this.spotTypes();
    this.countryAndCites();
    this.search.valueChanges
    .pipe(
      debounceTime(300), // Add a debounce of 300ms
      switchMap((name) =>
        this.http.put<any>('pet-friendly-spots/search-query', { name })
      ),
    )
    .subscribe();
  }

  spotTypes() {
    this.http
      .get<any>('pet-friendly-spots-types/list')
      .pipe(takeUntil(this.destroyed$))
      .subscribe((response) => {
        this.tipObjekta.set(response.spotTypes);
      });
  }
  countryAndCites() {
    this.http
      .get<any>('township')
      .pipe(takeUntil(this.destroyed$))
      .subscribe((response) => {
        this.opstine.set(response.township);
      });
  }
 
  onSubmit() {
    const data = {
      ops_id: this.form.value.ops_id?.join(','),
      ugo_id: this.form.value.ugo_id,
      sta_id: this.form.value.sta_id,
    };
    this.spotsStore.searchByFilters(data.ops_id, data.ugo_id, data.sta_id);
  }
clearFilters(){
  this.form.reset()
  this.form.clearValidators()
  this.spotsStore.loadMore()
}
  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
