import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  isOpened = signal(true);
  navigationRoutes=[
    {
       route:'admin/settings-spot',
       title:'Setting spot',
       icon:""
    },
    {
      route:'admin/suggested-spot',
      title:'Check suggested spots'
    },
    {
      route:'admin/township',
      title:'Settings townships'
    },
    
  ]
  openSideBar() {
    this.isOpened.set(true);
  }

  closeSideBar() {
    this.isOpened.set(false);
  }
  toggleSidebar() {
    this.isOpened.update((currentState) => !currentState);
  }
}
