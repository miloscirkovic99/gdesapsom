import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@ngneat/transloco';
import { RouteConstants } from '@gde/shared/util';

/**
 * Privacy policy of the website and the Android app. Its URL is the one given
 * to Google Play, and the app links here from More > Privacy policy, so keep
 * the text in line with the Data safety answers in apps/gde-sa-psom-mobile/README.md.
 */
@Component({
  selector: 'app-privacy-policy-page',
  imports: [RouterLink, TranslocoPipe],
  template: `
    <article class="max-w-3xl mx-auto px-4 py-12 md:py-16">
      <header class="mb-10">
        <h1 class="font-display text-4xl md:text-5xl font-bold">{{ 'privacy_title' | transloco }}</h1>
        <p class="mt-3 text-sm text-base-content/60">{{ 'privacy_updated' | transloco }}</p>
        <p class="mt-6 text-lg">{{ 'privacy_intro' | transloco }}</p>
      </header>

      <section class="mb-10">
        <h2 class="text-2xl font-semibold mb-3">{{ 'privacy_who_title' | transloco }}</h2>
        <p class="text-lg">{{ 'privacy_who_text' | transloco }}</p>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-semibold mb-3">{{ 'privacy_collect_title' | transloco }}</h2>
        <ul class="list-disc pl-6 space-y-4 text-lg">
          @for (item of collected; track item) {
            <li>
              <strong>{{ 'privacy_' + item + '_label' | transloco }}</strong>
              {{ 'privacy_' + item + '_text' | transloco }}
              @if (item === 'web_analytics') {
                <!-- The text ends mid-sentence ("..., as described in the"): the link completes it. -->
                <a [routerLink]="['/', routes.cookiesPolicy]" class="link link-secondary">{{
                  'cookie_header' | transloco
                }}</a>.
              }
            </li>
          }
        </ul>
      </section>

      @for (section of sections; track section) {
        <section class="mb-10">
          <h2 class="text-2xl font-semibold mb-3">{{ 'privacy_' + section + '_title' | transloco }}</h2>
          <p class="text-lg">{{ 'privacy_' + section + '_text' | transloco }}</p>
        </section>
      }
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyPageComponent {
  readonly routes = RouteConstants;
  /** `privacy_<item>_label` / `privacy_<item>_text` pairs, in page order. */
  readonly collected = ['suggest', 'contact', 'location', 'web_analytics', 'app_analytics', 'device'] as const;
  /** `privacy_<section>_title` / `privacy_<section>_text` pairs after the list. */
  readonly sections = ['share', 'retention', 'rights', 'changes'] as const;
}
