import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { SidebarService } from './sidebar.service';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, MatSidenavModule, RouterModule, MatIconModule,MatListModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  drawerMode: 'side' | 'over' = 'side';
  isSmallScreen = false;
  sidebarService = inject(SidebarService);
  navigationButtons=signal<any>(this.sidebarService.navigationRoutes)
  constructor(private breakpointObserver: BreakpointObserver) {
    this.breakpointObserver
      .observe(['(max-width: 1000px)'])
      .subscribe((result) => {
        this.drawerMode = result.matches ? 'over' : 'side';
        if (!result.matches) {
          this.sidebarService.openSideBar();
        }
        this.isSmallScreen = result.matches;
      });
  }
  toggleSidebar(): void {
    this.sidebarService.toggleSidebar();
  }
  onSidebarStateChange(isOpened: boolean): void {
    if (isOpened !== this.sidebarService.isOpened()) {
      this.sidebarService.toggleSidebar();
    }
  }
}
