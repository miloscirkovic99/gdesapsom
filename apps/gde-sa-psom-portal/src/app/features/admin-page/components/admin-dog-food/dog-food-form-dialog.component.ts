import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslocoModule } from '@ngneat/transloco';
import { CatalogAdminApi } from '../../../../shared/data-access/catalog/catalog-admin.api';
import {
  AdminDogFoodDetail,
  AdminDogFoodPayload,
} from '../../../../shared/data-access/catalog/catalog-admin.models';
import { LocalNamePipe } from '../../../../shared/pipes/local-name.pipe';
import { CatalogAdminStore } from '../../../../shared/store/catalog-admin.store';
import { DogFoodStore } from '../../../../shared/store/dog-food.store';
import { injectActiveLang } from '../../../../shared/utils/active-lang';
import {
  isImageFile,
  MAX_UPLOAD_BYTES,
  PreparedImage,
  prepareProductImage,
} from '../../../../shared/utils/image-resize';

export interface DogFoodFormDialogData {
  /** null = create */
  id: number | null;
}

/**
 * Create / edit a dog food product. Lookups come from `DogFoodStore`
 * (types, life stages, breed sizes) and brands from `CatalogAdminStore`,
 * which also lets the admin add a brand inline. The first image is only
 * uploaded on create; afterwards the gallery dialog owns the images.
 */
@Component({
  selector: 'app-dog-food-form-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, TranslocoModule, LocalNamePipe],
  templateUrl: './dog-food-form-dialog.component.html',
  styleUrl: '../admin-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DogFoodFormDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<DogFoodFormDialogComponent, boolean>);
  readonly data = inject<DogFoodFormDialogData>(MAT_DIALOG_DATA);
  readonly store = inject(CatalogAdminStore);
  readonly dogFoodStore = inject(DogFoodStore);
  readonly lang = injectActiveLang();
  private readonly api = inject(CatalogAdminApi);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEdit = this.data.id !== null;
  readonly isLoading = signal(this.isEdit);
  readonly isSaving = signal(false);

  readonly showBrandForm = signal(false);
  readonly isCreatingBrand = signal(false);

  readonly image = signal<PreparedImage | null>(null);
  readonly isPreparingImage = signal(false);
  readonly imageError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    brandId: this.fb.control<number | null>(null, Validators.required),
    foodTypeId: this.fb.control<number | null>(null, Validators.required),
    lifeStageId: this.fb.control<number | null>(null, Validators.required),
    breedSizeId: this.fb.control<number | null>(null, Validators.required),
    packageWeightG: this.fb.control<number | null>(null, Validators.min(1)),
    isGrainFree: false,
    description: '',
    ingredients: '',
    isActive: true,
    slug: '',
  });

  readonly brandForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    websiteUrl: '',
  });

  ngOnInit(): void {
    this.dogFoodStore.loadLookups();
    if (this.store.brands().length === 0) this.store.loadBrands();

    if (this.data.id !== null) {
      this.api
        .getDogFood(this.data.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (product) => {
            this.#patchForm(product);
            this.isLoading.set(false);
          },
          error: (error: unknown) => {
            this.store.notifyError(error);
            this.dialogRef.close(false);
          },
        });
    }
  }

  showError(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  // ── Inline brand ────────────────────────────────────────────────────────

  toggleBrandForm(): void {
    this.showBrandForm.update((open) => !open);
  }

  createBrand(): void {
    if (this.brandForm.invalid) {
      this.brandForm.markAllAsTouched();
      return;
    }
    const value = this.brandForm.getRawValue();
    this.isCreatingBrand.set(true);
    this.store
      .createBrand({ name: value.name, websiteUrl: value.websiteUrl || null, logoUrl: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (brand) => {
          this.form.controls.brandId.setValue(brand.id);
          this.form.controls.brandId.markAsDirty();
          this.brandForm.reset();
          this.showBrandForm.set(false);
          this.isCreatingBrand.set(false);
        },
        error: () => this.isCreatingBrand.set(false),
      });
  }

  // ── Image (create only) ─────────────────────────────────────────────────

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!isImageFile(file) || file.size > MAX_UPLOAD_BYTES) {
      this.imageError.set('admin_image_invalid');
      return;
    }

    this.isPreparingImage.set(true);
    try {
      this.image.set(await prepareProductImage(file));
      this.imageError.set(null);
    } catch {
      this.imageError.set('admin_image_invalid');
    } finally {
      this.isPreparingImage.set(false);
    }
  }

  removeImage(): void {
    this.image.set(null);
  }

  // ── Save ────────────────────────────────────────────────────────────────

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const image = this.image();
    const payload: AdminDogFoodPayload = {
      name: value.name,
      brandId: value.brandId as number,
      foodTypeId: value.foodTypeId as number,
      lifeStageId: value.lifeStageId as number,
      breedSizeId: value.breedSizeId as number,
      description: value.description || null,
      ingredients: value.ingredients || null,
      packageWeightG: value.packageWeightG,
      isGrainFree: value.isGrainFree,
      isActive: value.isActive,
      slug: this.isEdit ? value.slug || null : null,
      imageBase64: !this.isEdit && image ? image.image : undefined,
      thumbnailBase64: !this.isEdit && image ? image.thumbnail : undefined,
    };

    this.isSaving.set(true);
    this.store
      .saveProduct(payload, this.data.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: () => this.isSaving.set(false),
      });
  }

  #patchForm(product: AdminDogFoodDetail): void {
    this.form.patchValue({
      name: product.name,
      brandId: product.brandId,
      foodTypeId: product.foodTypeId,
      lifeStageId: product.lifeStageId,
      breedSizeId: product.breedSizeId,
      packageWeightG: product.packageWeightG,
      isGrainFree: product.isGrainFree,
      description: product.description ?? '',
      ingredients: product.ingredients ?? '',
      isActive: product.isActive,
      slug: '',
    });
  }
}
