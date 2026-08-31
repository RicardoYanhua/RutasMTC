export interface Clima {
  cli_id_prevision: number;
  est_id_estacion: number;
  cli_fecha: string;
  cli_temp: number;
  cli_condicion: string;
  cli_sensacion: number;
  cli_prob_lluvia: number;
  cli_viento_kmh: number;
  cli_uv_indice: number;
  cli_aviso: string;
  cli_fuente: string;
}
