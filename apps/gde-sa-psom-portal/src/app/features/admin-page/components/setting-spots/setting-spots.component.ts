import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { SpotsStore } from 'apps/gde-sa-psom-portal/src/app/shared/store/spots.store';
import { TranslocoModule } from '@ngneat/transloco';
import { DialogService } from 'apps/gde-sa-psom-portal/src/app/core/services/dialog.service';
import { AddSpotComponent } from 'apps/gde-sa-psom-portal/src/app/shared/dialogs/add-spot/add-spot.component';

@Component({
  selector: 'app-setting-spots',
  imports: [CommonModule, CardComponent, TranslocoModule],
  templateUrl: './setting-spots.component.html',
  styleUrl: './setting-spots.component.scss',
})
export class SettingSpotsComponent {
  spotsStore = inject(SpotsStore);
  private dialogService = inject(DialogService);
  onSubmit(resetOffset: boolean = false) {
    this.spotsStore.loadData(null, null, null, resetOffset);
  }
  onAction(data: any) {
    console.log(data);
    const options = {
      data: data.data,
      isEdit: true,
      onSave: (form: any) => {
        this.spotsStore.updateSpot(form);
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
