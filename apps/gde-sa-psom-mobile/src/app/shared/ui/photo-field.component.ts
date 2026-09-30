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
      margin: 28px 0 0;
    }
    .label {
      margin: 0 0 8px;
      color: var(--app-text);
      font-size: 0.9375rem;
      font-weight: 500;
    }
    .preview img {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
      max-height: 240px;
      border-radius: var(--app-radius-md);
      object-fit: cover;
      background: var(--app-surface-sunken);
    }
    .actions {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
    }
    .actions ion-button {
      margin: 0;
    }
    /* An empty photo slot: a dashed drop zone. */
    .add {
      --background: var(--app-surface-sunken);
      --border-style: dashed;
      --border-width: 1.5px;
      height: 88px;
      margin: 0;
    }
    .add ion-icon[slot='start'] {
      color: var(--app-primary);
    }
    ion-note {
      display: block;
      margin: 6px 0 0 16px;
      font-size: 0.8125rem;
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
