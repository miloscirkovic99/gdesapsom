import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
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
  private routeLayers: L.Layer[] = [];

  @ViewChild('startLocationInput') startLocationInput!: ElementRef<HTMLInputElement>;

  readonly showDirectionsModal = signal(false);
  readonly showInlineRoute = signal(false);
  readonly spot = signal<any>(null);
  readonly isLoading = signal(false);
  readonly isLoadingDirections = signal(false);
  readonly isGettingLocation = signal(false);
  currentSlide = 1;

  descriptionToKeyMap = descriptionToKeyMap;
  descriptionToKeyMapSpot = descriptionToKeyMapSpot;
  descriptionToKeyMapGarden = descriptionToKeyMapGarden;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      console.error('No spot ID found in route');
      this.router.navigate(['/' + RouteConstants.allSpots]);
      return;
    }

    this.isLoading.set(true);
    this.spotsStore.getSpotById(
      id,
      (response) => {
        if (response) {
          this.spot.set(response);
          this.isLoading.set(false);
          setTimeout(() => {
            this.initializeMap();
            this.geocodeAddress(`${response.iuo_adressa},${response.grd_ime}`);
          });
        } else {
          this.isLoading.set(false);
          this.router.navigate(['/' + RouteConstants.allSpots]);
        }
      },
      () => {
        this.isLoading.set(false);
        this.router.navigate(['/' + RouteConstants.allSpots]);
      }
    );
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
    const spot = this.spot();
    if (!spot?.latitude || !spot?.longitude) {
      console.warn('No coordinates available for spot');
      return;
    }

    const lat = parseFloat(spot.latitude);
    const lon = parseFloat(spot.longitude);

    if (this.map) {
      this.map.setView([lat, lon], 20);

      const LeafIcon = new L.Icon({
        iconUrl: 'assets/logo-small.png',
        shadowUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [100, 100],
        shadowSize: [50, 64],
        iconAnchor: [22, 94],
        shadowAnchor: [4, 62],
        popupAnchor: [-3, -76],
      });

      const marker = L.marker([lat, lon], { icon: LeafIcon })
        .addTo(this.map)
        .bindPopup(
          `<b>Adresa:</b> ${address} <br> <b>Velicina:</b> ${spot?.sta_ime} <br> <b>Basta:</b> ${spot?.bas_naziv}`
        )
        .openPopup();

      // Ensure marker is centered and visible
      this.map.flyTo([lat, lon], 18, {
        duration: 1,
      });
    }
  }
  openDirections(): void {
    this.showDirectionsModal.set(true);
  }

  closeDirectionsModal(): void {
    this.showDirectionsModal.set(false);
    // this.showInlineRoute.set(false);
  }

  openInGoogleMaps(): void {
    const data = this.spot();
    if (!data?.latitude || !data?.longitude) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${data.latitude},${data.longitude}`,
      '_blank', 'noopener,noreferrer'
    );
    this.closeDirectionsModal();
  }

  openInWaze(): void {
    const data = this.spot();
    if (!data?.latitude || !data?.longitude) return;
    window.open(
      `https://waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes`,
      '_blank', 'noopener,noreferrer'
    );
    this.closeDirectionsModal();
  }

  openInAppleMaps(): void {
    const data = this.spot();
    if (!data?.latitude || !data?.longitude) return;
    window.open(
      `https://maps.apple.com/?daddr=${data.latitude},${data.longitude}`,
      '_blank', 'noopener,noreferrer'
    );
    this.closeDirectionsModal();
  }

  showRouteOnMap(): void {
    this.showInlineRoute.set(true);
    this.closeDirectionsModal();
  }

  getCurrentLocation(): void {
    this.isGettingLocation.set(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          // Reverse geocode to get address
          this.reverseGeocode(lat, lon).then((address) => {
            if (this.startLocationInput) {
              this.startLocationInput.nativeElement.value = address || `${lat}, ${lon}`;
            }
            this.isGettingLocation.set(false);
            const msg = this.translocoService.translate('close');
            this.snackbarService.openSnackbar(this.translocoService.translate('use_current_location'), msg, 'success-snackbar');
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          const msg = this.translocoService.translate('unable_to_get_location');
          this.snackbarService.openSnackbar(msg, this.translocoService.translate('close'), 'error');
          this.isGettingLocation.set(false);
        }
      );
    } else {
      const msg = this.translocoService.translate('geolocation_not_supported');
      this.snackbarService.openSnackbar(msg, this.translocoService.translate('close'), 'error');
      this.isGettingLocation.set(false);
    }
  }

  async getDirections(): Promise<void> {
    const startLocation = this.startLocationInput?.nativeElement?.value;
    if (!startLocation) {
      const msg = this.translocoService.translate('enter_start_location');
      this.snackbarService.openSnackbar(msg, this.translocoService.translate('close'), 'warning');
      return;
    }

    this.isLoadingDirections.set(true);

    try {
      // Clear previous route layers
      this.clearRouteOverlays();

      // Geocode start location
      const startCoords = await this.geocodeLocation(startLocation);
      if (!startCoords) {
        const msg = this.translocoService.translate('start_location_not_found');
        this.snackbarService.openSnackbar(msg, this.translocoService.translate('close'), 'error');
        this.isLoadingDirections.set(false);
        return;
      }

      const data = this.spot();
      if (!data?.latitude || !data?.longitude) {
        const msg = this.translocoService.translate('destination_coordinates_not_found');
        this.snackbarService.openSnackbar(msg, this.translocoService.translate('close'), 'error');
        this.isLoadingDirections.set(false);
        return;
      }

      // Ensure map is initialized
      if (!this.map) {
        this.initializeMap();
      }

      // Get route from OSRM
      const route = await this.getRoute(startCoords.lat, startCoords.lon, data.latitude, data.longitude);

      if (route && this.map) {
        // Draw route on map
        const coordinates = route.map((coord: [number, number]) => [coord[1], coord[0]] as L.LatLngExpression);
        const polyline = L.polyline(coordinates, {
          color: 'blue',
          weight: 4,
          opacity: 0.7,
        }).addTo(this.map);
        this.routeLayers.push(polyline);

        // Fit map to route bounds
        setTimeout(() => {
          if (this.map && polyline.getBounds()) {
            this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
          }
        }, 100);

        // Add start marker
        const startIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          shadowSize: [41, 41],
          iconAnchor: [12, 41],
          shadowAnchor: [12, 41],
          popupAnchor: [1, -34],
        });

        const startMarker = L.marker([startCoords.lat, startCoords.lon], { icon: startIcon })
          .addTo(this.map)
          .bindPopup(this.translocoService.translate('start_location'));
        this.routeLayers.push(startMarker);

        // Add end marker
        const endIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          shadowSize: [41, 41],
          iconAnchor: [12, 41],
          shadowAnchor: [12, 41],
          popupAnchor: [1, -34],
        });

        const endMarker = L.marker([data.latitude, data.longitude], { icon: endIcon })
          .addTo(this.map)
          .bindPopup(this.translocoService.translate('destination_coordinates_not_found'));
        this.routeLayers.push(endMarker);

        const msg = this.translocoService.translate('route_loaded');
        this.snackbarService.openSnackbar(msg, this.translocoService.translate('close'), 'success-snackbar');
      } else {
        const msg = this.translocoService.translate('error_getting_directions');
        this.snackbarService.openSnackbar(msg, this.translocoService.translate('close'), 'error');
      }
    } catch (error) {
      console.error('Directions error:', error);
      const msg = this.translocoService.translate('error_getting_directions');
      this.snackbarService.openSnackbar(msg, this.translocoService.translate('close'), 'error');
    }

    this.isLoadingDirections.set(false);
  }

  private clearRouteOverlays(): void {
    this.routeLayers.forEach(layer => {
      if (this.map) {
        this.map.removeLayer(layer);
      }
    });
    this.routeLayers = [];
  }

  private async geocodeLocation(address: string): Promise<{ lat: number; lon: number } | null> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  }

  private async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.address?.city || data.address?.town || data.address?.county || null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
    return null;
  }

  private async getRoute(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number
  ): Promise<[number, number][] | null> {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates;
      }
    } catch (error) {
      console.error('Routing error:', error);
    }
    return null;
  }
}
