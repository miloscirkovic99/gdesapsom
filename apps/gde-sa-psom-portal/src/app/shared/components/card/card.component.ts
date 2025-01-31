import { Component, effect, inject, input, output } from '@angular/core';
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
  dialogService = inject(DialogService);

  data=input<any>();
  isLoading=input();
  hiddeDetailsButton=input<boolean>(false);
  isAdmin=input<any>(false);
  isPendingSpot=input<any>(false);

  onActionClick=output<any>()
  //map
  descriptionToKeyMap=descriptionToKeyMap
  descriptionToKeyMapGarden=descriptionToKeyMapGarden;
  descriptionToKeyMapSpot=descriptionToKeyMapSpot;


  ngAfterViewChecked() {
    AOS.refresh(); // Trigger AOS refresh after DOM updates    
  }
  openDialog(data:any){
    this.dialogService.openDialog(SpotDetailsComponent, data);

  }
  onAction(data:any,action:string){
    const actions={
      data:data,
      action:action,
      isPending:this.isPendingSpot()
    }
    
    this.onActionClick.emit(actions)
  }
  navigateToGoogleMaps(item:any) {
    const location = item.par_lokacija? (item?.par_lokacija + ' ' + item?.ops_ime + ' ' + item?.grd_ime):item.iuo_adressa  ;
  
    // Check if location exists
    if (location) {
      const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(location)}`;
      window.open(googleMapsUrl, '_blank'); // Open in a new tab
    }
  }
}
