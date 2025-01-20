import { Component, effect, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../services/dialog.service';
import { SpotDetailsComponent } from '../../dialogs/spot-details/spot-details.component';
import AOS from 'aos';

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
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    AOS.refreshHard()
  }
  openDialog(data:any){
    this.dialogService.openDialog(SpotDetailsComponent, data);

  }
}
