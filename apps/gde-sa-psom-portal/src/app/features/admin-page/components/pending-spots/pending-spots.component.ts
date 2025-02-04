import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, take, takeUntil } from 'rxjs';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { DialogService } from 'apps/gde-sa-psom-portal/src/app/core/services/dialog.service';
import { AddSpotComponent } from 'apps/gde-sa-psom-portal/src/app/shared/dialogs/add-location/add-location.component';
import { SpotsStore } from 'apps/gde-sa-psom-portal/src/app/shared/store/spots.store';

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

  ngOnInit(): void {
    this.getPendingSpots();
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
  onAction(data: any) {
    switch (data.action) {
      case 'edit': {
        const options = {
          data: data.data,
          onSave: (form: any) => {
            //TODO: implement edit pending spot 

            console.log(form);
            this.spotsStore.updatePendingSpot(form)
          },
          isEdit: true,
          isPending: true,
        };
        this.dialogService.openDialog(AddSpotComponent, options);
        break;
      }
      case 'add': {
        this.spotsStore.acceptPendingSpot(data.data);
        break;
      }
      case 'delete': {
        this.spotsStore.declinePendingSpot(data.data.pr_id);
        break;
      }
    }
  }
  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
