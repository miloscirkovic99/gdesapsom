import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { LanguageService } from './shared/services/language.service';
import AOS from 'aos';
import { HttpClient } from '@angular/common/http';
import { environment } from '../env/env.dev';
import { SpotsStore } from './shared/store/spots.store';
import { filter } from 'rxjs';
@Component({
  imports: [RouterModule, NavbarComponent, FooterComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers:[SpotsStore]
})
export class AppComponent {
  title = 'gde-sa-psom-portal';
  public themeColor: string = 'dark';

  spotsList: any[] = []; // Store all loaded results
  totalResults: number = 0; // Total number of results from DB
  limit: number = 10; // Results per page
  offset: number = 0; // Starting offset
  isLoading: boolean = false; // Loading state
  spots = inject(SpotsStore);
  router=inject(Router)
  constructor(private http: HttpClient) {}

  ngOnInit() {
    AOS.init({
      easing: 'linear', // Customize easing
    });
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      setTimeout(() => {
        AOS.refresh();
      }, 500); // Add delay to ensure elements are rendered
    });
  }


}
