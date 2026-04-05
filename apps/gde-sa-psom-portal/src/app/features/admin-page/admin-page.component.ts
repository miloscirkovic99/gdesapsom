import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { AuthService } from '../auth/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-admin-page',
  imports: [CommonModule, RouterModule, TranslocoModule],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AdminPageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  sidebarOpen = signal(false);
  sidebarDesktopOpen = signal(true);

  navigationRoutes = [
    {
      route: '/admin/setting-spots',
      title: 'setting_spots',
      icon: 'spots',
    },
    {
      route: '/admin/pending-spots',
      title: 'pending_spots',
      icon: 'pending',
    },
    {
      route: '/admin/townships',
      title: 'townships',
      icon: 'townships',
    },
  ];

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleDesktopSidebar(): void {
    this.sidebarDesktopOpen.update((v) => !v);
  }

  closeSidebarOnMobile(): void {
    this.sidebarOpen.set(false);
  }

  logout(): void {
    this.authService
      .logout()
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.router.navigate(['']);
        },
      });
  }
}
