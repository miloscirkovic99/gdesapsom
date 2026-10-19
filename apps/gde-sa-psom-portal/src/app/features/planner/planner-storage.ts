import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

const DOG_NAME_KEY = 'gsp_dog_name';
const QUOTA_KEY = 'gsp_planner_quota';
const PER_DEVICE = 3;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredQuota {
  remaining: number;
  next_at: string | null;
  /** When the API said so (ms). */
  at: number;
}

/**
 * What the planner keeps in this browser only: the dog's name (it never goes
 * to the server) and the last quota the API reported. Storage can be missing
 * or blocked; then the name lasts for the visit and the quota line falls back
 * to the full weekly allowance.
 */
@Injectable({ providedIn: 'root' })
export class PlannerStorage {
  readonly #document = inject(DOCUMENT);

  dogName(): string {
    return this.#read(DOG_NAME_KEY) ?? '';
  }

  saveDogName(name: string): void {
    const value = name.trim().slice(0, 40);
    if (value) this.#write(DOG_NAME_KEY, value);
    else this.#remove(DOG_NAME_KEY);
  }

  /** Plans left this week as last reported; a week after that report nothing is known, so the full allowance. */
  remaining(now = Date.now()): { remaining: number; nextAt: string | null } {
    try {
      const stored = JSON.parse(this.#read(QUOTA_KEY) ?? 'null') as StoredQuota | null;
      if (!stored || now - stored.at > WEEK_MS) return { remaining: PER_DEVICE, nextAt: null };
      const freed = stored.next_at !== null && Date.parse(stored.next_at) <= now;
      return freed ? { remaining: Math.max(1, stored.remaining), nextAt: null } : { remaining: stored.remaining, nextAt: stored.next_at };
    } catch {
      return { remaining: PER_DEVICE, nextAt: null };
    }
  }

  saveQuota(remaining: number, nextAt: string | null, now = Date.now()): void {
    this.#write(QUOTA_KEY, JSON.stringify({ remaining, next_at: nextAt, at: now } satisfies StoredQuota));
  }

  #storage(): Storage | null {
    try {
      return this.#document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  #read(key: string): string | null {
    try {
      return this.#storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  #write(key: string, value: string): void {
    try {
      this.#storage()?.setItem(key, value);
    } catch {
      // Private mode or full storage: keep working without it.
    }
  }

  #remove(key: string): void {
    try {
      this.#storage()?.removeItem(key);
    } catch {
      // As above.
    }
  }
}
