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
    {
      route:'admin/pet-shops',
      title:'Pet shops'
    },
    {
      route:'admin/dog-food',
      title:'Dog food'
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
