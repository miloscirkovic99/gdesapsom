import { Component, Input } from "@angular/core";

@Component({
  selector: 'app-nav-icon',
  standalone: true,
  template: `
    <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      @for (p of paths; track $index) {
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="p"></path>
      }
    </svg>
  `,
})
export class AppNavIconComponent {
  @Input() icon!: string;

  get paths(): string[] {
    return this.icon.split('§');
  }
}
