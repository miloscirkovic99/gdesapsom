import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslocoModule } from '@ngneat/transloco';
import { CatalogAdminApi } from '../../../../shared/data-access/catalog/catalog-admin.api';
import { AdminOfferRow, OfferMode } from '../../../../shared/data-access/catalog/catalog-admin.models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { RsdPricePipe } from '../../../../shared/pipes/rsd-price.pipe';
import { CatalogAdminStore } from '../../../../shared/store/catalog-admin.store';
import { injectActiveLang } from '../../../../shared/utils/active-lang';

export interface CatalogOffersDialogData {
  /** 'food' edits the offers of one product; 'shop' edits the assortment of one shop. */
  mode: OfferMode;
  id: number;
  name: string;
}

/** One editable row: the stored offer plus the values currently in the inputs. */
interface OfferRowState {
  row: AdminOfferRow;
  price: number | null;
  isInStock: boolean;
  woltUrl: string;
  glovoUrl: string;
  dirty: boolean;
  saving: boolean;
}

interface PartnerOption {
  id: number;
  label: string;
}

const toState = (row: AdminOfferRow): OfferRowState => ({
  row,
  price: row.price,
  isInStock: row.isInStock,
  woltUrl: row.woltUrl ?? '',
  glovoUrl: row.glovoUrl ?? '',
  dirty: false,
  saving: false,
});

/**
 * Prices, stock and delivery links for the product x shop relation, editable
 * from either side. Closes with `true` when anything changed so the caller
 * can refresh its counters.
 */
@Component({
  selector: 'app-catalog-offers-dialog',
  imports: [FormsModule, MatDialogModule, TranslocoModule, RsdPricePipe],
  templateUrl: './catalog-offers-dialog.component.html',
  styleUrl: '../admin-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogOffersDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<CatalogOffersDialogComponent, boolean>);
  readonly data = inject<CatalogOffersDialogData>(MAT_DIALOG_DATA);
  readonly store = inject(CatalogAdminStore);
  readonly lang = injectActiveLang();
  private readonly api = inject(CatalogAdminApi);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = signal<OfferRowState[]>([]);
  readonly isLoading = signal(true);
  readonly isAdding = signal(false);

  // "Add offer" form
  readonly newPartnerId = signal<number | null>(null);
  readonly newPrice = signal<number | null>(null);
  readonly newInStock = signal(true);

  /** Shops (food mode) or products (shop mode) that do not have an offer yet. */
  readonly partners = computed<PartnerOption[]>(() => {
    const used = new Set(this.rows().map((state) => state.row.partnerId));
    if (this.data.mode === 'food') {
      return this.store
        .activeShops()
        .filter((shop) => !used.has(shop.id))
        .map((shop) => ({ id: shop.id, label: [shop.name, shop.townshipName].filter(Boolean).join(' · ') }));
    }
    return this.store
      .activeProducts()
      .filter((product) => !used.has(product.id))
      .map((product) => ({
        id: product.id,
        label: [product.brandName, product.name, product.packageWeightG ? `${product.packageWeightG} g` : '']
          .filter(Boolean)
          .join(' '),
      }));
  });

  readonly titleKey = this.data.mode === 'food' ? 'admin_offers_title' : 'admin_assortment_title';
  readonly partnerPlaceholderKey = this.data.mode === 'food' ? 'admin_select_shop' : 'admin_select_product';

  private changed = false;

  ngOnInit(): void {
    if (this.data.mode === 'food' && this.store.shops().length === 0) this.store.loadShops();
    if (this.data.mode === 'shop' && this.store.products().length === 0) this.store.loadProducts();
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.api
      .listOffers(this.data.mode, this.data.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (offers) => {
          this.rows.set(offers.map(toState));
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          this.isLoading.set(false);
          this.store.notifyError(error);
        },
      });
  }

  close(): void {
    this.dialogRef.close(this.changed);
  }

  // ── Add ─────────────────────────────────────────────────────────────────

  add(): void {
    const partnerId = this.newPartnerId();
    if (partnerId === null) return;

    this.isAdding.set(true);
    this.api
      .upsertOffer({
        dogFoodId: this.data.mode === 'food' ? this.data.id : partnerId,
        petShopId: this.data.mode === 'shop' ? this.data.id : partnerId,
        price: this.newPrice(),
        isInStock: this.newInStock(),
        woltUrl: null,
        glovoUrl: null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.changed = true;
          this.isAdding.set(false);
          this.newPartnerId.set(null);
          this.newPrice.set(null);
          this.newInStock.set(true);
          this.store.notifySuccess('admin_offer_saved');
          this.load();
        },
        error: (error: unknown) => {
          this.isAdding.set(false);
          this.store.notifyError(error);
        },
      });
  }

  // ── Edit rows ───────────────────────────────────────────────────────────

  update(state: OfferRowState, patch: Partial<Pick<OfferRowState, 'price' | 'isInStock' | 'woltUrl' | 'glovoUrl'>>): void {
    this.rows.update((list) =>
      list.map((item) => (item.row.id === state.row.id ? { ...item, ...patch, dirty: true } : item)),
    );
  }

  saveRow(state: OfferRowState): void {
    this.#setSaving(state.row.id, true);
    this.api
      .patchOffer({
        id: state.row.id,
        price: state.price,
        isInStock: state.isInStock,
        woltUrl: state.woltUrl || null,
        glovoUrl: state.glovoUrl || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.changed = true;
          this.store.notifySuccess('admin_offer_saved');
          this.load();
        },
        error: (error: unknown) => {
          this.#setSaving(state.row.id, false);
          this.store.notifyError(error);
        },
      });
  }

  removeRow(state: OfferRowState): void {
    const data: ConfirmDialogData = {
      titleKey: 'admin_remove',
      messageKey: 'admin_confirm_delete_offer',
      confirmKey: 'admin_remove',
      danger: true,
    };
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data,
        autoFocus: false,
        panelClass: 'admin-dialog',
        backdropClass: 'dialogBackdropBackground',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ok) => {
        if (!ok) return;
        this.#setSaving(state.row.id, true);
        this.api
          .deleteOffer(state.row.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.changed = true;
              this.store.notifySuccess('admin_offer_deleted');
              this.load();
            },
            error: (error: unknown) => {
              this.#setSaving(state.row.id, false);
              this.store.notifyError(error);
            },
          });
      });
  }

  #setSaving(id: number, saving: boolean): void {
    this.rows.update((list) => list.map((item) => (item.row.id === id ? { ...item, saving } : item)));
  }
}
