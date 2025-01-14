import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from "./components/footer/footer.component";
import { LanguageService } from './shared/services/language.service';
import AOS from 'aos'
@Component({
  imports: [RouterModule, NavbarComponent, FooterComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'gde-sa-psom-portal';
  private languageService=inject(LanguageService);
  public themeColor:string='dark';
  ngOnInit(){
    this.initializeTheme();
    // AOS.init({
    //   startEvent:'scroll'
    // });
    // AOS.refresh()
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
  switchLanguage(language: string) {
    this.languageService.switchLanguage(language);
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
}
