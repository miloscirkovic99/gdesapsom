import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { LanguageService } from './shared/services/language.service';
import AOS from 'aos';
import { HttpClient } from '@angular/common/http';
import { environment } from '../env/env.dev';
@Component({
  imports: [RouterModule, NavbarComponent, FooterComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'gde-sa-psom-portal';
  private languageService = inject(LanguageService);
  public themeColor: string = 'dark';

  spotsList: any[] = []; // Store all loaded results
  totalResults: number = 0; // Total number of results from DB
  limit: number = 10; // Results per page
  offset: number = 0; // Starting offset
  isLoading: boolean = false; // Loading state

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // AOS.init({
    //   startEvent:'scroll'
    // });
    // AOS.refresh()
    this.loadMore();
  }
  loadMore() {
    this.isLoading = true;
    const body = {
      limit: this.limit,
      offset: this.offset,
    };
    this.http
      .post<any>(`https://gdesapsom.com/api/v2/pet-friendly-spots/all`,body)
      .subscribe((response) => {
        this.spotsList = [...this.spotsList, ...response.spotsList]; // Append new results
        this.totalResults = response.totalResults; // Update total count
        this.offset = this.spotsList.length; // Update offset for next load
        this.isLoading = false;
      });
  }
  switchLanguage(language: string) {
    this.languageService.switchLanguage(language);
  }
}
