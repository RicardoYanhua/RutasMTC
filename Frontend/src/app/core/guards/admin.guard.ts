import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ModuloPanel } from '../models/auth.model';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.estaAutenticado()) return true;
  return router.parseUrl('/admin/login');
};

/**
 * Puerta por módulo. Si el rol no tiene el módulo en su menú, en vez de un
 * error se le devuelve a su propia pantalla de inicio: teclear una URL ajena
 * es casi siempre un enlace viejo, no un intento de intrusión.
 *
 * La comprobación de verdad la hace el backend; esto solo evita pantallas
 * vacías y menús que prometen lo que la API va a denegar.
 */
export const moduloGuard = (modulo: ModuloPanel): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.estaAutenticado()) return router.parseUrl('/admin/login');
  if (auth.ve(modulo)) return true;
  return router.parseUrl(auth.rutaInicial());
};

/** Además de ver el módulo, hay que poder escribir en él (formularios de alta y edición). */
export const edicionGuard = (modulo: ModuloPanel): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.estaAutenticado()) return router.parseUrl('/admin/login');
  if (auth.edita(modulo)) return true;
  return router.parseUrl(auth.rutaInicial());
};
