import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

// Bundled marker images (copied to assets/leaflet by project.json), not a CDN.
const MARKER = L.icon({
  iconUrl: 'assets/leaflet/marker-icon.png',
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

/**
 * A small static map with one marker. OpenStreetMap tiles with visible
 * attribution; the app identifies itself through the user agent (capacitor.config.ts).
 */
@Component({
  selector: 'app-map-view',
  template: `<div #map class="map" role="img" [attr.aria-label]="label()"></div>`,
  styles: `
    :host {
      display: block;
    }
    .map {
      height: 220px;
      border-radius: 12px;
      overflow: hidden;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapViewComponent {
  readonly latitude = input.required<number>();
  readonly longitude = input.required<number>();
  /** Marker title; plain text, never rendered as HTML. */
  readonly label = input('');

  private readonly mapElement = viewChild.required<ElementRef<HTMLElement>>('map');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const center: L.LatLngTuple = [this.latitude(), this.longitude()];
      const map = L.map(this.mapElement().nativeElement, {
        center,
        zoom: 16,
        // A preview, not a map to explore: panning would trap one-finger
        // scrolling of the page. The directions buttons open a real map app.
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      L.marker(center, { icon: MARKER, title: this.label(), alt: this.label() }).addTo(map);

      // Ionic animates pages in, so the container gets its final size late.
      const resize = new ResizeObserver(() => map.invalidateSize());
      resize.observe(this.mapElement().nativeElement);

      destroyRef.onDestroy(() => {
        resize.disconnect();
        map.remove();
      });
    });
  }
}
