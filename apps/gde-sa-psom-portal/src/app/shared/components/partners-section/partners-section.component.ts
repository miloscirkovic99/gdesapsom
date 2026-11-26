import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoModule } from '@ngneat/transloco';
import { injectActiveLang } from '@gde/shared/util';

type FeatureIcon = 'verified' | 'photos' | 'reviews';
type UpdateIcon = 'video' | 'photo' | 'done';

interface PawkoUpdate {
  icon: UpdateIcon;
  title: string;
  text: string;
  /** Left out on phones, where the card would get too long (as in the design). */
  wideOnly?: boolean;
}

/** Pawko's homepage holds the early-access sign-up; it has an English version at /en. */
const PAWKO_URL = 'https://pawko.me/';
const PAWKO_URL_EN = 'https://pawko.me/en';

/**
 * The partners block: on the homepage (between the featured places and
 * "Znaš mesto koje nije na listi?") and as the whole /partneri page, the URL
 * that goes to partners. Static content, so it prerenders and hydrates as is.
 *
 * Links to a partner carry `data-link-type="partner"`, so AnalyticsService
 * reports each click as an `outbound_click` that can be counted per partner.
 */
@Component({
  selector: 'app-partners-section',
  imports: [NgTemplateOutlet, TranslocoModule],
  templateUrl: './partners-section.component.html',
  styleUrl: './partners-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnersSectionComponent {
  /** On /partneri the section is the page: its "Partneri" label becomes the h1. */
  readonly asPage = input(false, { transform: booleanAttribute });

  readonly #lang = injectActiveLang();
  readonly pawkoUrl = computed(() => (this.#lang().startsWith('en') ? PAWKO_URL_EN : PAWKO_URL));

  readonly features: readonly { icon: FeatureIcon; text: string }[] = [
    { icon: 'verified', text: 'partners_pawko_feature_verified' },
    { icon: 'photos', text: 'partners_pawko_feature_photos' },
    { icon: 'reviews', text: 'partners_pawko_feature_reviews' },
  ];

  readonly services: readonly string[] = [
    'partners_pawko_service_walk',
    'partners_pawko_service_home',
    'partners_pawko_service_sitter',
    'partners_pawko_service_visits',
    'partners_pawko_service_play',
    'partners_pawko_service_vet',
    'partners_pawko_service_grooming',
    'partners_pawko_service_taxi',
  ];

  readonly updates: readonly PawkoUpdate[] = [
    {
      icon: 'video',
      title: 'partners_pawko_update_video_title',
      text: 'partners_pawko_update_video_text',
      wideOnly: true,
    },
    { icon: 'photo', title: 'partners_pawko_update_photo_title', text: 'partners_pawko_update_photo_text' },
    { icon: 'done', title: 'partners_pawko_update_done_title', text: 'partners_pawko_update_done_text' },
  ];
}
