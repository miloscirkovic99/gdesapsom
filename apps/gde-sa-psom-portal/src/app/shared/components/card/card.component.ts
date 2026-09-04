import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import AOS from 'aos';
import { TranslocoModule } from '@ngneat/transloco';
import { descriptionToKeyMap, descriptionToKeyMapGarden, descriptionToKeyMapSpot } from '../../helpers/map.helpers';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  DirectionsProvider,
  ItemCategory,
  ListName,
  toItemCategory,
} from '../../../core/analytics/analytics.taxonomy';

@Component({
  selector: 'app-card',
  imports: [CommonModule,TranslocoModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,

})
export class CardComponent {
  private router = inject(Router);
  private analytics = inject(AnalyticsService);

  data=input<any>();
  isLoading=input();
  hiddeDetailsButton=input<boolean>(false);
  isAdmin=input<any>(false);
  isPendingSpot=input<any>(false);
  /** Which list this card grid represents in GA4 (`select_item.list_name`). Unset = not tracked. */
  listName = input<ListName | null>(null);

  onActionClick=output<any>()
  //map
  descriptionToKeyMap=descriptionToKeyMap
  descriptionToKeyMapGarden=descriptionToKeyMapGarden;
  descriptionToKeyMapSpot=descriptionToKeyMapSpot;


  ngAfterViewChecked() {
    AOS.refresh();
  }
  openDialog(data:any, position = 0){
    this.trackSelectItem(data, position);
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
  navigateToGoogleMaps(item:any) {
    const location = item.par_lokacija? (item?.par_lokacija + ' ' + item?.ops_ime + ' ' + item?.grd_ime):item.iuo_adressa  ;

    // Check if location exists
    if (location) {
      this.analytics.trackGetDirections({
        item_id: String(item?.par_id ?? item?.iuo_id ?? ''),
        item_category: item?.par_lokacija ? ItemCategory.park : toItemCategory(item?.ugo_ime),
        city: item?.grd_ime ?? null,
        provider: DirectionsProvider.googleMaps,
      });
      const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(location)}`;
      window.open(googleMapsUrl, '_blank'); // Open in a new tab
    }
  }

  private trackSelectItem(item: any, index: number): void {
    const listName = this.listName();
    // Admin grids are management UI, not listing traffic.
    if (!listName || this.isAdmin()) return;

    this.analytics.trackSelectItem({
      item_id: String(item?.iuo_id ?? ''),
      item_name: item?.iuo_ime ?? null,
      item_category: toItemCategory(item?.ugo_ime),
      city: item?.grd_ime ?? null,
      position: index + 1,
      list_name: listName,
    });
  }
}
