import { inject, Injectable } from '@angular/core';
import { AnalyticsService } from '../../core/services/analytics.service';
import type { LimitReason, PlaceCategory, PlannerMode } from './planner.models';

/**
 * The planner's GA4 events. Like every custom event they are sent only after
 * the visitor accepted analytics (AnalyticsService), and never carry the
 * dog's name or anything typed into a free-text field.
 */
@Injectable({ providedIn: 'root' })
export class PlannerAnalytics {
  readonly #analytics = inject(AnalyticsService);

  start(mode: PlannerMode): void {
    this.#analytics.event('planner_start', { planner_mode: mode });
  }

  generate(mode: PlannerMode, source: 'ai' | 'rules'): void {
    this.#analytics.event('planner_generate', { planner_mode: mode, plan_source: source });
  }

  swap(mode: PlannerMode, category: PlaceCategory): void {
    this.#analytics.event('planner_swap', { planner_mode: mode, place_category: category });
  }

  share(method: 'native' | 'copy_link'): void {
    this.#analytics.event('planner_share', { method });
  }

  venueClick(placeId: number, category: PlaceCategory): void {
    this.#analytics.event('planner_venue_click', { venue_slug: `spot-${placeId}`, place_category: category });
  }

  bookingClick(placeId: number): void {
    this.#analytics.event('planner_booking_click', { venue_slug: `spot-${placeId}` });
  }

  limitHit(reason: LimitReason): void {
    this.#analytics.event('planner_limit_hit', { reason });
  }
}
