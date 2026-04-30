import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouteConstants } from '../../constants/route.constant';
import { AppNavIconComponent } from '../bottom-navigation-icon/app-nav-bottom-icon';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  ariaLabel: string;
  isFab?: boolean;
}

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink,AppNavIconComponent],
  templateUrl: './bottom-navigation.component.html',
  styleUrl: './bottom-navigation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavigationComponent {
  private readonly router = inject(Router);

  readonly activeRoute = signal(this.router.url);

  readonly navItems = signal<NavItem[]>([
    {
      id: 'home',
      label: 'Home',
      icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
      route: '/',
      ariaLabel: 'Home',
    },
    {
      id: 'spots',
      label: 'Spots',
      icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z§M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
      route: `/${RouteConstants.allSpots}`,
      ariaLabel: 'Spots',
    },
    {
      id: 'add',
      label: 'Add',
      icon: 'M12 4.5v15m7.5-7.5h-15',
      route: `/${RouteConstants.addSpot}`,
      ariaLabel: 'Add spot',
      isFab: true,
    },
    {
      id: 'blog',
      label: 'Blog',
      icon: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5',
      route: `/${RouteConstants.blog}`,
      ariaLabel: 'Blog',
    },
    {
      id: 'business',
      label: 'Business',
      icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18',
      route: `/${RouteConstants.business}`,
      ariaLabel: 'Business',
    },
  ]);

  readonly fabItem = computed(() =>
    this.navItems().find((i) => i.isFab)!
  );

  readonly leftItems = computed(() =>
    this.navItems().filter((_, i) => i < 2)
  );

  readonly rightItems = computed(() =>
    this.navItems().filter((_, i) => i >= 3)
  );

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((e) => {
        this.activeRoute.set(e.urlAfterRedirects);
      });
  }

  isActive(route: string): boolean {
    const current = this.activeRoute();
    return route === '/' ? current === '/' : current.startsWith(route);
  }

  iconPaths(icon: string): string[] {
    return icon.split('§');
  }
}
