import { inject, Injectable } from '@angular/core';
import { ActionSheetController } from '@ionic/angular/action-sheet-controller';
import { Camera, MediaResult, MediaTypeSelection } from '@capacitor/camera';
import { TranslocoService } from '@ngneat/transloco';
import { Notifier } from '@gde/shared/data-access/core';
import { toUploadablePhoto } from '../../shared/photo';

type Source = 'camera' | 'gallery';

/** A photo for the suggest-a-place forms, as a JPEG data URL under the upload limit. */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly sheets = inject(ActionSheetController);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(Notifier);

  /** Asks camera or gallery; null when cancelled or the photo cannot be used. */
  async pick(): Promise<string | null> {
    const source = await this.#askSource();
    if (!source) return null;

    let media: MediaResult | undefined;
    try {
      const options = { quality: 85, targetWidth: 1600, correctOrientation: true };
      media =
        source === 'camera'
          ? await Camera.takePhoto({ ...options, saveToGallery: false })
          : (await Camera.chooseFromGallery({ ...options, mediaType: MediaTypeSelection.Photo, limit: 1 })).results[0];
    } catch {
      // Cancelled, or the permission was refused.
      return null;
    }

    const src = media?.webPath ?? (media?.thumbnail ? `data:image/jpeg;base64,${media.thumbnail}` : null);
    if (!src) return null;
    try {
      return await toUploadablePhoto(src);
    } catch {
      this.notifier.notify(this.#t('error_global'), 'error', this.#t('close'));
      return null;
    }
  }

  async #askSource(): Promise<Source | null> {
    const sheet = await this.sheets.create({
      header: this.#t('mobile_photo'),
      buttons: [
        { text: this.#t('mobile_take_photo'), icon: 'camera-outline', data: 'camera' },
        { text: this.#t('mobile_choose_photo'), icon: 'images-outline', data: 'gallery' },
        { text: this.#t('mobile_cancel'), role: 'cancel' },
      ],
    });
    await sheet.present();
    const { data } = await sheet.onWillDismiss<Source>();
    return data === 'camera' || data === 'gallery' ? data : null;
  }

  #t(key: string): string {
    return this.transloco.translate(key);
  }
}
