import {
  Component,
  inject,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { SpotsStore } from '../../shared/store/spots.store';
import { CardComponent } from '../../shared/components/card/card.component';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject, take, takeUntil } from 'rxjs';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-pet-spots-facilities',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatIconModule,
    CardComponent,
    NgxMatSelectSearchModule,
    TranslocoModule,
  ],
  templateUrl: './pet-spots-facilities.component.html',
  styleUrl: './pet-spots-facilities.component.scss',
})
export class PetSpotsFacilitiesComponent {
  @ViewChild('multiSelect', { static: true }) multiSelect!: MatSelect;
  private http = inject(HttpClient);
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  /** control for the MatSelect filter keyword multi-selection */
  public townshipMultiFilterCtrl = new FormControl<string>('');

  /** list of tonwhips filtered by search keyword */
  public filteredtownshipsMulti: ReplaySubject<any[]> = new ReplaySubject<
    any[]
  >(1);

  spotsStore = inject(SpotsStore);
  form!: FormGroup;
  previousFormValues: any = {}; // To track previous dropdown values
  opstine = signal<any>([]);
  tipObjekta = signal<any>([]);
  descriptionToKeyMap: { [key: string]: string } = {
    'Svi psi': 'all_dogs',
    'Mali pas': 'small_dog',
    'Mali pas i štenci većih rasa do 5 meseci starosti': 'small_puppies',
  };
  descriptionToKeyMapSpot: { [key: string]: string } = {
    'Kafić': 'cafe',
    'Restoran': 'restaurant',
    'Splav': 'float',
    'Hotel': 'hotel',
    'Pab': 'pub',
    'Motel': 'motel',
    'Teretana': 'gym',
    'Apartman': 'apartment',
    'Ostalo': 'other',
  };
  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      ops_id: new FormControl(''), // Multiple select
      sta_id: new FormControl(''), // Single select
      ugo_id: new FormControl(''), // Single select
    });
      // listen for search field value changes
      this.townshipMultiFilterCtrl.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.filterTownshipsMulti();
      });
  }

  ngOnInit() {
    this.spotTypes();
    this.countryAndCites();
  
  }
  protected filterTownshipsMulti() {
    if (!this.opstine()) {
      return;
    }
    let search = this.townshipMultiFilterCtrl.value;
    if (!search) {
      this.filteredtownshipsMulti.next(this.opstine().slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    this.filteredtownshipsMulti.next(
      this.opstine().filter((township: any) =>
        township.ime.toLowerCase().includes(search)
      )
    );
  }
  spotTypes() {
    this.http
      .get<any>('pet-friendly-spots-types/list')
      .pipe(take(1), takeUntil(this.destroyed$))
      .subscribe((response: any) => {
        this.tipObjekta.set(response.spotTypes);
      });
  }

  countryAndCites() {
    this.http
      .get<any>('township')
      .pipe(take(1), takeUntil(this.destroyed$))
      .subscribe((response: any) => {
        this.opstine.set(response.township);
        // load the initial bank list
        this.filteredtownshipsMulti.next(this.opstine().slice());
      });
  }

  onSubmit(resetOffset: boolean = false) {

    const data = {
      ops_id: this.form.value.ops_id ? this.form.value.ops_id?.join(',') : null,
      ugo_id: this.form.value.ugo_id || null,
      sta_id: this.form.value.sta_id || null,
    };

    this.spotsStore.loadData(
      data.ops_id,
      data.ugo_id,
      data.sta_id,
      resetOffset
    );
  }

  clearFilters() {
    this.form.reset();
    this.spotsStore.loadData(null, null, null, true);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
