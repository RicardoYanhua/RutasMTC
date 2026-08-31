import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiEnvelope } from '../models/api.model';
import { Informe, InformeRequest } from '../models/informe.model';

@Injectable({ providedIn: 'root' })
export class InformeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/informes`;

  generar(body: InformeRequest) {
    return this.http.post<ApiEnvelope<Informe>>(this.base, body).pipe(map((r) => r.data!));
  }

  obtener(codigo: string) {
    return this.http.get<ApiEnvelope<Informe>>(`${this.base}/${codigo}`).pipe(map((r) => r.data!));
  }
}
