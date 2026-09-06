import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslocoModule } from '@ngneat/transloco';
import { firstValueFrom } from 'rxjs';
import { CatalogAdminApi } from '../../../../shared/data-access/catalog/catalog-admin.api';
import { AdminImage } from '../../../../shared/data-access/catalog/catalog-admin.models';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/dialogs/confirm-dialog/confirm-dialog.component';
import { CatalogAdminStore } from '../../../../shared/store/catalog-admin.store';
import { isImageFile, MAX_UPLOAD_BYTES, prepareProductImage } from '../../../../shared/utils/image-resize';

export interface DogFoodImagesDialogData {
  id: number;
  name: string;
}

interface UploadProgress {
  done: number;
  total: number;
}

/**
 * Gallery of one product: upload (resized in the browser), primary image,
 * order, delete. The list is shown primary-first, and reordering makes the
 * first image primary, so "move up to the top" and "set as primary" agree.
 * Closes with `true` when anything changed.
 */
@Component({
  selector: 'app-dog-food-images-dialog',
  imports: [MatDialogModule, TranslocoModule],
  templateUrl: './dog-food-images-dialog.component.html',
  styleUrl: '../admin-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogFoodImagesDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<DogFoodImagesDialogComponent, boolean>);
  readonly data = inject<DogFoodImagesDialogData>(MAT_DIALOG_DATA);
  readonly store = inject(CatalogAdminStore);
  private readonly api = inject(CatalogAdminApi);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly images = signal<AdminImage[]>([]);
  readonly isLoading = signal(true);
  readonly isBusy = signal(false);
  readonly progress = signal<UploadProgress | null>(null);
  readonly uploadError = signal<string | null>(null);

  private changed = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.api
      .listImages(this.data.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (images) => {
          this.images.set(images);
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

  // ── Upload ──────────────────────────────────────────────────────────────

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    const valid = files.filter((file) => isImageFile(file) && file.size <= MAX_UPLOAD_BYTES);
    this.uploadError.set(valid.length === files.length ? null : 'admin_image_invalid');
    if (valid.length === 0) return;

    this.isBusy.set(true);
    this.progress.set({ done: 0, total: valid.length });

    // One at a time: each upload carries a full base64 image, and the handler
    // promotes the first image of an empty gallery, so order matters.
    let uploaded = 0;
    for (const file of valid) {
      try {
        const prepared = await prepareProductImage(file);
        await firstValueFrom(
          this.api.addImage({
            dogFoodId: this.data.id,
            imageBase64: prepared.image,
            thumbnailBase64: prepared.thumbnail,
            altText: this.data.name,
          }),
        );
        uploaded += 1;
        this.progress.set({ done: uploaded, total: valid.length });
      } catch (error) {
        this.store.notifyError(error);
        break;
      }
    }

    this.progress.set(null);
    this.isBusy.set(false);
    if (uploaded > 0) {
      this.changed = true;
      this.store.notifySuccess('admin_image_saved');
      this.load();
    }
  }

  // ── Primary / order / delete ────────────────────────────────────────────

  setPrimary(image: AdminImage): void {
    this.#run(this.api.setPrimaryImage(image.id), 'admin_done');
  }

  move(index: number, delta: -1 | 1): void {
    const ids = this.images().map((image) => image.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.#run(this.api.reorderImages(this.data.id, ids), 'admin_done');
  }

  remove(image: AdminImage): void {
    const data: ConfirmDialogData = {
      titleKey: 'admin_delete',
      messageKey: 'admin_confirm_delete_image',
      confirmKey: 'admin_delete',
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
        if (ok) this.#run(this.api.deleteImage(image.id), 'admin_image_deleted');
      });
  }

  #run(request: ReturnType<CatalogAdminApi['setPrimaryImage']>, successKey: string): void {
    this.isBusy.set(true);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.changed = true;
        this.isBusy.set(false);
        this.store.notifySuccess(successKey);
        this.load();
      },
      error: (error: unknown) => {
        this.isBusy.set(false);
        this.store.notifyError(error);
      },
    });
  }
}
