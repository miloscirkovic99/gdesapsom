import {
  Component,
  effect,
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
import {
  descriptionToKeyMap,
  descriptionToKeyMapSpot,
} from '../../shared/helpers/map.helpers';
import { SharedStore } from '../../shared/store/shared.store';

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
  sharedStore=inject(SharedStore)
  form!: FormGroup;
  previousFormValues: any = {}; // To track previous dropdown values

  descriptionToKeyMap = descriptionToKeyMap;
  descriptionToKeyMapSpot = descriptionToKeyMapSpot;

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
      effect(()=>{
        if(this.sharedStore.townships().length){
          this.filteredtownshipsMulti.next(this.sharedStore.townships().slice());

        }
      })
  }

 
  protected filterTownshipsMulti() {
    if (!this.sharedStore.townships()) {
      return;
    }
    let search = this.townshipMultiFilterCtrl.value;
    if (!search) {
      this.filteredtownshipsMulti.next(this.sharedStore.townships().slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    this.filteredtownshipsMulti.next(
      this.sharedStore.townships().filter((township: any) =>
        township.ime.toLowerCase().includes(search)
      )
    );
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
