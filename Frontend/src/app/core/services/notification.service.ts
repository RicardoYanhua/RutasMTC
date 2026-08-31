import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  mensaje: string;
  tipo: 'exito' | 'error' | 'info';
}

const DURACION_MS = 4000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private push(mensaje: string, tipo: Toast['tipo']): void {
    const id = Math.random().toString(36).slice(2);
    this._toasts.update((lista) => [...lista, { id, mensaje, tipo }]);
    setTimeout(() => this.cerrar(id), DURACION_MS);
  }

  exito(mensaje: string): void {
    this.push(mensaje, 'exito');
  }

  error(mensaje: string): void {
    this.push(mensaje, 'error');
  }

  info(mensaje: string): void {
    this.push(mensaje, 'info');
  }

  cerrar(id: string): void {
    this._toasts.update((lista) => lista.filter((t) => t.id !== id));
  }
}
