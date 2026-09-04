import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../shared/components/card/card.component';
import { ParksStore } from '../../shared/store/parks.store';
import { TranslocoModule } from '@ngneat/transloco';
import { ListName } from '../../core/analytics/analytics.taxonomy';

@Component({
  selector: 'app-pet-parks',
  imports: [CommonModule, CardComponent,TranslocoModule],
  templateUrl: './pet-parks.component.html',
  styleUrl: './pet-parks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,

})
export class PetParksComponent {
  parkStore = inject(ParksStore);
  listNames = ListName;

}
