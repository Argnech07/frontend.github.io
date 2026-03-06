import {
  ActivatedRouteSnapshot,
  CanActivateChildFn,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { inject } from '@angular/core';

const isAdminSession = (): boolean => {
  const token = localStorage.getItem('auth_token');
  const userType = localStorage.getItem('user_type');
  return !!token && userType === 'admin';
};

export const adminGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot
) => {
  const router = inject(Router);

  if (isAdminSession()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

export const adminChildGuard: CanActivateChildFn = (
  childRoute: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => adminGuard(childRoute, state);
