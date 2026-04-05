import { Component, effect, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { TranslocoModule } from '@ngneat/transloco';
import { Router } from '@angular/router';
import { ReplaySubject, takeUntil } from 'rxjs';
import { SharedStore } from '../../shared/store/shared.store';
import { ParksStore } from '../../shared/store/parks.store';
import { filterTownshipsMulti } from '../../shared/utils/township.util';
import { RouteConstants } from '../../shared/constants/route.constant';
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-add-park-page',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    TranslocoModule,
  ],
  templateUrl: './add-park-page.component.html',
  styleUrl: './add-park-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddParkPageComponent {
  @ViewChild('multiSelect', { static: true }) multiSelect!: MatSelect;
  private destroyed$ = new ReplaySubject<boolean>(1);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  readonly sharedStore = inject(SharedStore);
  readonly parksStore = inject(ParksStore);

  townshipMultiFilterCtrl = new FormControl<string>('');
  filteredtownshipsMulti = new ReplaySubject<any[]>(1);

  parkForm!: FormGroup;

  constructor() {
    this.initParkForm();

    this.townshipMultiFilterCtrl.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.filterTownships());

    effect(() => {
      if (this.sharedStore.townships().length) {
        this.filteredtownshipsMulti.next(this.sharedStore.townships().slice());
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  initParkForm() {
    this.parkForm = this.fb.group({
      par_ime: ['', Validators.required],
      par_lokacija: ['', Validators.required],
      ops_id: [null, Validators.required],
      par_opis: [''],
      par_accepted: [0],
    });
  }

  onSave(): void {
    if (this.parkForm.valid) {
      this.parksStore.addPark(this.parkForm.value);
      this.router.navigate(['/' + RouteConstants.petParks]);
    }
  }

  onCancel(): void {
    this.router.navigate(['/' + RouteConstants.petParks]);
  }

  protected filterTownships() {
    const search = this.townshipMultiFilterCtrl.value ?? '';
    this.filteredtownshipsMulti.next(
      filterTownshipsMulti(this.sharedStore, search)
    );
  }
}
