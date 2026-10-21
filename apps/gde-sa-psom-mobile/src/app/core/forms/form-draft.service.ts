import { inject, Injectable } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { filter, firstValueFrom } from 'rxjs';

/** The forms whose input outlives the app being sent to the background. */
export type DraftFormId = 'suggest-spot' | 'suggest-park';

/** A photo slot of a form ('outside', 'inside'); photos are kept under keys of their own. */
export type DraftPhotoSlot = string;

export interface FormDraft<T> {
  values: T;
  /** The stepper's step (0 for a one-page form). */
  step: number;
  /** Date.now() of the last save. */
  savedAt: number;
}

const FORM_ROUTES: Record<DraftFormId, string> = {
  'suggest-spot': '/tabs/more/suggest-spot',
  'suggest-park': '/tabs/more/suggest-park',
};
const PHOTO_SLOTS: Record<DraftFormId, DraftPhotoSlot[]> = {
  'suggest-spot': ['outside', 'inside'],
  'suggest-park': [],
};

/** A form opened again within this long gets its draft back. */
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * At launch, a draft saved this recently means Android ended the app while the
 * user was away (copying a link, taking a photo): the form is reopened for them.
 */
export const DRAFT_RESUME_MS = 60 * 60 * 1000;

const draftKey = (form: DraftFormId) => `draft:${form}`;
const photoKey = (form: DraftFormId, slot: DraftPhotoSlot) => `draft:${form}:photo:${slot}`;

/** The stored draft, or null when it is missing, unreadable or older than `maxAge`. */
export function parseDraft<T>(raw: string | null, now: number, maxAge = DRAFT_MAX_AGE_MS): FormDraft<T> | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Partial<FormDraft<T>>;
    if (!draft || typeof draft !== 'object' || !draft.values || typeof draft.values !== 'object') return null;
    if (typeof draft.savedAt !== 'number' || now - draft.savedAt > maxAge) return null;
    const step = typeof draft.step === 'number' && draft.step >= 0 ? Math.floor(draft.step) : 0;
    return { values: draft.values as T, step, savedAt: draft.savedAt };
  } catch {
    return null;
  }
}

/**
 * Half-filled forms, kept on the phone (Capacitor Preferences) while the user
 * is away from the app. Android may end a backgrounded app at any time; the
 * draft is what brings the input back. Cleared when the form is sent or
 * discarded.
 */
@Injectable({ providedIn: 'root' })
export class FormDraftService {
  private readonly router = inject(Router);

  async load<T>(form: DraftFormId): Promise<FormDraft<T> | null> {
    const { value } = await Preferences.get({ key: draftKey(form) }).catch(() => ({ value: null }));
    return parseDraft<T>(value, Date.now());
  }

  save<T>(form: DraftFormId, values: T, step: number): void {
    const draft: FormDraft<T> = { values, step, savedAt: Date.now() };
    void Preferences.set({ key: draftKey(form), value: JSON.stringify(draft) }).catch(() => undefined);
  }

  async loadPhoto(form: DraftFormId, slot: DraftPhotoSlot): Promise<string | null> {
    const { value } = await Preferences.get({ key: photoKey(form, slot) }).catch(() => ({ value: null }));
    return value?.startsWith('data:image/') ? value : null;
  }

  /** `null` removes the slot's photo. */
  savePhoto(form: DraftFormId, slot: DraftPhotoSlot, photo: string | null): void {
    const key = photoKey(form, slot);
    void (photo ? Preferences.set({ key, value: photo }) : Preferences.remove({ key })).catch(() => undefined);
  }

  clear(form: DraftFormId): void {
    for (const key of [draftKey(form), ...PHOTO_SLOTS[form].map((slot) => photoKey(form, slot))]) {
      void Preferences.remove({ key }).catch(() => undefined);
    }
  }

  /**
   * Call once at startup. Reopens the most recent form whose draft is fresh
   * enough to mean Android ended the app while the user was away from it.
   * Only from Home, so a link the app was opened with wins.
   */
  async resume(): Promise<void> {
    // Right after the first render the URL can still be '/', whatever the app was opened at.
    if (!this.router.navigated) {
      await firstValueFrom(
        this.router.events.pipe(
          filter((e) => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
        ),
      );
    }
    const now = Date.now();
    const forms = Object.keys(FORM_ROUTES) as DraftFormId[];
    const drafts = await Promise.all(
      forms.map(async (form) => {
        const { value } = await Preferences.get({ key: draftKey(form) }).catch(() => ({ value: null }));
        return { form, draft: parseDraft(value, now, DRAFT_RESUME_MS) };
      }),
    );
    const latest = drafts
      .filter((entry) => entry.draft)
      .sort((a, b) => (b.draft?.savedAt ?? 0) - (a.draft?.savedAt ?? 0))[0];
    const url = this.router.url.split('?')[0];
    if (latest && (url === '/' || url === '/tabs/home')) {
      await this.router.navigateByUrl(FORM_ROUTES[latest.form]);
    }
  }
}
