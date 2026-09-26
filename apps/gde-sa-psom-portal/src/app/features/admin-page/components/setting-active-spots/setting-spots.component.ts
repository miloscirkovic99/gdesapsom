import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { SpotsStore } from '../../../../shared/store/spots.store';
import { TranslocoModule } from '@ngneat/transloco';
import { DialogService } from '../../../../core/services/dialog.service';
import { AddSpotComponent } from '../../../../shared/dialogs/add-location/add-location.component';
import { refreshAosOn } from '../../../../core/aos/refresh-aos-on';

@Component({
  selector: 'app-setting-spots',
  imports: [CommonModule, CardComponent, TranslocoModule],
  templateUrl: './setting-spots.component.html',
  styleUrl: './setting-spots.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingSpotsComponent {
  spotsStore = inject(SpotsStore);
  private dialogService = inject(DialogService);
  constructor() {
    refreshAosOn(() => this.spotsStore.spots());
  }
  onSearchUpdated(event: any) {
    this.onSubmit(event,true);
  }
  onSubmit(word:any=null,resetOffset: boolean = false) {
    const data = {
      ops_id:null,
      ugo_id: null,
      sta_id: null,
      word: word || null,
      latitude: null,
      longitude: null,
      radius: null,
      resetOffset:resetOffset
    };

    this.spotsStore.loadSpots({data})
  }
  onAction(data: any) {
    const options = {
      data: data.data,
      isEdit: true,
      onSave: (form: any) => {
        this.spotsStore.updateSpot(form.form, () => this.dialogService.closeDialog());
      },
    };
    switch (data.action) {
      case 'edit': {
        this.dialogService.openDialog(AddSpotComponent, options);
        break;
      }
      case 'delete':{
        this.spotsStore.deleteSpot(data.data.iuo_id);
        break;
      }
   
    }
  }
}
