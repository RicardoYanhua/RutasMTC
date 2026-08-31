import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/** Centraliza errores de red/servidor en toasts; los 400 de validación de formulario se manejan por componente. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notificaciones = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        notificaciones.error('Tu sesión expiró. Vuelve a iniciar sesión.');
        auth.logout();
      } else if (error.status === 403) {
        notificaciones.error(error.error?.mensaje ?? 'No tienes permisos para esta acción.');
      } else if (error.status === 0) {
        notificaciones.error('No se pudo conectar con el servidor. Verifica tu conexión.');
      } else if (error.status >= 500) {
        notificaciones.error(error.error?.mensaje ?? 'Error interno del servidor. Intenta nuevamente.');
      } else if (error.status !== 400) {
        notificaciones.error(error.error?.mensaje ?? 'Ocurrió un error inesperado.');
      }
      return throwError(() => error);
    })
  );
};
