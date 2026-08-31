import { Categoria, Dificultad } from './preferencias.model';
import { Estacion } from './estacion.model';
import { ZonaTuristica } from './zona.model';
import { Servicio } from './servicio.model';
import { Clima } from './clima.model';

export interface InformeRequest {
  estacionId: number;
  zonaId: number;
  intereses: Categoria[];
  dificultadMax: Dificultad;
  minutosMax: number;
  fecha: string;
}

export interface TimelinePaso {
  tipo: 'salida' | 'hito_ida' | 'destino' | 'hito_vuelta' | 'retorno';
  titulo: string;
  detalle: string;
  acumuladoMin: number;
}

export interface Informe {
  codigo: string;
  emitido: string;
  fechaViaje: string;
  preferencias: { intereses: Categoria[]; dificultadMax: Dificultad; minutosMax: number };
  estacion: Estacion;
  zona: ZonaTuristica;
  servicio: Servicio | null;
  clima: Clima | null;
  ruta: {
    distanciaTotalKm: number;
    tiempoTotalMin: number;
    dificultadResultado: Dificultad;
    timeline: TimelinePaso[];
  };
}
