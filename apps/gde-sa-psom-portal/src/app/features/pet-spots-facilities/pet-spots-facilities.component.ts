import {
  Component,
  effect,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
import {
  debounceTime,
  delay,
  fromEvent,
  map,
  ReplaySubject,
  Subscription,
  takeUntil,
} from 'rxjs';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule } from '@ngneat/transloco';
import {
  descriptionToKeyMap,
  descriptionToKeyMapSpot,
} from '../../shared/helpers/map.helpers';
import { SharedStore } from '../../shared/store/shared.store';
import { filterTownshipsMulti } from '../../shared/utils/township.util';

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
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  /** control for the MatSelect filter keyword multi-selection */
  public townshipMultiFilterCtrl = new FormControl<string>('');

  /** list of tonwhips filtered by search keyword */
  public filteredtownshipsMulti: ReplaySubject<any[]> = new ReplaySubject<
    any[]
  >(1);

  spotsStore = inject(SpotsStore);
  sharedStore = inject(SharedStore);
  form!: FormGroup;

  descriptionToKeyMap = descriptionToKeyMap;
  descriptionToKeyMapSpot = descriptionToKeyMapSpot;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      ops_id: new FormControl(null), // Multiple select
      sta_id: new FormControl(null), // Single select
      ugo_id: new FormControl(null), // Single select
      word: new FormControl(null),
    });

    // listen for search field value changes
    this.townshipMultiFilterCtrl.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.filterTownshipsMulti();
      });
    effect(() => {
      if (this.sharedStore.townships().length) {
        this.filteredtownshipsMulti.next(this.sharedStore.townships().slice());
      }
    });
    this.form.get('word')?.valueChanges.subscribe((result)=>{      
      this.formData(true,result);
    })
  }

  protected filterTownshipsMulti() {
    const search: any = this.townshipMultiFilterCtrl.value;
    const filteredTownships = filterTownshipsMulti(this.sharedStore, search);

    this.filteredtownshipsMulti.next(filteredTownships);
  }

  onSubmit(resetOffset: boolean = false) {
    this.formData(resetOffset);
  }
  formData(resetOffset: boolean = false,word=null) {
    const data = {
      ops_id: this.form.value.ops_id?.length
        ? this.form.value.ops_id?.join(',')
        : null,
      ugo_id: this.form.value.ugo_id || null,
      sta_id: this.form.value.sta_id || null,
      word: word || null,
      resetOffset: this.form.value.word || resetOffset ? true : false,
    };
   
    this.spotsStore.loadSpots({ data });
  }
  resetData() {
    const data = {
      ops_id: null,
      ugo_id: null,
      sta_id: null,
      word: null,
      resetOffset: true,
    };
    this.spotsStore.loadSpots({ data });
  }
  clearFilters() {
    this.form.reset();
    this.resetData();
  }
  onSelectionChange(controlName: string, event: any) {
    const value = event.value;
    const isFormDisabled = this.disableForm();

    if (value === null && isFormDisabled) {
      this.resetData();
    }
  }


  disableForm(): boolean {
    if (
      !this.form.get('sta_id')?.value &&
      !this.form.get('ugo_id')?.value &&
      !this.form.get('ops_id')?.value &&
      !this.form.get('word')?.value
    ) {
      return true;
    }
    return false;
  }
  ngOnDestroy() {
    this.destroyed$.next(true);
    this.destroyed$.complete();
    this.resetData();
  }
}
