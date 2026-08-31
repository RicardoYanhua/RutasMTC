import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiEnvelope } from '../models/api.model';
import {
  AdminUsuario,
  CuentaDemo,
  LoginRequest,
  LoginResponse,
  ModuloPanel,
  PERMISOS,
  RolPanel,
} from '../models/auth.model';

const TOKEN_KEY = 'rt_token';
const USER_KEY = 'rt_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _usuario = signal<AdminUsuario | null>(this.leerUsuario());
  readonly usuario = this._usuario.asReadonly();
  readonly estaAutenticado = computed(() => this._usuario() !== null && this.tokenVigente());
  readonly rol = computed<RolPanel | null>(() => this._usuario()?.rol ?? null);

  login(credenciales: LoginRequest) {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/auth/login`, credenciales).pipe(
      tap((res) => {
        if (res.success && res.token) {
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
          this._usuario.set(res.usuario);
        }
      }),
    );
  }

  /** Atajos de acceso por rol que ofrece la pantalla de login en el entorno de prueba. */
  cuentasDemo() {
    return this.http
      .get<ApiEnvelope<CuentaDemo[]>>(`${API_BASE_URL}/auth/cuentas-demo`)
      .pipe(map((r) => r.data ?? []));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._usuario.set(null);
    this.router.navigateByUrl('/admin/login');
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** ¿El rol activo tiene este módulo en su menú? */
  ve(modulo: ModuloPanel): boolean {
    const rol = this.rol();
    return rol ? (PERMISOS[rol]?.ve.includes(modulo) ?? false) : false;
  }

  /**
   * ¿El rol activo puede escribir en este módulo? Travel Group ve estaciones
   * pero no las edita: entra en modo consulta, que es exactamente lo que pide
   * el caso para poder vincular sus zonas.
   */
  edita(modulo: ModuloPanel): boolean {
    const rol = this.rol();
    return rol ? (PERMISOS[rol]?.edita.includes(modulo) ?? false) : false;
  }

  /** Primera pantalla tras entrar: la del módulo que el rol realmente gestiona. */
  rutaInicial(): string {
    switch (this.rol()) {
      case 'perurail':
        return '/admin/estaciones';
      case 'mtc':
        return '/admin/publicacion';
      case 'travelgroup':
      default:
        return '/admin/zonas';
    }
  }

  /**
   * Recupera la sesión guardada, descartándola si su rol no es uno de los tres
   * actuales.
   *
   * Hace falta porque el rol del panel cambió: una sesión anterior guardaba
   * `rol: 'administrador'`, que ya no existe en el mapa de permisos. Sin esta
   * comprobación, el panel arrancaba con un rol desconocido y reventaba al
   * construir el menú. Ante la duda se cierra la sesión: volver a entrar cuesta
   * un segundo, y así el token viejo tampoco sobrevive a un cambio de modelo.
   */
  private leerUsuario(): AdminUsuario | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      const usuario = JSON.parse(raw) as AdminUsuario;
      if (!usuario?.rol || !PERMISOS[usuario.rol]) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
      }
      return usuario;
    } catch {
      return null;
    }
  }

  private tokenVigente(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      return !payload.exp || payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
