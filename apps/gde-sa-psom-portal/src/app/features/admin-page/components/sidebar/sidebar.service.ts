import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  isOpened = signal(true);
  navigationRoutes=[
    {
       route:'admin/setting-spots',
       title:'Setting spot',
       icon:""
    },
    {
      route:'admin/pending-spots',
      title:'Setting pending spots'
    },
    {
      route:'admin/townships',
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
