const db = require("../config/database");

const OPEN_METEO_URL = process.env.OPEN_METEO_URL || "https://api.open-meteo.com/v1/forecast";

// Códigos de tiempo WMO (Open-Meteo) traducidos a español.
const CONDICIONES = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna moderada",
  55: "Llovizna intensa",
  61: "Lluvia ligera",
  63: "Lluvia moderada",
  65: "Lluvia intensa",
  71: "Nevada ligera",
  73: "Nevada moderada",
  75: "Nevada intensa",
  80: "Chubascos ligeros",
  81: "Chubascos moderados",
  82: "Chubascos intensos",
  95: "Tormenta eléctrica",
};

const condicionDeCodigo = (codigo) => CONDICIONES[codigo] || "Variable";

function calcularAviso({ probLluvia, uvIndice, vientoKmh }) {
  if (probLluvia >= 50) return "Lleva ropa impermeable: alta probabilidad de lluvia durante el recorrido.";
  if (uvIndice >= 8) return "Usa protector solar y sombrero: índice UV muy alto en la zona.";
  if (vientoKmh >= 30) return "Lleva rompevientos: se esperan vientos fuertes.";
  return "Condiciones favorables para caminar.";
}

/**
 * Consulta el pronóstico diario de Open-Meteo (gratuito, sin API key) para
 * una estación y devuelve el arreglo de días disponibles (hasta 16).
 */
async function consultarPronostico(latitud, longitud) {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", latitud);
  url.searchParams.set("longitude", longitud);
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,windspeed_10m_max,uv_index_max,weathercode"
  );
  url.searchParams.set("timezone", "America/Lima");
  url.searchParams.set("forecast_days", "16");

  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`Open-Meteo respondió con estado ${respuesta.status}`);
  }
  const datos = await respuesta.json();
  return datos.daily;
}

function diaParaFecha(daily, fechaISO) {
  const indice = daily.time.indexOf(fechaISO);
  const i = indice >= 0 ? indice : daily.time.length - 1; // si excede el rango, usa el último disponible
  return {
    fecha: daily.time[i],
    esAproximado: indice < 0,
    temp: daily.temperature_2m_max[i],
    sensacion: daily.apparent_temperature_max[i],
    probLluvia: daily.precipitation_probability_max[i],
    vientoKmh: daily.windspeed_10m_max[i],
    uvIndice: daily.uv_index_max[i],
    condicion: condicionDeCodigo(daily.weathercode[i]),
  };
}

/**
 * Sincroniza (upsert) la previsión de una estación para una fecha puntual
 * y devuelve la fila resultante. Se usa tanto en la consulta bajo demanda
 * del turista como en la sincronización manual del panel admin.
 */
async function sincronizarEstacion(estacion, fechaISO) {
  const daily = await consultarPronostico(estacion.est_latitud, estacion.est_longitud);
  const dia = diaParaFecha(daily, fechaISO);
  const aviso = calcularAviso(dia) + (dia.esAproximado ? " (pronóstico aproximado, fuera del rango de 16 días)." : "");

  await db.query(
    `INSERT INTO cli_prevision
       (est_id_estacion, cli_fecha, cli_temp, cli_condicion, cli_sensacion, cli_prob_lluvia, cli_viento_kmh, cli_uv_indice, cli_aviso, cli_fuente)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open-Meteo')
     ON DUPLICATE KEY UPDATE
       cli_temp = VALUES(cli_temp), cli_condicion = VALUES(cli_condicion), cli_sensacion = VALUES(cli_sensacion),
       cli_prob_lluvia = VALUES(cli_prob_lluvia), cli_viento_kmh = VALUES(cli_viento_kmh),
       cli_uv_indice = VALUES(cli_uv_indice), cli_aviso = VALUES(cli_aviso), cli_fecha_actualizacion = CURRENT_TIMESTAMP`,
    [estacion.est_id_estacion, dia.fecha, dia.temp, dia.condicion, dia.sensacion, dia.probLluvia, dia.vientoKmh, dia.uvIndice, aviso]
  );

  const [[fila]] = await db.query(
    "SELECT * FROM cli_prevision WHERE est_id_estacion = ? AND cli_fecha = ?",
    [estacion.est_id_estacion, dia.fecha]
  );
  return fila;
}

async function sincronizarTodas(fechaISO) {
  const [estaciones] = await db.query("SELECT * FROM est_estacion");
  const resultados = [];
  for (const estacion of estaciones) {
    try {
      const fila = await sincronizarEstacion(estacion, fechaISO);
      resultados.push({ estacion: estacion.est_nombre, ok: true, fila });
    } catch (error) {
      resultados.push({ estacion: estacion.est_nombre, ok: false, error: error.message });
    }
  }
  return resultados;
}

module.exports = { sincronizarEstacion, sincronizarTodas };
