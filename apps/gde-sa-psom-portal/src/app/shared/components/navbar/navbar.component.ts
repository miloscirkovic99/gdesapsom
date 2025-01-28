import { MatMenuModule } from '@angular/material/menu';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { RouteConstants } from '../../constants/route.constant';
import { TranslocoModule } from '@ngneat/transloco';
import { LanguageService } from '../../../core/services/language.service';
import { MatButtonModule } from '@angular/material/button';
import { DialogService } from '../../../core/services/dialog.service';
import { AddSpotComponent } from '../../dialogs/add-spot/add-spot.component';
import { AuthService } from '../../../features/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [
    CommonModule,
    MatIconModule,
    RouterModule,
    TranslocoModule,
    MatMenuModule,
    MatButtonModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  menuOpen = false;
  public themeColor: string = 'dark';
  routeConstants = RouteConstants;
  @ViewChild('mobileMenu') mobileMenu: ElementRef | undefined;
  @ViewChild('hamburgerBtn') hamburgerBtn: ElementRef | undefined;
  private languageService = inject(LanguageService);
  private dialogService = inject(DialogService);
  authService=inject(AuthService)
  ngOnInit() {
    this.initializeTheme();
    if (localStorage.getItem('language')) {
      this.languageService.switchLanguage(
        localStorage.getItem('language') as string
      );
    }
    this.authService.getSessionResult()
  }
  initializeTheme(): void {
    this.initTheme()
  }
  private initTheme(): void {
    const savedTheme = localStorage.getItem('currentTheme');
    if (savedTheme) {
      this.themeColor = savedTheme;
    } else if (!('currentTheme' in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      this.themeColor = 'dark';
    }
    this.applyTheme();
  }

  toggleTheme(): void {
    this.themeColor = this.themeColor === 'dark' ? 'light' : 'dark';
    localStorage.setItem('currentTheme', this.themeColor);
    this.applyTheme();
  }

  private applyTheme(): void {
    if (this.themeColor === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  switchLanguage(language: string) {
    localStorage.setItem('language', language);

    this.languageService.switchLanguage(language);
  }

  // Listen for document click events to detect outside clicks
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen) {
      const clickedInsideMenu = this.mobileMenu?.nativeElement.contains(
        event.target
      );
      const clickedInsideButton = this.hamburgerBtn?.nativeElement.contains(
        event.target
      );

      // Close the menu if clicked outside both the menu and the hamburger button
      if (!clickedInsideMenu && !clickedInsideButton) {
        this.menuOpen = false;
      }
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  openDialog() {
    this.dialogService.openDialog(AddSpotComponent, {});
  }
}
