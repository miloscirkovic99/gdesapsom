import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import AOS from 'aos';
import { TranslocoModule } from '@ngneat/transloco';
import { descriptionToKeyMap, descriptionToKeyMapGarden, descriptionToKeyMapSpot } from '@gde/shared/util';

/** The park fields the address link needs; the card data itself is untyped. */
interface CardPlace {
  par_id?: number;
  par_lokacija?: string | null;
  ops_ime?: string | null;
  grd_ime?: string | null;
}

@Component({
  selector: 'app-card',
  imports: [CommonModule,TranslocoModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  
})
export class CardComponent {
  private router = inject(Router);

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
    AOS.refresh();
  }
  openDialog(data:any){
    this.router.navigate(['/spots', data.iuo_id || 0], { state: { spot: data } });
  }
  onAction(data:any,action:string){
    const actions={
      data:data,
      action:action,
      isPending:this.isPendingSpot()
    }
    
    this.onActionClick.emit(actions)
  }
  /** Parks link their address to Google Maps; spots open the detail page instead. */
  googleMapsUrl(item: CardPlace): string | null {
    if (!item?.par_lokacija) return null;
    const location = [item.par_lokacija, item.ops_ime, item.grd_ime].filter(Boolean).join(' ');
    return `https://www.google.com/maps?q=${encodeURIComponent(location)}`;
  }

  /** `park-<id>` names the park in GA4 (`venue_slug`); parks have no slug. */
  venueSlug(item: CardPlace): string | null {
    return item?.par_id ? `park-${item.par_id}` : null;
  }
}
