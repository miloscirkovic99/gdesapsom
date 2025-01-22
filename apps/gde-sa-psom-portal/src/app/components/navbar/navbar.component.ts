import { Component, ElementRef, HostListener, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { RouteConstants } from '../../shared/constants/route.constant';
import { TranslocoModule } from '@ngneat/transloco';
import { LanguageService } from '../../shared/services/language.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule,MatIconModule,RouterModule,TranslocoModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',

})
export class NavbarComponent {
  menuOpen = false;
  public themeColor:string='dark';
  routeConstants=RouteConstants;
  @ViewChild('mobileMenu') mobileMenu: ElementRef | undefined;
  @ViewChild('hamburgerBtn') hamburgerBtn: ElementRef | undefined;
  private languageService = inject(LanguageService);

  ngOnInit(){
    this.initializeTheme();
    if(localStorage.getItem('language')){

      this.languageService.switchLanguage(localStorage.getItem('language') as string);
    }
  }
  initializeTheme(): void {
    // Check if a theme is set in localStorage
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      this.themeColor = storedTheme;
    } else {
      localStorage.setItem('theme', this.themeColor); // Set default if not set
    }
    this.applyTheme();
  }

  toggleTheme(): void {
    this.themeColor = this.themeColor === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', this.themeColor);
    this.applyTheme();
  }
  switchLanguage(language: string) {
    localStorage.setItem('language',language);
    
      this.languageService.switchLanguage(language)
    
  }
  private applyTheme(): void {
    document.body.classList.toggle('dark-theme', this.themeColor === 'dark');
    document.body.classList.toggle('light-theme', this.themeColor === 'light');
  }
    // Listen for document click events to detect outside clicks
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
      if (this.menuOpen) {
        const clickedInsideMenu = this.mobileMenu?.nativeElement.contains(event.target);
        const clickedInsideButton = this.hamburgerBtn?.nativeElement.contains(event.target);
  
        // Close the menu if clicked outside both the menu and the hamburger button
        if (!clickedInsideMenu && !clickedInsideButton) {
          this.menuOpen = false;
        }
      }
    }
  
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}
