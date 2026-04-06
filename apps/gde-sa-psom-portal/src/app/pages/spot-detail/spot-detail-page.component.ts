import { Component, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { SpotsStore } from '../../shared/store/spots.store';
import {
  descriptionToKeyMap,
  descriptionToKeyMapGarden,
  descriptionToKeyMapSpot,
} from '../../shared/helpers/map.helpers';
import { RouteConstants } from '../../shared/constants/route.constant';
import { ChangeDetectionStrategy } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-spot-detail-page',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './spot-detail-page.component.html',
  styleUrl: './spot-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotDetailPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private spotsStore = inject(SpotsStore);
  private map: L.Map | undefined;

  readonly spot = signal<any>(null);
  currentSlide = 1;

  descriptionToKeyMap = descriptionToKeyMap;
  descriptionToKeyMapSpot = descriptionToKeyMapSpot;
  descriptionToKeyMapGarden = descriptionToKeyMapGarden;

  ngOnInit(): void {
    const state = history.state as Record<string, unknown>;
    if (state?.['spot']) {
      this.spot.set(state['spot']);
    } else {
      this.router.navigate(['/' + RouteConstants.allSpots]);
    }
  }

  ngAfterViewInit(): void {
    const data = this.spot();
    if (data) {
      this.initializeMap();
      this.geocodeAddress(`${data.iuo_adressa},${data.grd_ime}`);
    }
  }

  goToSlide(event: Event, slide: number): void {
    event.preventDefault();
    this.currentSlide = slide;
  }

  goBack(): void {
    this.location.back();
  }

  private initializeMap(): void {
    this.map = L.map('map', {
      center: [51.505, -0.09],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
  }

  private geocodeAddress(address: string): void {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (data.length > 0) {
          const lat = data[0].lat;
          const lon = data[0].lon;

          if (this.map) {
            this.map.setView([lat, lon], 15);

            const LeafIcon = new L.Icon({
              iconUrl: 'assets/logo-normal.png',
              shadowUrl:
                'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [100, 100],
              shadowSize: [50, 64],
              iconAnchor: [22, 94],
              shadowAnchor: [4, 62],
              popupAnchor: [-3, -76],
            });

            L.marker([lat, lon], { icon: LeafIcon })
              .addTo(this.map)
              .bindPopup(
                `<b>Adresa:</b> ${address} <br> <b>Velicina:</b> ${this.spot()?.sta_ime} <br> <b>Basta:</b> ${this.spot()?.bas_naziv}`
              )
              .openPopup();
          }
        }
      })
      .catch((error) => console.error('Geocoding error:', error));
  }
}
