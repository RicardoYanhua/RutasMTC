import { Injectable, signal } from '@angular/core';

/**
 * Controla el popup de acceso (login) como overlay sobre la pantalla actual
 * (landing o cualquier paso del wizard), en vez de navegar a `/admin/login`
 * y perder de vista la página en la que estaba el usuario. La ruta
 * `/admin/login` se conserva aparte para los redirects de los guards
 * (sesión vencida, acceso directo por URL).
 */
@Injectable({ providedIn: 'root' })
export class LoginModalService {
  readonly abierto = signal(false);

  abrir(): void {
    this.abierto.set(true);
  }

  cerrar(): void {
    this.abierto.set(false);
  }
}
