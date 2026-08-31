import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiEnvelope } from '../models/api.model';
import { Estacion, EstacionForm } from '../models/estacion.model';

/**
 * Estaciones ferroviarias. Dueño del dato: PeruRail.
 *
 * `listar()` devuelve dos catálogos distintos según quién pregunte, y no hay
 * que pedirlo: sin sesión la API responde solo lo activo y publicado; con
 * sesión de panel responde todo, incluidas las bajas y lo pendiente de
 * publicar. El interceptor de autenticación adjunta el token cuando lo hay.
 */
@Injectable({ providedIn: 'root' })
export class EstacionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/estaciones`;

  listar() {
    return this.http.get<ApiEnvelope<Estacion[]>>(this.base).pipe(map((r) => r.data ?? []));
  }

  obtener(id: number) {
    return this.http.get<ApiEnvelope<Estacion>>(`${this.base}/${id}`).pipe(map((r) => r.data!));
  }

  crear(form: EstacionForm) {
    return this.http.post<ApiEnvelope<Estacion>>(this.base, form).pipe(map((r) => r.data!));
  }

  actualizar(id: number, form: EstacionForm) {
    return this.http.put<ApiEnvelope<Estacion>>(`${this.base}/${id}`, form).pipe(map((r) => r.data!));
  }

  /** Baja lógica: la API no expone DELETE. */
  desactivar(id: number) {
    return this.http.patch<ApiEnvelope<Estacion>>(`${this.base}/${id}/desactivar`, {}).pipe(map((r) => r.data!));
  }

  reactivar(id: number) {
    return this.http.patch<ApiEnvelope<Estacion>>(`${this.base}/${id}/reactivar`, {}).pipe(map((r) => r.data!));
  }

  /** Publicar o retirar del sitio. Solo el gestor MTC (lo exige la API). */
  publicar(id: number, publicado: boolean) {
    return this.http
      .patch<ApiEnvelope<Estacion>>(`${this.base}/${id}/publicacion`, { publicado })
      .pipe(map((r) => r.data!));
  }

  /** Sube la fotografía de la estación y devuelve su ruta `/uploads/<archivo>`. */
  subirImagen(archivo: File) {
    const cuerpo = new FormData();
    cuerpo.append('imagen', archivo);
    return this.http
      .post<ApiEnvelope<{ url: string; bytes: number }>>(`${this.base}/imagen`, cuerpo)
      .pipe(map((r) => r.data!.url));
  }
}
