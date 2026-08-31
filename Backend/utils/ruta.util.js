const DIFN = { Fácil: 1, Moderada: 2, Exigente: 3 };

const dosDecimales = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const calcularDistanciaTotal = (distanciaKmIda) => dosDecimales(Number(distanciaKmIda) * 2);

const generarFolio = (idInforme) => `INF-${new Date().getFullYear()}-${String(idInforme).padStart(6, "0")}`;

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
  const incremento = pasos.length > 1 ? Number(minutosTotal) / (pasos.length - 1) : 0;
  return pasos.map((paso, i) => ({ ...paso, acumuladoMin: Math.round(incremento * i) }));
}

module.exports = { DIFN, dosDecimales, calcularDistanciaTotal, generarFolio, dificultadCalifica, construirTimeline };
