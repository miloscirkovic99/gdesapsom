import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { Spot } from '@gde/shared/data-access';
import { parseStoredList, pushRecent, searchKey } from './recent-list';

/** A place the user opened, small enough to keep in Preferences. */
export interface RecentSpot {
  id: number;
  name: string;
  /** Venue type as the API names it ('Kafić', …), translated where shown. */
  type: string;
  city: string;
  /** A small JPEG data URL (the API's photos run up to 2 MB). */
  thumb: string | null;
}

const SEARCHES_KEY = 'recentSearches';
const SPOTS_KEY = 'recentSpots';
const MAX_SEARCHES = 5;
const MAX_SPOTS = 8;
const THUMB_SIZE = 160;

const isString = (entry: unknown): entry is string => typeof entry === 'string' && !!entry.trim();
const isRecentSpot = (entry: unknown): entry is RecentSpot =>
  !!entry && typeof entry === 'object' && typeof (entry as RecentSpot).id === 'number' && typeof (entry as RecentSpot).name === 'string';

/**
 * What the user searched for and which places they opened, so Home can offer
 * to pick up where they left off. Kept on the device only.
 */
@Injectable({ providedIn: 'root' })
export class RecentActivityService {
  readonly searches = signal<string[]>([]);
  readonly spots = signal<RecentSpot[]>([]);

  constructor() {
    void this.#load();
  }

  addSearch(word: string): void {
    const trimmed = word.trim();
    if (!trimmed) return;
    this.searches.update((list) => pushRecent(list, trimmed, searchKey, MAX_SEARCHES));
    void Preferences.set({ key: SEARCHES_KEY, value: JSON.stringify(this.searches()) });
  }

  async addSpot(spot: Spot): Promise<void> {
    const thumb = spot.iuo_slika_base64 ? await makeThumbnail(spot.iuo_slika_base64, THUMB_SIZE) : null;
    const entry: RecentSpot = {
      id: spot.iuo_id,
      name: spot.iuo_ime,
      type: spot.ugo_ime,
      city: spot.grd_ime,
      thumb,
    };
    this.spots.update((list) => pushRecent(list, entry, (s) => String(s.id), MAX_SPOTS));
    void Preferences.set({ key: SPOTS_KEY, value: JSON.stringify(this.spots()) });
  }

  clearSpots(): void {
    this.spots.set([]);
    void Preferences.remove({ key: SPOTS_KEY });
  }

  async #load(): Promise<void> {
    const [searches, spots] = await Promise.all([
      Preferences.get({ key: SEARCHES_KEY }),
      Preferences.get({ key: SPOTS_KEY }),
    ]).catch(() => [{ value: null }, { value: null }]);
    this.searches.set(parseStoredList(searches.value, isString));
    this.spots.set(parseStoredList(spots.value, isRecentSpot));
  }
}

/** Centre-cropped square JPEG of an image data URL, or null if it cannot be drawn. */
function makeThumbnail(src: string, size: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx || !side) return resolve(null);
        ctx.drawImage(
          img,
          (img.naturalWidth - side) / 2,
          (img.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          size,
          size,
        );
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
