import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router=inject(Router)
  if(localStorage.getItem('sid')){
    return true
  }
  router.navigate(['/'])
  console.error('Not authorized');
  
  return false;
};
