import { Categoria, Dificultad } from './preferencias.model';

export interface Hito {
  zon_id_hito: number;
  zon_id_zona: number;
  zon_orden: number;
  zon_hito_titulo: string;
  zon_hito_detalle: string;
}

export interface ZonaTuristica {
  zon_id_zona: number;
  zon_id_estacion: number;
  zon_codigo: string;
  zon_nombre: string;
  zon_categoria: Categoria;
  zon_distancia_km: number;
  zon_minutos_ida_vuelta: number;
  zon_dificultad: Dificultad;
  zon_horario_atencion: string | null;
  zon_ingreso: string | null;
  zon_descripcion: string | null;
  zon_imagen_url: string | null;
  /** Baja lógica marcada por Travel Group. Nada se borra nunca. */
  zon_activo: number;
  /** Visibilidad pública, decidida por el gestor MTC. */
  zon_publicado: number;
  zon_fecha_actualizacion?: string;
  estacionNombre?: string;
  /** Fotografía de la estación de partida: la usa la tarjeta del paso 2. */
  estacionImagenUrl?: string | null;
  hitos?: Hito[];
}

export interface ZonaForm {
  estacionId: number | null;
  nombre: string;
  categoria: Categoria | null;
  distanciaKm: number | null;
  minutosIdaVuelta: number | null;
  dificultad: Dificultad | null;
  horarioAtencion: string;
  ingreso: string;
  descripcion: string;
  /** Ruta relativa devuelta por `POST /zonas/imagen`, o null si no hay foto. */
  imagenUrl: string | null;
}
