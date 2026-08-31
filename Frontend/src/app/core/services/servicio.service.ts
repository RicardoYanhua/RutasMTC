import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiEnvelope } from '../models/api.model';
import { Servicio, ServicioForm } from '../models/servicio.model';

@Injectable({ providedIn: 'root' })
export class ServicioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/servicios`;

  listar(estacionId?: number) {
    let params = new HttpParams();
    if (estacionId) params = params.set('estacionId', estacionId);
    return this.http.get<ApiEnvelope<Servicio[]>>(this.base, { params }).pipe(map((r) => r.data ?? []));
  }

  crear(form: ServicioForm) {
    return this.http.post<ApiEnvelope<Servicio>>(this.base, form).pipe(map((r) => r.data!));
  }

  actualizar(id: number, form: ServicioForm) {
    return this.http.put<ApiEnvelope<Servicio>>(`${this.base}/${id}`, form).pipe(map((r) => r.data!));
  }

  /** Baja lógica: un servicio de temporada se retira y vuelve, no se borra. */
  desactivar(id: number) {
    return this.http.patch<ApiEnvelope<Servicio>>(`${this.base}/${id}/desactivar`, {}).pipe(map((r) => r.data!));
  }

  reactivar(id: number) {
    return this.http.patch<ApiEnvelope<Servicio>>(`${this.base}/${id}/reactivar`, {}).pipe(map((r) => r.data!));
  }

  /** Publicar o retirar del sitio. Solo el gestor MTC (lo exige la API). */
  publicar(id: number, publicado: boolean) {
    return this.http
      .patch<ApiEnvelope<Servicio>>(`${this.base}/${id}/publicacion`, { publicado })
      .pipe(map((r) => r.data!));
  }
}
