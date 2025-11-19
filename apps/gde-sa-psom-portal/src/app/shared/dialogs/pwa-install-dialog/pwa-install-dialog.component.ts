import {
  Component,
  OnInit,
  signal,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-pwa-install-dialog',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './pwa-install-dialog.component.html',
  styleUrl: './pwa-install-dialog.component.scss',
})
export class PwaInstallDialogComponent implements OnInit, OnDestroy {
  isOpen = signal(false);
  isLoading = signal(false);
  canInstall = signal(false);
  showDialog = signal(false);
  isIOS = signal(false);
  private deferredPrompt: any;
  readonly PWA_FIRST_VISIT_KEY = 'pwa_first_visit';

  ngOnInit() {
    this.detectPlatform();
    this.checkFirstVisit();
    this.setupInstallPrompt();
  }

  ngOnDestroy() {
    // Cleanup
  }

  private detectPlatform(): void {
    const ua = navigator.userAgent;
    this.isIOS.set(/iPad|iPhone|iPod/.test(ua) && !('MSStream' in window));
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
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA je instalirana');
      localStorage.setItem('pwa_installed', 'true');
      this.closeDialog();
    });
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
