import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiEnvelope } from '../models/api.model';
import { ZonaForm, ZonaTuristica } from '../models/zona.model';
import { Categoria, Dificultad } from '../models/preferencias.model';

export interface ZonaFiltro {
  estacionId?: number;
  intereses?: Categoria[];
  dificultadMax?: Dificultad;
  minutosMax?: number;
}

@Injectable({ providedIn: 'root' })
export class ZonaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/zonas`;

  listar(filtro: ZonaFiltro = {}) {
    let params = new HttpParams();
    if (filtro.estacionId) params = params.set('estacionId', filtro.estacionId);
    if (filtro.intereses?.length) params = params.set('intereses', filtro.intereses.join(','));
    if (filtro.dificultadMax) params = params.set('dificultadMax', filtro.dificultadMax);
    if (filtro.minutosMax) params = params.set('minutosMax', filtro.minutosMax);
    return this.http.get<ApiEnvelope<ZonaTuristica[]>>(this.base, { params }).pipe(map((r) => r.data ?? []));
  }

  obtener(id: number) {
    return this.http.get<ApiEnvelope<ZonaTuristica>>(`${this.base}/${id}`).pipe(map((r) => r.data!));
  }

  crear(form: ZonaForm) {
    return this.http.post<ApiEnvelope<ZonaTuristica>>(this.base, form).pipe(map((r) => r.data!));
  }

  actualizar(id: number, form: ZonaForm) {
    return this.http.put<ApiEnvelope<ZonaTuristica>>(`${this.base}/${id}`, form).pipe(map((r) => r.data!));
  }

  /**
   * Baja lógica. La API no expone DELETE: un registro retirado conserva su
   * fila, su imagen y sus hitos, así que los informes ya emitidos siguen
   * resolviendo y la zona puede volver sin recapturarla.
   */
  desactivar(id: number) {
    return this.http.patch<ApiEnvelope<ZonaTuristica>>(`${this.base}/${id}/desactivar`, {}).pipe(map((r) => r.data!));
  }

  reactivar(id: number) {
    return this.http.patch<ApiEnvelope<ZonaTuristica>>(`${this.base}/${id}/reactivar`, {}).pipe(map((r) => r.data!));
  }

  /** Publicar o retirar del planificador. Solo el gestor MTC (lo exige la API). */
  publicar(id: number, publicado: boolean) {
    return this.http
      .patch<ApiEnvelope<ZonaTuristica>>(`${this.base}/${id}/publicacion`, { publicado })
      .pipe(map((r) => r.data!));
  }

  /**
   * Sube el archivo y devuelve la ruta relativa con la que quedará guardado
   * (`/uploads/<archivo>`). Es un paso aparte de `crear`/`actualizar`: el
   * operador puede cambiar de imagen varias veces antes de confirmar el
   * formulario, y solo la última ruta llega a la base de datos.
   */
  subirImagen(archivo: File) {
    const cuerpo = new FormData();
    cuerpo.append('imagen', archivo);
    return this.http
      .post<ApiEnvelope<{ url: string; bytes: number }>>(`${this.base}/imagen`, cuerpo)
      .pipe(map((r) => r.data!.url));
  }
}
