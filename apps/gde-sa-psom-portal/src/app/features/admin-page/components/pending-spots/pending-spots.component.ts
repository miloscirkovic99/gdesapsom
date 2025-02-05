import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, take, takeUntil } from 'rxjs';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { DialogService } from 'apps/gde-sa-psom-portal/src/app/core/services/dialog.service';
import { AddSpotComponent } from 'apps/gde-sa-psom-portal/src/app/shared/dialogs/add-location/add-location.component';
import { SpotsStore } from 'apps/gde-sa-psom-portal/src/app/shared/store/spots.store';
import { ParksStore } from 'apps/gde-sa-psom-portal/src/app/shared/store/parks.store';

@Component({
  selector: 'app-pending-spots',
  imports: [CommonModule, CardComponent],
  templateUrl: './pending-spots.component.html',
  styleUrl: './pending-spots.component.scss',
})
export class PendingSpotsComponent {
  private destroyed$ = new Subject<void>();
  pendingSpots = signal<any>([]);
  private http = inject(HttpClient);
  private spotsStore = inject(SpotsStore);
  private dialogService = inject(DialogService);
  parksStore=inject(ParksStore)
  ngOnInit(): void {
    this.getPendingSpots();
    this.parksStore.petParks(0);
  }
  getPendingSpots() {
    this.http
      .get<any>('pet-friendly-spots/pending')
      .pipe(take(1), takeUntil(this.destroyed$))
      .subscribe({
        next: (result) => {
          this.pendingSpots.set(result.pending);
        },
      });
  }
  onAction(data: any,type:string) {
    
    switch (data.action) {
      case 'edit': {
        const options = {
          data: data.data,
          onSave: (form: any) => {
            //TODO: implement edit pending spot 
            this.spotsStore.updatePendingSpot(form.form)
          },
          isEdit: true,
          isPending: true,
        };
        this.dialogService.openDialog(AddSpotComponent, options);
        break;
      }
      case 'add': {
     
       type=='spot'?  this.spotsStore.acceptPendingSpot(data.data):this.parksStore.updatePark({par_id:data.data.par_id, par_accepted:1});
        break;
      }
      case 'delete': {
        type=='spot'? this.spotsStore.declinePendingSpot(data.data.pr_id):this.parksStore.updatePark({par_id:data.data.par_id, par_accepted:0,par_declined:1});
        break;
      }
    }
  }
  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
