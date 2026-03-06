import { Routes } from '@angular/router';
import { adminChildGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },

  {
    path: 'estadisticas',
    pathMatch: 'full',
    redirectTo: 'dashboard/estadisticas',
  },

  // LOGIN
  {
    path: 'auth/login',
    loadComponent: () => import('./pages/auth/auth'),
  },

  // REGISTER
  {
    path: 'auth/register',
    loadComponent: () => import('./pages/auth/register/register'),
  },

  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard'),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'agenda',
      },
      {
        path: 'patient-list',
        loadComponent: () =>
          import('./pages/dashboard/patient list/patient-list'),
      },
      {
        path: 'agenda',
        loadComponent: () => import('./pages/dashboard/agenda/agenda'),
      },
      {
        path: 'estadisticas',
        loadComponent: () => import('./pages/dashboard/estadisticas/estadisticas'),
      },
    ],
  },

  {
    path: 'patient',
    loadComponent: () => import('./pages/patient/patient'),
    children: [
      {
        path: 'patient-info',
        loadComponent: () =>
          import('./pages/patient/patient-info/patient-info'),
      },
      {
        path: 'atention-history',
        loadComponent: () =>
          import('./pages/patient/atention-history/atention-history'),
      },
      {
        path: 'study-orders',
        loadComponent: () =>
          import('./pages/patient/study-orders/study-orders'),
      },
      {
        path: 'incapacities',
        loadComponent: () =>
          import('./pages/patient/incapacities/incapacities'),
      },
    ],
  },

  {
    path: 'new-atention',
    loadComponent: () => import('./pages/new-atention/new-atention'),
  },

  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin'),
    canActivateChild: [adminChildGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'usuarios',
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/admin/admin-usuarios/admin-usuarios'),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./pages/admin/admin-configuracion/admin-configuracion'),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./pages/admin/admin-reportes/admin-reportes'),
      },
      {
        path: 'doctores',
        loadComponent: () =>
          import('./pages/admin/admin-doctores/admin-doctores'),
      },
    ],
  },
  {
    path: 'test',
    loadComponent: () => import('./pages/testting-page/testting-page'),
  },

  // opcional 404
  // { path: '**', redirectTo: 'auth/login' },
];
