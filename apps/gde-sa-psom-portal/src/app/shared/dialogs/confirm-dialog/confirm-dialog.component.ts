import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslocoModule } from '@ngneat/transloco';

export interface ConfirmDialogData {
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, unknown>;
  confirmKey?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
}

/**
 * Yes / no confirmation. Resolves `true` from `afterClosed()` when confirmed.
 *
 * Usage:
 *   this.dialog.open(ConfirmDialogComponent, { data: { titleKey, messageKey, danger: true } })
 *     .afterClosed().subscribe((ok) => { if (ok) ... });
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [TranslocoModule],
  template: `
    <div class="p-6 sm:p-8 max-w-md">
      <h2 class="font-display text-xl font-bold mb-3">{{ data.titleKey | transloco }}</h2>
      <p class="text-base-content/80 mb-6">{{ data.messageKey | transloco: data.messageParams }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-ghost btn-sm" (click)="dialogRef.close(false)">
          {{ 'admin_cancel' | transloco }}
        </button>
        <button
          type="button"
          class="btn btn-sm"
          [class.btn-error]="data.danger"
          [class.btn-secondary]="!data.danger"
          (click)="dialogRef.close(true)"
        >
          {{ (data.confirmKey ?? 'admin_confirm') | transloco }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
