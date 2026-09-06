import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { TranslocoModule } from '@ngneat/transloco';
import { map, Observable } from 'rxjs';
import { DeliveryLinksComponent } from '../../../../shared/components/delivery-links/delivery-links.component';
import { normalizeSearchText } from '../../../../shared/data-access/catalog/dog-food.api';
import { AdminPetShop } from '../../../../shared/data-access/catalog/catalog-admin.models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { CatalogAdminStore } from '../../../../shared/store/catalog-admin.store';
import { CatalogOffersDialogComponent, CatalogOffersDialogData } from '../catalog-offers/catalog-offers-dialog.component';
import { PetShopFormDialogComponent, PetShopFormDialogData } from './pet-shop-form-dialog.component';

/** Admin list of pet shops: search, add, edit, assortment, activate / deactivate, delete. */
@Component({
  selector: 'app-admin-pet-shops',
  imports: [FormsModule, TranslocoModule, DeliveryLinksComponent],
  templateUrl: './admin-pet-shops.component.html',
  styleUrl: './admin-pet-shops.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPetShopsComponent implements OnInit {
  readonly store = inject(CatalogAdminStore);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = signal('');
  readonly showInactive = signal(false);

  readonly inactiveCount = computed(() => this.store.shops().filter((shop) => !shop.isActive).length);

  readonly filtered = computed(() => {
    const term = normalizeSearchText(this.search());
    const includeInactive = this.showInactive();
    return this.store.shops().filter((shop) => {
      if (!includeInactive && !shop.isActive) return false;
      if (!term) return true;
      const haystack = normalizeSearchText(
        `${shop.name} ${shop.address} ${shop.townshipName ?? ''} ${shop.cityName ?? ''}`,
      );
      return haystack.includes(term);
    });
  });

  ngOnInit(): void {
    this.store.loadShops();
  }

  add(): void {
    this.#openForm(null);
  }

  edit(shop: AdminPetShop): void {
    this.#openForm(shop.id);
  }

  assortment(shop: AdminPetShop): void {
    this.dialog
      .open<CatalogOffersDialogComponent, CatalogOffersDialogData, boolean>(
        CatalogOffersDialogComponent,
        this.#config<CatalogOffersDialogData>({ mode: 'shop', id: shop.id, name: shop.name }),
      )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((changed) => {
        if (changed) this.store.loadShops();
      });
  }

  toggleActive(shop: AdminPetShop): void {
    if (!shop.isActive) {
      this.store.setShopActive(shop.id, true);
      return;
    }
    this.#confirm({
      titleKey: 'admin_confirm_deactivate_title',
      messageKey: 'admin_confirm_deactivate_shop',
      messageParams: { name: shop.name },
      confirmKey: 'admin_deactivate',
    }).subscribe((ok) => {
      if (ok) this.store.setShopActive(shop.id, false);
    });
  }

  remove(shop: AdminPetShop): void {
    this.#confirm({
      titleKey: 'admin_confirm_delete_title',
      messageKey: 'admin_confirm_delete_shop',
      messageParams: { name: shop.name },
      confirmKey: 'admin_delete',
      danger: true,
    }).subscribe((ok) => {
      if (ok) this.store.deleteShop(shop.id, true);
    });
  }

  // The form dialog saves through the store, which reloads the list itself.
  #openForm(id: number | null): void {
    this.dialog.open<PetShopFormDialogComponent, PetShopFormDialogData, boolean>(
      PetShopFormDialogComponent,
      this.#config<PetShopFormDialogData>({ id }),
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
