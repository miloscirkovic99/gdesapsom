import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { SpotsStore } from 'apps/gde-sa-psom-portal/src/app/shared/store/spots.store';
import { TranslocoModule } from '@ngneat/transloco';
import { DialogService } from 'apps/gde-sa-psom-portal/src/app/core/services/dialog.service';
import { AddSpotComponent } from 'apps/gde-sa-psom-portal/src/app/shared/dialogs/add-location/add-location.component';

@Component({
  selector: 'app-setting-spots',
  imports: [CommonModule, CardComponent, TranslocoModule],
  templateUrl: './setting-spots.component.html',
  styleUrl: './setting-spots.component.scss',
})
export class SettingSpotsComponent {
  spotsStore = inject(SpotsStore);
  private dialogService = inject(DialogService);
  onSearchUpdated(event: any) {
    this.onSubmit(event,true);
  }
  onSubmit(word:any=null,resetOffset: boolean = false) {
    const data = {
      ops_id:null,
      ugo_id: null,
      sta_id: null,
      word: word || null,
    };

    this.spotsStore.loadData(
      data.ops_id,
      data.ugo_id,
      data.sta_id,
      data.word,
      resetOffset
    );
  }
  onAction(data: any) {
    const options = {
      data: data.data,
      isEdit: true,
      onSave: (form: any) => {
        this.spotsStore.updateSpot(form.form);
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
