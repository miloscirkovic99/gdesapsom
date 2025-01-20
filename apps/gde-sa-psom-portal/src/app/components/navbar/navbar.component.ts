import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { RouteConstants } from '../../shared/constants/route.constant';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule,MatIconModule,RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',

})
export class NavbarComponent {
  menuOpen = false;
  public themeColor:string='dark';
  routeConstants=RouteConstants
  ngOnInit(){
    this.initializeTheme()
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

  private applyTheme(): void {
    document.body.classList.toggle('dark-theme', this.themeColor === 'dark');
    document.body.classList.toggle('light-theme', this.themeColor === 'light');
  }
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}
