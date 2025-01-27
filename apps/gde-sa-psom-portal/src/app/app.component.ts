import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import AOS from 'aos';
import { HttpClient } from '@angular/common/http';
import { SpotsStore } from './shared/store/spots.store';
import { filter } from 'rxjs';
import { ContactFormComponent } from "./shared/components/contact-form/contact-form.component";
@Component({
  imports: [RouterModule, NavbarComponent, FooterComponent, ContactFormComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers:[SpotsStore]
})
export class AppComponent {
  title = 'gde-sa-psom-portal';
  router=inject(Router);
  hideContactForm=signal(false)
  constructor() {}

  ngOnInit() {
    AOS.init({
      easing: 'linear', // Customize easing
    });
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((result) => {
      console.log(result);
      if(result.url.includes('admin')){
        this.hideContactForm.set(true)
      }
      setTimeout(() => {
        AOS.refresh();
      }, 500); // Add delay to ensure elements are rendered
    });
  }


}
