import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../shared/components/card/card.component';
import { ParksStore } from '@gde/shared/data-access';
import { TranslocoModule } from '@ngneat/transloco';
import { ListStateComponent, ListStatus } from '../../shared/components/list-state/list-state.component';

@Component({
  selector: 'app-pet-parks',
  imports: [CommonModule, CardComponent, TranslocoModule, ListStateComponent],
  templateUrl: './pet-parks.component.html',
  styleUrl: './pet-parks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  
})
export class PetParksComponent {
  parkStore = inject(ParksStore);

  /** null once there are parks to show. */
  readonly listStatus = computed<ListStatus | null>(() => {
    const status = this.parkStore.parksStatus();
    if (status === 'error') return 'error';
    if (status === 'loading' || status === 'idle') return 'loading';
    return this.parkStore.parks().length ? null : 'empty';
  });

  retry(): void {
    this.parkStore.petParks();
  }

}
