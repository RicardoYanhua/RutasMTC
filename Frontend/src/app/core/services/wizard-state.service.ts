import { Injectable, computed, signal } from '@angular/core';
import { Categoria, Dificultad } from '../models/preferencias.model';
import { Estacion } from '../models/estacion.model';
import { ZonaTuristica } from '../models/zona.model';

function mananaISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Estado compartido del asesor de rutas (Preferencias → Estación → Alternativas → Ruta → Informe). */
@Injectable({ providedIn: 'root' })
export class WizardStateService {
  readonly intereses = signal<Categoria[]>([]);
  readonly dificultadMax = signal<Dificultad>('Moderada');
  readonly minutosMax = signal<number>(120);
  readonly fecha = signal<string>(mananaISO());

  readonly estacion = signal<Estacion | null>(null);
  readonly zona = signal<ZonaTuristica | null>(null);

  readonly preferenciasCompletas = computed(() => this.intereses().length > 0 && !!this.fecha());
  readonly estacionSeleccionada = computed(() => this.estacion() !== null);
  readonly zonaSeleccionada = computed(() => this.zona() !== null);

  alternarInteres(categoria: Categoria): void {
    this.intereses.update((lista) =>
      lista.includes(categoria) ? lista.filter((c) => c !== categoria) : [...lista, categoria]
    );
  }

  seleccionarEstacion(estacion: Estacion): void {
    if (this.estacion()?.est_id_estacion !== estacion.est_id_estacion) {
      this.zona.set(null);
    }
    this.estacion.set(estacion);
  }

  seleccionarZona(zona: ZonaTuristica): void {
    this.zona.set(zona);
  }

  reiniciar(): void {
    this.intereses.set([]);
    this.dificultadMax.set('Moderada');
    this.minutosMax.set(120);
    this.fecha.set(mananaISO());
    this.estacion.set(null);
    this.zona.set(null);
  }
}
