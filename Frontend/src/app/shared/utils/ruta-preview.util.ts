import { Hito } from '../../core/models/zona.model';

export interface TimelinePasoPreview {
  tipo: 'salida' | 'hito_ida' | 'destino' | 'hito_vuelta' | 'retorno';
  titulo: string;
  detalle: string;
  acumuladoMin: number;
}

/**
 * Réplica en el cliente de utils/ruta.util.js del backend: permite previsualizar
 * el recorrido en la pantalla "Ruta" sin persistir el informe todavía (eso
 * solo ocurre al presionar "Generar informe turístico").
 */
export function construirTimelinePreview(
  estacionNombre: string,
  zonaNombre: string,
  minutosTotal: number,
  hitos: Hito[]
): TimelinePasoPreview[] {
  const pasos: Omit<TimelinePasoPreview, 'acumuladoMin'>[] = [
    { tipo: 'salida', titulo: 'Salida del andén', detalle: `Estación ${estacionNombre}` },
    ...hitos.map((h) => ({ tipo: 'hito_ida' as const, titulo: h.zon_hito_titulo, detalle: h.zon_hito_detalle })),
    { tipo: 'destino', titulo: zonaNombre, detalle: 'Llegada a la zona turística' },
    ...[...hitos].reverse().map((h) => ({ tipo: 'hito_vuelta' as const, titulo: h.zon_hito_titulo, detalle: h.zon_hito_detalle })),
    { tipo: 'retorno', titulo: 'Retorno al andén', detalle: `Estación ${estacionNombre}` },
  ];
  const incremento = pasos.length > 1 ? minutosTotal / (pasos.length - 1) : 0;
  return pasos.map((paso, i) => ({ ...paso, acumuladoMin: Math.round(incremento * i) }));
}
