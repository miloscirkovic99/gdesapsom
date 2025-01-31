import { Component, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { TranslocoModule } from '@ngneat/transloco';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { ReplaySubject, takeUntil } from 'rxjs';
import { SharedStore } from 'apps/gde-sa-psom-portal/src/app/shared/store/shared.store';

@Component({
  selector: 'app-setting-township',
  imports: [
    CommonModule,
    NgxMatSelectSearchModule,
    TranslocoModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  templateUrl: './setting-township.component.html',
  styleUrls: ['./setting-township.component.scss'],
})
export class SettingTownshipComponent implements OnInit, OnDestroy {
  private destroyed$ = new ReplaySubject<boolean>(1);

  form!: FormGroup;
  cityForm!: FormGroup;

  townshipMultiFilterCtrl = new FormControl<string>('');
  filteredTownships$ = new ReplaySubject<any[]>(1);

  sharedStore = inject(SharedStore);

  constructor(private fb: FormBuilder) {
    effect(() => {
      if (this.sharedStore.city().length) {
        this.filteredTownships$.next(this.sharedStore.city().slice());
      }
    });
  }

  ngOnInit(): void {
    this.initForms();
    this.setupTownshipFilter();
  }

  private initForms(): void {
    this.form = this.fb.group({
      ops_ime: ['', Validators.required],
      grd_id: [null, Validators.required],
    });

    this.cityForm = this.fb.group({
      drz_id: [null, Validators.required],
      grd_ime: ['', Validators.required],
    });
  }

  private setupTownshipFilter(): void {
    this.townshipMultiFilterCtrl.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe((search: any) => {
        this.filterCity(search);
      });
  }

  private filterCity(search: string = ''): void {
    const city = this.sharedStore.city() || [];
    if (!search.trim()) {
      this.filteredTownships$.next(city);
      return;
    }

    const filtered = city.filter(({ grd_ime }: any) =>
      grd_ime.toLowerCase().includes(search.toLowerCase())
    );

    this.filteredTownships$.next(filtered);
  }

  onSave(): void {
    if (this.form.valid) {
      this.sharedStore.addTownship(this.form.value)
      this.form.reset()
    }
  }

  onSaveCity(): void {
    if (this.cityForm.valid) {
       this.sharedStore.addCity(this.cityForm.value)
       this.cityForm.reset()

    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }
}
