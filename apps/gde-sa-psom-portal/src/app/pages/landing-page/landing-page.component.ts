import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import AOS from 'aos'
import { CardComponent } from '../../shared/components/card/card.component';
import { SpotsStore } from '../../shared/store/spots.store';

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule,CardComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
    spotsStore = inject(SpotsStore);
  
  ngOnInit(){
    AOS.init();
    AOS.refresh()
  }
}
