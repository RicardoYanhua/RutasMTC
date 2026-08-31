export interface Estacion {
  est_id_estacion: number;
  est_codigo: string;
  est_nombre: string;
  est_region: string;
  est_altitud_msnm: number;
  est_andenes: number;
  est_latitud: number;
  est_longitud: number;
  est_badge: string | null;
  est_imagen_url: string | null;
  /** Baja lógica marcada por PeruRail. Nada se borra nunca. */
  est_activo: number;
  /** Visibilidad pública, decidida por el gestor MTC. */
  est_publicado: number;
  est_fecha_actualizacion?: string;
  zonasCount?: number;
  serviciosCount?: number;
}

export interface EstacionForm {
  codigo: string;
  nombre: string;
  region: string;
  altitudMsnm: number | null;
  andenes: number | null;
  latitud: number | null;
  longitud: number | null;
  badge: string;
  /** Ruta relativa devuelta por `POST /estaciones/imagen`, o null si no hay foto. */
  imagenUrl: string | null;
}
