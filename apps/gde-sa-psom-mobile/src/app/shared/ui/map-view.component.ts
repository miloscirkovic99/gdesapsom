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

// The brand pin, drawn inline (styled by `.app-map-pin` in styles.scss), so it needs no image files.
const MARKER = L.divIcon({
  className: 'app-map-pin',
  html:
    '<svg viewBox="0 0 32 42" aria-hidden="true">' +
    '<path class="pin-body" d="M16 1C7.7 1 1 7.6 1 15.8 1 26.9 16 41 16 41s15-14.1 15-25.2C31 7.6 24.3 1 16 1z"/>' +
    '<circle class="pin-dot" cx="16" cy="15.5" r="5.5"/></svg>',
  iconSize: [32, 42],
  iconAnchor: [16, 41],
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
      height: 200px;
      border-radius: var(--app-radius-lg);
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
