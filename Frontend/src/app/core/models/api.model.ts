export interface ApiEnvelope<T> {
  success: boolean;
  mensaje: string;
  data?: T;
  errores?: { campo: string; mensaje: string }[];
  error?: string;
}
