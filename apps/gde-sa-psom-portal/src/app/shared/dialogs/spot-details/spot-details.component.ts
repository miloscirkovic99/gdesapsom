import { Component, importProvidersFrom, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet'; // Import Leaflet
import 'leaflet-control-geocoder'; // Import geocoder control if using
@Component({
  selector: 'app-spot-details',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule
  ],
  templateUrl: './spot-details.component.html',
  styleUrl: './spot-details.component.scss',
})
export class SpotDetailsComponent {
  private map: L.Map | undefined;
  readonly dialogRef = inject(MatDialogRef<SpotDetailsComponent>);
  readonly data = inject<any>(MAT_DIALOG_DATA);
  currentSlide = 1;
constructor(){
  this.dialogRef
  .keydownEvents()
  .subscribe((event: KeyboardEvent) => {
  
    if (event.key === 'Escape') {
      this.onNoClick();
    }
  });
}
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    console.log(this.data);
    
  }
  ngAfterViewInit(): void {
    this.initializeMap();
    this.geocodeAddress(`${this.data?.iuo_adressa},${this?.data.grd_ime}`);
  }

  // Initialize Leaflet map
  private initializeMap(): void {
   

    this.map = L.map('map', {
      center: [51.505, -0.09], // Initial center (can be anything, will update later)
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
  }

  // Geocode the address and place a marker
  private geocodeAddress(address: string): void {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${address}`;
    
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.length > 0) {
          const lat = data[0].lat;
          const lon = data[0].lon;
          
          if (this.map) {
            this.map.setView([lat, lon], 80);  // Center the map on the address

           // Create custom icon class
           const LeafIcon = new L.Icon({
            iconUrl: 'assets/small.png', // Path to the shadow image
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [40,45],                   // Size of the icon
              shadowSize: [50, 64],                 // Size of the shadow
              iconAnchor: [22, 94],                 // Position of the icon anchor (where the marker points to)
              shadowAnchor: [4, 62],                // Position of the shadow anchor
              popupAnchor: [-3, -76]                // Popup position relative to the icon
            
          });

          // Create an instance of the custom icon with the provided iconUrl


            L.marker([lat, lon],{ icon: LeafIcon }).addTo(this.map)  // Add a marker
              .bindPopup(`<b>Adresa:</b> ${address} <br> <b>Velicina:</b> ${this.data.sta_ime} <br> <b>Basta:</b> ${this.data.bas_naziv} `,)
              .openPopup();
          }
        } else {
          alert('Address not found');
        }
      })
      .catch((error) => console.error('Geocoding error:', error));
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  goToSlide(event:any,slideNumber: number) {
    // Prevents default anchor navigation behavior
    event.preventDefault(); 
    this.currentSlide = slideNumber;
    this.scrollToSlide(slideNumber);
  }

  scrollToSlide(slideNumber: number) {
    const slideElement = document.getElementById(`slide${slideNumber}`);
    if (slideElement) {
      slideElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}
