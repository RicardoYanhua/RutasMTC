/**
 * Servicios habituales de PeruRail. Son SUGERENCIAS para el formulario (lista
 * de autocompletado), no un dominio cerrado: PeruRail mantiene su propia oferta
 * desde el panel y no puede depender de que alguien edite esta constante para
 * dar de alta un tren nuevo. El backend valida longitud, no pertenencia.
 */
export const SERVICIOS_SUGERIDOS = [
  'Expedition',
  'Vistadome',
  'Vistadome Observatory',
  'Sacred Valley',
  'Hiram Bingham',
  'Titicaca Train',
] as const;

export interface Servicio {
  est_id_servicio: number;
  est_id_estacion_origen: number;
  est_id_estacion_destino: number;
  est_nombre_servicio: string;
  est_hora_salida: string;
  est_hora_retorno: string;
  est_minutos_transito: number;
  est_precio: number;
  est_moneda: string;
  /** Baja lógica marcada por PeruRail. Nada se borra nunca. */
  est_serv_activo: number;
  /** Visibilidad pública, decidida por el gestor MTC. */
  est_serv_publicado: number;
  origenNombre?: string;
  destinoNombre?: string;
}

export interface ServicioForm {
  estacionOrigenId: number | null;
  estacionDestinoId: number | null;
  nombreServicio: string;
  horaSalida: string;
  horaRetorno: string;
  minutosTransito: number | null;
  precio: number | null;
}
