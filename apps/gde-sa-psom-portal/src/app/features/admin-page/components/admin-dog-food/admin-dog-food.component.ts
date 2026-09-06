import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { TranslocoModule } from '@ngneat/transloco';
import { map, Observable } from 'rxjs';
import { normalizeSearchText } from '../../../../shared/data-access/catalog/dog-food.api';
import { AdminDogFood } from '../../../../shared/data-access/catalog/catalog-admin.models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { LocalNamePipe } from '../../../../shared/pipes/local-name.pipe';
import { PackageWeightPipe } from '../../../../shared/pipes/package-weight.pipe';
import { RsdPricePipe } from '../../../../shared/pipes/rsd-price.pipe';
import { CatalogAdminStore } from '../../../../shared/store/catalog-admin.store';
import { injectActiveLang } from '../../../../shared/utils/active-lang';
import { CatalogOffersDialogComponent, CatalogOffersDialogData } from '../catalog-offers/catalog-offers-dialog.component';
import { DogFoodFormDialogComponent, DogFoodFormDialogData } from './dog-food-form-dialog.component';
import { DogFoodImagesDialogComponent, DogFoodImagesDialogData } from './dog-food-images-dialog.component';

interface BrandOption {
  id: number;
  name: string;
}

/** Admin list of dog food: search, brand filter, add, edit, images, offers, activate / deactivate, delete. */
@Component({
  selector: 'app-admin-dog-food',
  imports: [FormsModule, TranslocoModule, LocalNamePipe, PackageWeightPipe, RsdPricePipe],
  templateUrl: './admin-dog-food.component.html',
  styleUrl: './admin-dog-food.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDogFoodComponent implements OnInit {
  readonly store = inject(CatalogAdminStore);
  readonly lang = injectActiveLang();
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = signal('');
  readonly brandFilter = signal<number | null>(null);
  readonly showInactive = signal(false);

  readonly inactiveCount = computed(() => this.store.products().filter((product) => !product.isActive).length);

  /** Brands present in the list, for the filter dropdown. */
  readonly brandOptions = computed<BrandOption[]>(() => {
    const byId = new Map<number, string>();
    for (const product of this.store.products()) byId.set(product.brandId, product.brandName);
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'sr'));
  });

  readonly filtered = computed(() => {
    const term = normalizeSearchText(this.search());
    const brandId = this.brandFilter();
    const includeInactive = this.showInactive();
    return this.store.products().filter((product) => {
      if (!includeInactive && !product.isActive) return false;
      if (brandId !== null && product.brandId !== brandId) return false;
      if (!term) return true;
      return normalizeSearchText(`${product.brandName} ${product.name}`).includes(term);
    });
  });

  ngOnInit(): void {
    this.store.loadProducts();
  }

  add(): void {
    this.#openForm(null);
  }

  edit(product: AdminDogFood): void {
    this.#openForm(product.id);
  }

  images(product: AdminDogFood): void {
    this.dialog
      .open<DogFoodImagesDialogComponent, DogFoodImagesDialogData, boolean>(
        DogFoodImagesDialogComponent,
        this.#config<DogFoodImagesDialogData>({ id: product.id, name: `${product.brandName} ${product.name}` }),
      )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (changed) this.store.loadProducts();
      });
  }

  offers(product: AdminDogFood): void {
    this.dialog
      .open<CatalogOffersDialogComponent, CatalogOffersDialogData, boolean>(
        CatalogOffersDialogComponent,
        this.#config<CatalogOffersDialogData>({
          mode: 'food',
          id: product.id,
          name: `${product.brandName} ${product.name}`,
        }),
      )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (changed) this.store.loadProducts();
      });
  }

  toggleActive(product: AdminDogFood): void {
    if (!product.isActive) {
      this.store.setProductActive(product.id, true);
      return;
    }
    this.#confirm({
      titleKey: 'admin_confirm_deactivate_title',
      messageKey: 'admin_confirm_deactivate_product',
      messageParams: { name: `${product.brandName} ${product.name}` },
      confirmKey: 'admin_deactivate',
    }).subscribe((ok) => {
      if (ok) this.store.setProductActive(product.id, false);
    });
  }

  remove(product: AdminDogFood): void {
    this.#confirm({
      titleKey: 'admin_confirm_delete_title',
      messageKey: 'admin_confirm_delete_product',
      messageParams: { name: `${product.brandName} ${product.name}` },
      confirmKey: 'admin_delete',
      danger: true,
    }).subscribe((ok) => {
      if (ok) this.store.deleteProduct(product.id, true);
    });
  }

  // The form dialog saves through the store, which reloads the list itself.
  #openForm(id: number | null): void {
    this.dialog.open<DogFoodFormDialogComponent, DogFoodFormDialogData, boolean>(
      DogFoodFormDialogComponent,
      this.#config<DogFoodFormDialogData>({ id }),
    );
  }

  #confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        autoFocus: false,
        panelClass: 'admin-dialog',
        backdropClass: 'dialogBackdropBackground',
      })
      .afterClosed()
      .pipe(
        map((result) => result === true),
        takeUntilDestroyed(this.destroyRef),
      );
  }

  #config<T>(data: T): MatDialogConfig<T> {
    return {
      data,
      autoFocus: false,
      disableClose: true,
      width: '95vw',
      maxWidth: '58rem',
      panelClass: 'admin-dialog',
      backdropClass: 'dialogBackdropBackground',
    };
  }
}
