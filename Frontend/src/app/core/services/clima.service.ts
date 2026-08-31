import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiEnvelope } from '../models/api.model';
import { Clima } from '../models/clima.model';

@Injectable({ providedIn: 'root' })
export class ClimaService {
  private readonly http = inject(HttpClient);

  obtener(estacionId: number, fecha?: string) {
    let params = new HttpParams();
    if (fecha) params = params.set('fecha', fecha);
    return this.http
      .get<ApiEnvelope<Clima>>(`${API_BASE_URL}/clima/${estacionId}`, { params })
      .pipe(map((r) => r.data!));
  }
}
