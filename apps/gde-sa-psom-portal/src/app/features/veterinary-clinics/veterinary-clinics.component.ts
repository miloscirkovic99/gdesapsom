import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { OpencageService } from '../../core/services/opencage.service';
import { VetClinicsStore } from '../../shared/store/vetclinics.store';
import { TranslocoModule } from '@ngneat/transloco';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-veterinary-clinics',
  imports: [CommonModule,TranslocoModule],
  templateUrl: './veterinary-clinics.component.html',
  styleUrl: './veterinary-clinics.component.scss',
})
export class VeterinaryClinicsComponent {
  vetClinics = signal<any>([]);
  private http = inject(HttpClient);
   vetClinicsStore = inject(VetClinicsStore);
  form!: FormGroup;
  constructor(private fb:FormBuilder){
   this.form = this.fb.group({
      grd_id: new FormControl(null), // Multiple select
      word: new FormControl(null),
    });

    effect(()=>{

      if(this.vetClinics()){
        this.vetClinics().map((item:any)=>{
          if(item.grd_id==1){

            // this.opencService.getGeocode(item?.vetc_adresa).subscribe({
            //   next: (results) => {
            //     console.log(results);

            //     const data = {
            //       naziv: item.vetc_naziv,
            //       opstina: results?.results[0]?.components?.suburb
            //     };

            //     // Push the data to the opstineData array
            //     opstineData.push(data);

            //     // After collecting all data, store the array in localStorage
            //     localStorage.setItem('opstine', JSON.stringify(opstineData));
            //   },
            //   error: (err) => {
            //     console.error(err);
            //   },
            // });
          }
        })
      }
    })

  }
  ngOnInit() {
    // this.vetClinicsStore.loadVetclinics({})
  }

  getClinics() {
    this.http.get('veterinary-clinics/list').subscribe({
      next: (result: any) => {
        console.log(result);
        // Assuming veterinary_clinics is the correct property name
        this.vetClinics.set(result.veterinary_clinics);


      },
      error: (err) => {
        console.error(err);
      },
    });
  }

  onSubmit(resetOffset: boolean = false) {
    this.formData(resetOffset);
  }
  formData(resetOffset: boolean = false,word=null) {
    const data = {
      // ops_id: this.form.value.ops_id?.length
      //   ? this.form.value.ops_id?.join(',')
      //   : null,
      grd_id: this.form.value.grd_id || null,
      sta_id: this.form.value.sta_id || null,
      word: word || null,
      resetOffset: this.form.value.word || resetOffset ? true : false,
    };

    this.vetClinicsStore.loadVetclinics({ data });
  }
  navigateToGoogleMaps(item:any) {
    const location = item.vetc_adresa ;
  
    // Check if location exists
    if (location) {
      const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(location)}`;
      window.open(googleMapsUrl, '_blank'); // Open in a new tab
    }
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
}
