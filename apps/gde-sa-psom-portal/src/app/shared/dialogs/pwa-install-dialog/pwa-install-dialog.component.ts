import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
  HostListener,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@ngneat/transloco';
import { AnalyticsService } from '../../../core/services/analytics.service';

@Component({
  selector: 'app-pwa-install-dialog',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './pwa-install-dialog.component.html',
  styleUrl: './pwa-install-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaInstallDialogComponent implements OnInit, OnDestroy {
  isOpen = signal(false);
  isLoading = signal(false);
  canInstall = signal(false);
  showDialog = signal(false);
  isIOS = signal(false);
  private deferredPrompt: any;
  private readonly analytics = inject(AnalyticsService);
  readonly PWA_FIRST_VISIT_KEY = 'pwa_first_visit';
  private beforeInstallHandler = (e: Event) => {
    e.preventDefault();
    this.deferredPrompt = e;
    this.canInstall.set(true);
  };
  private appInstalledHandler = () => {
    localStorage.setItem('pwa_installed', 'true');
    this.closeDialog();
  };

  ngOnInit() {
    const platform = this.detectPlatform();
    // Desktop browsers get no install dialog, and neither does the installed app itself.
    if (!platform || this.isStandalone()) return;

    this.isIOS.set(platform === 'ios');
    this.checkFirstVisit();
    this.setupInstallPrompt();
  }

  ngOnDestroy() {
    window.removeEventListener('beforeinstallprompt', this.beforeInstallHandler);
    window.removeEventListener('appinstalled', this.appInstalledHandler);
  }

  /** null for desktop browsers. */
  private detectPlatform(): 'ios' | 'android' | null {
    const ua = navigator.userAgent;
    // iPadOS 13+ Safari sends a desktop Mac user agent; only touch support gives it away.
    const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    if (/iPad|iPhone|iPod/.test(ua) || isIPadOS) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return null;
  }

  /**
   * True when opened from the home screen. iOS keeps the installed app's
   * storage apart from Safari's, so `pwa_first_visit` alone would offer the
   * install again on its first launch.
   */
  private isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  private checkFirstVisit(): void {
    const hasVisited = localStorage.getItem(this.PWA_FIRST_VISIT_KEY);
    if (!hasVisited) {
      localStorage.setItem(this.PWA_FIRST_VISIT_KEY, 'true');
      setTimeout(() => {
        this.showDialog.set(true);
        setTimeout(() => this.isOpen.set(true), 50);
      }, 800);
    }
  }

  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', this.beforeInstallHandler);
    window.addEventListener('appinstalled', this.appInstalledHandler);
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.isOpen()) {
      this.closeDialog();
    }
  }

  installApp(): void {
    if (this.isIOS()) {
      this.handleIOSInstall();
    } else if (this.deferredPrompt) {
      this.handleAndroidInstall();
    }
  }

  private handleAndroidInstall(): void {
    if (!this.deferredPrompt) return;

    this.isLoading.set(true);
    this.deferredPrompt.prompt();

    this.deferredPrompt.userChoice
      .then((choiceResult: any) => {
        this.isLoading.set(false);
        this.analytics.trackPwaInstall(choiceResult.outcome);

        if (choiceResult.outcome === 'accepted') {
          localStorage.setItem('pwa_installed', 'true');
        }
        this.deferredPrompt = null;
        this.canInstall.set(false);
        this.closeDialog();
      })
      .catch((err: any) => {
        this.isLoading.set(false);
      });
  }

  private handleIOSInstall(): void {
    this.isLoading.set(true);

    const message = `
📱 iOS PWA Installation:

1. Tap the Share button (square with arrow)
2. Select "Add to Home Screen"
3. Name: Gde sa psom
4. Tap "Add"

Your app will appear on your home screen!
    `;

    alert(message);
    this.isLoading.set(false);
    localStorage.setItem('pwa_installed', 'true');
    this.closeDialog();
  }

  closeDialog(): void {
    this.isOpen.set(false);
    setTimeout(() => {
      this.showDialog.set(false);
    }, 300);
  }
}
