import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { VetClinic, VetClinicsStore, SharedStore } from '@gde/shared/data-access';
import { TranslocoModule } from '@ngneat/transloco';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { debounceTime, distinctUntilChanged, ReplaySubject, takeUntil } from 'rxjs';
import { filterTownshipsMulti, SEARCH_TRACKING_DEBOUNCE_MS } from '@gde/shared/util';
import { AnalyticsService } from '../../core/services/analytics.service';
import { refreshAosOn } from '../../core/aos/refresh-aos-on';

@Component({
  selector: 'app-veterinary-clinics',
  imports: [
    CommonModule,
    TranslocoModule,
    NgxMatSelectSearchModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './veterinary-clinics.component.html',
  styleUrl: './veterinary-clinics.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
  
})
export class VeterinaryClinicsComponent {
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);
  vetClinics = signal<any>([]);
  private http = inject(HttpClient);
  vetClinicsStore = inject(VetClinicsStore);
  sharedStore=inject(SharedStore)
  private analytics = inject(AnalyticsService);
  form!: FormGroup;

    /** control for the MatSelect filter keyword multi-selection */
    public townshipMultiFilterCtrl = new FormControl<string>('');

    /** list of tonwhips filtered by search keyword */
    public filteredtownshipsMulti: ReplaySubject<any[]> = new ReplaySubject<
      any[]
    >(1);

  constructor(private fb: FormBuilder) {
    refreshAosOn(() => this.vetClinicsStore.vetClinicsList());
    this.form = this.fb.group({
      ops_id: new FormControl(null), // Multiple select
      grd_id: new FormControl(null), // Multiple select
      word: new FormControl(null),
    });
    // listen for search field value changes
    this.townshipMultiFilterCtrl.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.filterTownshipsMulti();
      });
    effect(() => {

      if (this.sharedStore.townshipsByCity().length) {
        this.filteredtownshipsMulti.next(this.sharedStore.townshipsByCity().slice());
      }
    });
    this.form.get('word')?.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe((result)=>{
      this.formData(true,result);
    })
    this.form.get('word')?.valueChanges
      .pipe(debounceTime(SEARCH_TRACKING_DEBOUNCE_MS), distinctUntilChanged(), takeUntil(this.destroyed$))
      .subscribe((word) => this.analytics.trackSearch('vet_clinics', word));
  }

  onSelectionChange(event: any) {
    const selectedGrdId = event.value;
    if(selectedGrdId==1){

      // Call the function to fetch townships or any other data related to the selected value
      this.sharedStore.getTownshipsByCity(selectedGrdId);
      this.filterTownshipsMulti()
    }else{
      this.form.get('ops_id')?.setValue(null)
    }
  }

  protected filterTownshipsMulti() {
    const search: any = this.townshipMultiFilterCtrl.value;
    const filteredTownships = filterTownshipsMulti(this.sharedStore, search);

    this.filteredtownshipsMulti.next(filteredTownships);
  }
  onSubmit(resetOffset: boolean = false) {
    // resetOffset is only true for the Apply button; "see more" pages without it.
    if (resetOffset) {
      const { ops_id, grd_id } = this.form.value;
      this.analytics.trackFilterApplied('vet_clinics', [
        ...(ops_id?.length ? ['ops_id'] : []),
        ...(grd_id ? ['grd_id'] : []),
      ]);
    }
    this.formData(resetOffset);
  }
  formData(resetOffset: boolean = false, word = null) {
    const data = {
      ops_id: this.form.value.ops_id?.length
        ? this.form.value.ops_id?.join(',')
        : null,
      grd_id: this.form.value.grd_id || null,
      word: word || null,
      resetOffset: this.form.value.word || resetOffset ? true : false,
    };

    this.vetClinicsStore.loadVetclinics({ data });
  }

  resetData() {
    const data = {
      ops_id: null,
      grd_id: null,
      word: null,
      resetOffset: true,
    };
    this.vetClinicsStore.loadVetclinics({ data });
  }
  clearFilters() {
    this.form.reset();
    this.resetData();
  }

  googleMapsUrl(item: VetClinic): string | null {
    return item?.vetc_adresa
      ? `https://www.google.com/maps?q=${encodeURIComponent(item.vetc_adresa)}`
      : null;
  }

  /** `vet-<id>` names the clinic in GA4 (`venue_slug`); clinics have no slug. */
  venueSlug(item: VetClinic): string | null {
    return item?.vetc_id ? `vet-${item.vetc_id}` : null;
  }

  disableForm(): boolean {
    if (!this.form.get('grd_id')?.value && !this.form.get('word')?.value) {
      return true;
    }
    return false;
  }
  getTownship(event: any) {
    // Retrieve the data from localStorage
    const opstine = JSON.parse(localStorage.getItem('opstine')!);

    // Convert the data into JSON format
    const jsonData = JSON.stringify(opstine);

    // Create a Blob from the JSON data
    const blob = new Blob([jsonData], { type: 'application/json' });

    // Create a download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'opstine_data.json'; // Set the file name

    // Trigger the download by simulating a click event
    link.click();
  }
  unsubscribe(){
    this.destroyed$.next(true);
    this.destroyed$.complete();
    this.filteredtownshipsMulti.next([]);
    this.filteredtownshipsMulti.complete()
  }
  ngOnDestroy(): void {
    this.unsubscribe()
    this.resetData();
  }
}
