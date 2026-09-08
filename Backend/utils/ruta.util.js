/**
 * Cálculos de la ruta peatonal, aislados del controlador para que la regla —cómo
 * se mide el recorrido y cómo se numera el informe— se lea de un vistazo y pueda
 * probarse sin levantar la API.
 */

/**
 * Escala ordinal de la dificultad: convierte las etiquetas que guarda la base en
 * números comparables, que es lo que permite entender "hasta Moderada" como un
 * techo que incluye a Fácil.
 */
const DIFN = { Fácil: 1, Moderada: 2, Exigente: 3 };

/** Redondeo a dos decimales; EPSILON evita los 1.005 -> 1.00 del punto flotante. */
const dosDecimales = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** La zona registra los km de IDA; lo que se informa al turista es ida y vuelta. */
const calcularDistanciaTotal = (distanciaKmIda) => dosDecimales(Number(distanciaKmIda) * 2);

/**
 * Folio del informe: INF-AAAA-NNNNNN sobre el id autoincremental. Único por
 * construcción, ordenable y corto de dictar por teléfono o copiar del papel.
 */
const generarFolio = (idInforme) => `INF-${new Date().getFullYear()}-${String(idInforme).padStart(6, "0")}`;

/**
 * ¿La zona cabe dentro del máximo que aceptó el turista? Es la versión en JS del
 * filtro que zonaController aplica en SQL, para comprobar una zona ya cargada sin
 * volver a consultar.
 */
const dificultadCalifica = (dificultadZona, dificultadMax) =>
  DIFN[dificultadZona] <= DIFN[dificultadMax];

/**
 * Arma la línea de tiempo del recorrido a pie de ida y vuelta: Salida ->
 * hitos de ida -> Destino -> hitos de vuelta (orden inverso) -> Retorno.
 * El tiempo acumulado se reparte proporcionalmente entre los tramos.
 */
function construirTimeline({ estacionNombre, zonaNombre, minutosTotal, hitos }) {
  const pasos = [
    { tipo: "salida", titulo: "Salida del andén", detalle: `Estación ${estacionNombre}` },
    ...hitos.map((h) => ({ tipo: "hito_ida", titulo: h.zon_hito_titulo, detalle: h.zon_hito_detalle })),
    { tipo: "destino", titulo: zonaNombre, detalle: "Llegada a la zona turística" },
    ...[...hitos].reverse().map((h) => ({ tipo: "hito_vuelta", titulo: h.zon_hito_titulo, detalle: h.zon_hito_detalle })),
    { tipo: "retorno", titulo: "Retorno al andén", detalle: `Estación ${estacionNombre}` },
  ];
  // No hay tiempos medidos tramo a tramo, solo el total del recorrido: se reparte a
  // partes iguales entre los pasos para dar una referencia de avance. El primer
  // paso queda en 0 y el último cae exactamente en el total.
  const incremento = pasos.length > 1 ? Number(minutosTotal) / (pasos.length - 1) : 0;
  return pasos.map((paso, i) => ({ ...paso, acumuladoMin: Math.round(incremento * i) }));
}

module.exports = { DIFN, dosDecimales, calcularDistanciaTotal, generarFolio, dificultadCalifica, construirTimeline };
