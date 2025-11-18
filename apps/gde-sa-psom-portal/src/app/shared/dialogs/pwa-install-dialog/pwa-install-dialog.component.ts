import { Component, OnInit, signal, HostListener, OnDestroy } from '@angular/core';
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
  private deferredPrompt: any;
  readonly PWA_FIRST_VISIT_KEY = 'pwa_first_visit';

  ngOnInit() {
    this.checkFirstVisit();
    this.setupInstallPrompt();
  }

  ngOnDestroy() {
    // Cleanup
  }

  private checkFirstVisit(): void {
    const hasVisited = localStorage.getItem(this.PWA_FIRST_VISIT_KEY);
    if (!hasVisited) {
      localStorage.setItem(this.PWA_FIRST_VISIT_KEY, 'true');
      // Delay showing dialog to ensure service worker is ready
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
    if (this.deferredPrompt) {
      this.isLoading.set(true);
      this.deferredPrompt.prompt();
      
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        this.isLoading.set(false);
        
        if (choiceResult.outcome === 'accepted') {
          console.log('✅ Korisnik je prihvatio instalaciju');
          localStorage.setItem('pwa_installed', 'true');
        } else {
          console.log('❌ Korisnik je odbio instalaciju');
        }
        
        this.deferredPrompt = null;
        this.canInstall.set(false);
        this.closeDialog();
      }).catch((err: any) => {
        console.error('❌ Greška pri instalaciji:', err);
        this.isLoading.set(false);
      });
    }
  }

  closeDialog(): void {
    this.isOpen.set(false);
    setTimeout(() => {
      this.showDialog.set(false);
    }, 300);
  }
}
