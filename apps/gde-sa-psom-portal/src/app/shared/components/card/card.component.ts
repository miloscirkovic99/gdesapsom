import { Component, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../../core/services/dialog.service';
import { SpotDetailsComponent } from '../../dialogs/spot-details/spot-details.component';
import AOS from 'aos';
import { TranslocoModule } from '@ngneat/transloco';
import { descriptionToKeyMap, descriptionToKeyMapGarden, descriptionToKeyMapSpot } from '../../helpers/map.helpers';

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
  descriptionToKeyMap=descriptionToKeyMap
  descriptionToKeyMapGarden=descriptionToKeyMapGarden;
  descriptionToKeyMapSpot=descriptionToKeyMapSpot;
  ngAfterViewChecked() {
    AOS.refresh(); // Trigger AOS refresh after DOM updates

    console.log(this.data());
    
  }
  openDialog(data:any){
    this.dialogService.openDialog(SpotDetailsComponent, data);

  }
}
