import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoModule } from '@ngneat/transloco';
import * as L from 'leaflet';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { debounceTime, ReplaySubject } from 'rxjs';
import { CatalogAdminApi } from '../../../../shared/data-access/catalog/catalog-admin.api';
import {
  AdminPetShopDetail,
  AdminPetShopPayload,
} from '../../../../shared/data-access/catalog/catalog-admin.models';
import { CatalogAdminStore } from '../../../../shared/store/catalog-admin.store';
import { SharedStore } from '../../../../shared/store/shared.store';
import { geocodeAddress, GeocodeHit } from '../../../../shared/utils/geocode';
import { isImageFile, MAX_UPLOAD_BYTES, prepareLogo } from '../../../../shared/utils/image-resize';
import { filterTownshipsMulti } from '../../../../shared/utils/township.util';

export interface PetShopFormDialogData {
  /** null = create */
  id: number | null;
}

/** Row shape of SharedStore.townships() (the legacy `opstina` table). */
interface Township {
  id: number;
  ime: string;
}

const BELGRADE: L.LatLngTuple = [44.8125, 20.4612];

/** The API rejects half a coordinate pair; mirror that before sending. */
function coordinatePairValidator(group: AbstractControl): ValidationErrors | null {
  const lat = group.get('latitude')?.value;
  const lon = group.get('longitude')?.value;
  const hasLat = lat !== null && lat !== undefined && lat !== '';
  const hasLon = lon !== null && lon !== undefined && lon !== '';
  return hasLat === hasLon ? null : { coordinatePair: true };
}

/**
 * Create / edit a pet shop. Coordinates come from an address lookup
 * (Nominatim), a click on the map, or the two inputs; the marker and the
 * inputs stay in sync both ways.
 */
@Component({
  selector: 'app-pet-shop-form-dialog',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    TranslocoModule,
  ],
  templateUrl: './pet-shop-form-dialog.component.html',
  styleUrl: '../admin-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PetShopFormDialogComponent implements OnInit, OnDestroy {
  readonly dialogRef = inject(MatDialogRef<PetShopFormDialogComponent, boolean>);
  readonly data = inject<PetShopFormDialogData>(MAT_DIALOG_DATA);
  readonly sharedStore = inject(SharedStore);
  readonly store = inject(CatalogAdminStore);
  private readonly api = inject(CatalogAdminApi);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  readonly isEdit = this.data.id !== null;
  readonly isLoading = signal(this.isEdit);
  readonly isSaving = signal(false);
  readonly isGeocoding = signal(false);
  readonly geocodeHits = signal<GeocodeHit[]>([]);
  readonly geocodeMessageKey = signal<string | null>(null);
  readonly logo = signal<string | null>(null);
  readonly logoError = signal<string | null>(null);

  readonly townshipFilterCtrl = new FormControl<string>('', { nonNullable: true });
  readonly filteredTownships = new ReplaySubject<Township[]>(1);

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(200)]],
      address: ['', [Validators.required, Validators.maxLength(300)]],
      townshipId: this.fb.control<number | null>(null, Validators.required),
      phone: '',
      websiteUrl: '',
      description: '',
      woltUrl: '',
      glovoUrl: '',
      latitude: this.fb.control<number | null>(null),
      longitude: this.fb.control<number | null>(null),
      isActive: true,
      slug: '',
    },
    { validators: coordinatePairValidator },
  );

  private map: L.Map | undefined;
  private marker: L.Marker | undefined;
  private logoChanged = false;
  private logoCleared = false;

  constructor() {
    effect(() => {
      const townships = this.sharedStore.townships() as Township[];
      if (townships.length) this.filteredTownships.next(townships.slice());
    });

    // The map container only exists once loading is done; build the map when it appears.
    effect(() => {
      const container = this.mapContainer()?.nativeElement;
      if (container && !this.map) this.#initMap(container);
    });
  }

  ngOnInit(): void {
    this.townshipFilterCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((search) => this.filteredTownships.next(filterTownshipsMulti(this.sharedStore, search)));

    // Typing coordinates by hand moves the marker.
    this.form.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.#syncMarkerFromForm());

    if (this.data.id !== null) {
      this.api
        .getPetShop(this.data.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (shop) => {
            this.#patchForm(shop);
            this.isLoading.set(false);
          },
          error: (error: unknown) => {
            this.store.notifyError(error);
            this.dialogRef.close(false);
          },
        });
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  showError(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  // ── Address lookup ──────────────────────────────────────────────────────

  async geocode(): Promise<void> {
    const address = this.form.controls.address.value.trim();
    if (!address) return;

    const townshipId = this.form.controls.townshipId.value;
    const township = (this.sharedStore.townships() as Township[]).find((t) => t.id === townshipId);
    const query = [address, township?.ime, 'Srbija'].filter(Boolean).join(', ');

    this.isGeocoding.set(true);
    this.geocodeHits.set([]);
    this.geocodeMessageKey.set(null);

    try {
      const hits = await geocodeAddress(query);
      if (hits.length === 0) {
        this.geocodeMessageKey.set('admin_geocode_none');
      } else if (hits.length === 1) {
        this.applyHit(hits[0]);
      } else {
        this.geocodeHits.set(hits);
      }
    } catch {
      this.geocodeMessageKey.set('admin_geocode_failed');
    } finally {
      this.isGeocoding.set(false);
    }
  }

  applyHit(hit: GeocodeHit): void {
    this.geocodeHits.set([]);
    this.#setCoordinates(hit.lat, hit.lon, 17);
  }

  // ── Logo ────────────────────────────────────────────────────────────────

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!isImageFile(file) || file.size > MAX_UPLOAD_BYTES) {
      this.logoError.set('admin_image_invalid');
      return;
    }

    try {
      this.logo.set(await prepareLogo(file));
      this.logoChanged = true;
      this.logoCleared = false;
      this.logoError.set(null);
    } catch {
      this.logoError.set('admin_image_invalid');
    }
  }

  removeLogo(): void {
    this.logo.set(null);
    this.logoChanged = false;
    this.logoCleared = this.isEdit;
  }

  // ── Save ────────────────────────────────────────────────────────────────

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: AdminPetShopPayload = {
      name: value.name,
      address: value.address,
      townshipId: value.townshipId as number,
      phone: value.phone || null,
      websiteUrl: value.websiteUrl || null,
      description: value.description || null,
      latitude: value.latitude,
      longitude: value.longitude,
      woltUrl: value.woltUrl || null,
      glovoUrl: value.glovoUrl || null,
      isActive: value.isActive,
      slug: this.isEdit ? value.slug || null : null,
      logoBase64: this.logoChanged ? this.logo() : undefined,
      clearLogo: this.logoCleared,
    };

    this.isSaving.set(true);
    this.store
      .saveShop(payload, this.data.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: () => this.isSaving.set(false),
      });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  #patchForm(shop: AdminPetShopDetail): void {
    this.form.patchValue({
      name: shop.name,
      address: shop.address,
      townshipId: shop.townshipId,
      phone: shop.phone ?? '',
      websiteUrl: shop.websiteUrl ?? '',
      description: shop.description ?? '',
      woltUrl: shop.woltUrl ?? '',
      glovoUrl: shop.glovoUrl ?? '',
      latitude: shop.latitude,
      longitude: shop.longitude,
      isActive: shop.isActive,
      slug: '',
    });
    this.logo.set(shop.logo);
  }

  #initMap(container: HTMLDivElement): void {
    const lat = this.form.controls.latitude.value;
    const lon = this.form.controls.longitude.value;
    const hasPoint = lat !== null && lon !== null;

    this.map = L.map(container, {
      center: hasPoint ? [lat, lon] : BELGRADE,
      zoom: hasPoint ? 16 : 12,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.#setCoordinates(event.latlng.lat, event.latlng.lng);
    });

    if (hasPoint) this.#placeMarker(lat, lon);

    // The dialog is still animating in; Leaflet measured a half-sized container.
    setTimeout(() => this.map?.invalidateSize(), 400);
  }

  #placeMarker(lat: number, lon: number): void {
    if (!this.map) return;

    if (this.marker) {
      this.marker.setLatLng([lat, lon]);
      return;
    }

    const icon = new L.Icon({
      iconUrl: 'assets/logo-small.png',
      iconSize: [48, 48],
      iconAnchor: [24, 48],
    });

    this.marker = L.marker([lat, lon], { icon, draggable: true }).addTo(this.map);
    this.marker.on('dragend', () => {
      const position = this.marker?.getLatLng();
      if (position) this.#setCoordinates(position.lat, position.lng, null);
    });
  }

  /** Writes rounded coordinates into the form and moves the marker (and optionally the view). */
  #setCoordinates(lat: number, lon: number, zoom: number | null = null): void {
    const roundedLat = Number(lat.toFixed(7));
    const roundedLon = Number(lon.toFixed(7));

    this.form.patchValue({ latitude: roundedLat, longitude: roundedLon }, { emitEvent: false });
    this.form.markAsDirty();
    this.#placeMarker(roundedLat, roundedLon);

    if (zoom !== null) this.map?.setView([roundedLat, roundedLon], zoom);
  }

  #syncMarkerFromForm(): void {
    const lat = this.form.controls.latitude.value;
    const lon = this.form.controls.longitude.value;
    if (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon)) return;

    this.#placeMarker(lat, lon);
    this.map?.panTo([lat, lon]);
  }
}
