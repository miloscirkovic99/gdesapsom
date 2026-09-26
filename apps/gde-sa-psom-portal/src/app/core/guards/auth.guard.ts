import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../../shared/data-access/platform/session-store';

export const authGuard: CanActivateFn = (route, state) => {
  const router=inject(Router)
  if(inject(SessionStore).getSid()){
    return true
  }
  router.navigate(['/'])
  console.error('Not authorized');

  return false;
};
