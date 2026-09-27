import { afterNextRender, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonApp } from '@ionic/angular/ion-app';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';
import { AnalyticsService } from './core/analytics/analytics.service';
import { ConsentPromptService } from './core/analytics/consent-prompt.service';
import { NativeShellService } from './core/platform/native-shell.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor() {
    const shell = inject(NativeShellService);
    const consentPrompt = inject(ConsentPromptService);
    // Subscribes to the router now, so the first screen is reported too.
    inject(AnalyticsService).start();
    afterNextRender(() => {
      shell.start();
      void consentPrompt.askIfNeeded();
    });
  }
}
