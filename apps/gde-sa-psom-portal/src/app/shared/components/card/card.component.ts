import { Component, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../../core/services/dialog.service';
import { SpotDetailsComponent } from '../../dialogs/spot-details/spot-details.component';
import AOS from 'aos';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-card',
  imports: [CommonModule,TranslocoModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {

  data=input<any>();
  isLoading=input();
  dialogService = inject(DialogService);
  hiddeDetailsButton=input<boolean>(false)
  descriptionToKeyMap: { [key: string]: string } = {
    'Svi psi': 'all_dogs',
    'Mali pas': 'small_dog',
    'Mali pas i štenci većih rasa do 5 meseci starosti': 'small_puppies',
  };
  descriptionToKeyMapGarden: { [key: string]: string } = {
    'bez bašte': 'with_garden',
    'sa baštom': 'without_garden',
  };
  ngAfterViewChecked() {
    AOS.refresh(); // Trigger AOS refresh after DOM updates
  }
  openDialog(data:any){
    this.dialogService.openDialog(SpotDetailsComponent, data);

  }
}
