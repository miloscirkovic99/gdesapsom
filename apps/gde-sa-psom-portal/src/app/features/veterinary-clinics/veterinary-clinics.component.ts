import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { OpencageService } from '../../core/services/opencage.service';

@Component({
  selector: 'app-veterinary-clinics',
  imports: [CommonModule],
  templateUrl: './veterinary-clinics.component.html',
  styleUrl: './veterinary-clinics.component.scss',
})
export class VeterinaryClinicsComponent {
  vetClinics = signal<any>([]);
  private http = inject(HttpClient);
  private opencService = inject(OpencageService);
  constructor(){
    let opstineData = [];

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
    this.getClinics();
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

  // getClinics() {
  //   this.http.get('veterinary-clinics/list').subscribe({
  //     next: (result: any) => {
  //       console.log(result);
  //       // Assuming veterinary_clinics is the correct property name
  //       this.vetClinics.set(result.veterinary_clinics);

  //       // Check if vetc_adresa exists in any of the clinics
  //       const clinic = result?.veterinary_clinics?.find((clinic: any) => clinic?.vetc_adresa);
  //       if (clinic?.vetc_adresa) {
  //         console.log(clinic.vetc_adresa);

  //         this.opencService.getGeocode(clinic?.vetc_adresa).subscribe({
  //           next: (results) => {
  //             console.log(results.results[0].components.suburb);
  //             // Extract the relevant address or municipality from the response
  //             const opstina = results?.results?.[0]?.components?.county; // Example, adjust according to response structure
  //             if (opstina) {
  //               localStorage.setItem('opstine', opstina);
  //             }
  //           },
  //           error: (err) => {
  //             console.error(err);

  //           }
  //         });
  //       }
  //     },
  //     error: (err) => {
  //       console.error(err);
  //     }
  //   });
  // }

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
