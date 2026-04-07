import { Component, inject, signal } from '@angular/core';
import { CommonModule, Location, DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import {
  descriptionToKeyMap,
  descriptionToKeyMapGarden,
  descriptionToKeyMapSpot,
} from '../../shared/helpers/map.helpers';
import { RouteConstants } from '../../shared/constants/route.constant';
import { SnackbarService } from '../../core/services/snackbar.service';
import { SpotsStore } from '../../shared/store/spots.store';
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private spotsStore = inject(SpotsStore);
  private document = inject(DOCUMENT);
  private snackbarService = inject(SnackbarService);
  private translocoService = inject(TranslocoService);
  private map: L.Map | undefined;

  readonly spot = signal<any>(null);
  readonly isLoading = signal(false);
  currentSlide = 1;

  descriptionToKeyMap = descriptionToKeyMap;
  descriptionToKeyMapSpot = descriptionToKeyMapSpot;
  descriptionToKeyMapGarden = descriptionToKeyMapGarden;

  ngOnInit(): void {
    const state = history.state as Record<string, unknown>;
    if (state?.['spot']) {
      this.spot.set(state['spot']);
    } else {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.isLoading.set(true);
        this.spotsStore.getSpotById(
          id,
          (response) => {
            this.spot.set(response);
            this.isLoading.set(false);
            setTimeout(() => {
              this.initializeMap();
              this.geocodeAddress(`${response.iuo_adressa},${response.grd_ime}`);
            });
          },
          () => {
            this.isLoading.set(false);
            this.router.navigate(['/' + RouteConstants.allSpots]);
          }
        );
      } else {
        this.router.navigate(['/' + RouteConstants.allSpots]);
      }
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

  get spotUrl(): string {
    return this.document.location.href;
  }

  shareOnFacebook(): void {
    const url = encodeURIComponent(this.spotUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
  }

  shareOnViber(): void {
    const url = encodeURIComponent(this.spotUrl);
    const text = encodeURIComponent(this.spot()?.iuo_ime ?? '');
    window.open(`viber://forward?text=${text}%20${url}`, '_self');
  }

  shareOnWhatsApp(): void {
    const url = encodeURIComponent(this.spotUrl);
    const text = encodeURIComponent(this.spot()?.iuo_ime ?? '');
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank', 'noopener,noreferrer');
  }

  shareOnTelegram(): void {
    const url = encodeURIComponent(this.spotUrl);
    const text = encodeURIComponent(this.spot()?.iuo_ime ?? '');
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.spotUrl).then(() => {
      const msg = this.translocoService.translate('link_copied');
      const btn = this.translocoService.translate('close');
      this.snackbarService.openSnackbar(msg, btn, 'success-snackbar');
    });
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
