import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonNote } from '@ionic/angular/ion-note';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { cameraOutline, imagesOutline, trashOutline } from 'ionicons/icons';
import { CameraService } from '../../core/platform/camera.service';

/** One photo slot of a form: preview, add/replace, remove. Two-way `[(photo)]` (data URL). */
@Component({
  selector: 'app-photo-field',
  imports: [IonButton, IonIcon, IonNote, IonSpinner, TranslocoPipe],
  template: `
    <p class="label">
      {{ label() | transloco }}
      @if (required()) {
        <span aria-hidden="true">*</span>
      }
    </p>
    @if (photo(); as src) {
      <div class="preview">
        <img [src]="src" alt="" />
        <div class="actions">
          <ion-button size="small" fill="outline" (click)="choose()">
            <ion-icon slot="start" name="camera-outline" aria-hidden="true" />
            {{ 'mobile_replace_photo' | transloco }}
          </ion-button>
          <ion-button size="small" fill="clear" color="danger" (click)="photo.set(null)">
            <ion-icon slot="start" name="trash-outline" aria-hidden="true" />
            {{ 'mobile_remove' | transloco }}
          </ion-button>
        </div>
      </div>
    } @else {
      <ion-button expand="block" fill="outline" class="add" [disabled]="busy()" (click)="choose()">
        @if (busy()) {
          <ion-spinner name="dots" />
        } @else {
          <ion-icon slot="start" name="camera-outline" aria-hidden="true" />
          {{ 'mobile_add_photo' | transloco }}
        }
      </ion-button>
      @if (showError()) {
        <ion-note color="danger">{{ 'required' | transloco }}</ion-note>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      margin: 16px 0;
    }
    .label {
      margin: 0 0 6px;
      font-size: 0.85rem;
      color: var(--ion-color-medium);
    }
    .preview img {
      display: block;
      width: 100%;
      max-height: 220px;
      object-fit: cover;
      border-radius: 12px;
    }
    .actions {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
    }
    .add {
      --border-style: dashed;
      height: 64px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoFieldComponent {
  private readonly camera = inject(CameraService);

  readonly label = input.required<string>();
  readonly required = input(false);
  /** Show the "required" message (after a submit attempt). */
  readonly showError = input(false);
  readonly photo = model<string | null>(null);
  readonly busy = signal(false);

  constructor() {
    addIcons({ cameraOutline, imagesOutline, trashOutline });
  }

  async choose(): Promise<void> {
    this.busy.set(true);
    const picked = await this.camera.pick();
    this.busy.set(false);
    if (picked) this.photo.set(picked);
  }
}
