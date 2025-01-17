import { Component, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../services/dialog.service';
import { SpotDetailsComponent } from '../../dialogs/spot-details/spot-details.component';

@Component({
  selector: 'app-card',
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  data=input<any>();
  isLoading=input();
  dialogService = inject(DialogService);

  constructor(){
    effect(()=>{
      console.log(this.data(),this.isLoading());
      
    })
  }
  openDialog(data:any){
    this.dialogService.openDialog(SpotDetailsComponent, data);

  }
}
