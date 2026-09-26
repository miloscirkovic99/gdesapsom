import { inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { Platform } from '@ionic/angular/platform';
import { ROOT_TAB_PATHS, webUrlToAppRoute } from './deep-links';

/**
 * Android shell behaviour: splash screen, hardware back button, links to
 * gdesapsom.com opened in the app. Does nothing in a browser.
 */
@Injectable({ providedIn: 'root' })
export class NativeShellService {
  private readonly platform = inject(Platform);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  /** Call once from AppComponent after the first render. */
  start(): void {
    if (!Capacitor.isNativePlatform()) return;

    // launchAutoHide is off (capacitor.config.ts): translations are loaded by now.
    void SplashScreen.hide();

    // Overlays (100) and menus (99) run first; NavController (0) pops the tab
    // stack and then calls the next handler, so minimising has to happen
    // before it, and only on a tab root. Minimise rather than exit, like
    // other Android apps.
    this.platform.backButton.subscribeWithPriority(1, (processNextHandler) => {
      if (ROOT_TAB_PATHS.has(this.router.url.split('?')[0])) {
        void App.minimizeApp();
      } else {
        processNextHandler();
      }
    });

    void App.addListener('appUrlOpen', ({ url }) => {
      this.zone.run(() => void this.router.navigateByUrl(webUrlToAppRoute(url)));
    });
  }
}
