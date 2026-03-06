import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken(); // ← usa el token del servicio
  const userType = localStorage.getItem('user_type');

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        console.error('HTTP 401 en', req.url);

        const isDoctorEndpoint = req.url.includes('/doctors/me');
        const isAdminEndpoint = req.url.includes('/admins/me');

        // Solo forzar logout si falló la validación de identidad del usuario actual.
        // Para otros endpoints, un 401 puede ser un tema de permisos/ruta y no debe
        // tumbar toda la sesión (evita que el admin rebote al login).
        if (!isDoctorEndpoint && !isAdminEndpoint) {
          return throwError(() => error);
        }

        // Si estás autenticado como admin pero se llama un endpoint de doctor (o viceversa),
        // no forzar logout global; esto evita que pantallas del admin te "boten" al login.
        if (
          (userType === 'admin' && isDoctorEndpoint) ||
          (userType === 'doctor' && isAdminEndpoint)
        ) {
          return throwError(() => error);
        }

        authService.logout();
        router.navigate(['/auth/login']);
      }
      return throwError(() => error);
    })
  );
};
