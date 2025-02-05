import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { TranslocoModule } from '@ngneat/transloco';
import { ReplaySubject } from 'rxjs';
import { descriptionToKeyMap, descriptionToKeyMapSpot } from '../../helpers/map.helpers';

@Component({
  selector: 'app-search-filter',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    TranslocoModule,
  ],
  templateUrl: './search-filter.component.html',
  styleUrl: './search-filter.component.scss',
})
export class SearchFilterComponent {
  @Input() form!: FormGroup;
  @Input() townships: any[] = [];
  @Input() spotSizes: any[] = [];
  @Input() spotTypes: any[] = [];
  @Input() formDisabled=false;
  @Output() filterChange = new EventEmitter<any>();
  @Output() searchChange = new EventEmitter<any>();

  @Output() clearFiltersEvent = new EventEmitter<void>();
  @Input() townshipMultiFilterCtrl = new FormControl<string>('');
  @Input() filteredtownshipsMulti: ReplaySubject<any[]> = new ReplaySubject<
    any[]
  >(1);
   descriptionToKeyMap = descriptionToKeyMap;
    descriptionToKeyMapSpot = descriptionToKeyMapSpot;
  onSearchUpdated(value: string) {
    this.form.get('word')?.setValue(value);
    this.searchChange.emit(this.form.value);
  }

  onSelectionChange(field: string, event: any) {
    this.form.get(field)?.setValue(event.value);
    this.filterChange.emit(this.form.value);
  }

  onSubmit() {
    this.filterChange.emit(this.form.value);
  }

  clearFilters() {
    this.form.reset();
    this.clearFiltersEvent.emit();
  }
}
