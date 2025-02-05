import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-admin-page',
  imports: [CommonModule, SidebarComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
  encapsulation:ViewEncapsulation.None
})
export class AdminPageComponent {}
