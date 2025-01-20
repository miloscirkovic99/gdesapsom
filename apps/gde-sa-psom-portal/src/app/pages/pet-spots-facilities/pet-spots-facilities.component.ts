import { Component, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SpotsStore } from '../../shared/store/spots.store';
import { CardComponent } from "../../shared/components/card/card.component";
import AOS from 'aos';

@Component({
  selector: 'app-pet-spots-facilities',
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, ReactiveFormsModule, CardComponent],
  templateUrl: './pet-spots-facilities.component.html',
  styleUrl: './pet-spots-facilities.component.scss',
})
export class PetSpotsFacilitiesComponent {
  animalControl = new FormControl<any | null>(null, Validators.required);
  spotsStore = inject(SpotsStore);

  form!: FormGroup;
  opstine = [{ name: 'Opstina 1' }, { name: 'Opstina 2' }, { name: 'Opstina 3' }];
  starosti = [{ name: 'Starost 1' }, { name: 'Starost 2' }, { name: 'Starost 3' }];
  tipObjekti = [{ name: 'Tip 1' }, { name: 'Tip 2' }, { name: 'Tip 3' }];
  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group({
      ops_id: new FormControl([], Validators.required),   // Multiple select
      sta_id: new FormControl(null, Validators.required),  // Single select
      ugo_id: new FormControl(null) // Single select
    });
  }



  onSubmit() {
    const data={
      ops_id: this.form.value.ops_id.map((item:any) => item.name).join(", "),
      ugo_id:this.form.value.ugo_id,
      sta_id:this.form.value.sta_id,
    }
    console.log(data);
    
    if (this.form.valid) {
      console.log(this.form.value);  // Output the form data when submitted
    } else {
      console.log('Form is invalid');
    }
  }
}
