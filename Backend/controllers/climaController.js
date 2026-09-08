const db = require("../config/database");
const { sincronizarEstacion } = require("../services/openMeteo.service");

/**
 * Clima por estación. Fuente del caso: SENAMHI, consumido a través de la API
 * pública de Open-Meteo (ver services/openMeteo.service.js).
 *
 * La previsión se guarda por (estación, día) en `cli_prevision` y se sirve desde
 * ahí. Un pronóstico diario no cambia de un minuto a otro, y así una jornada con
 * muchas consultas no se traduce en muchas llamadas a la API externa.
 */

/** Fecha de hoy en AAAA-MM-DD, que es como se indexa `cli_prevision`. */
const hoyISO = () => new Date().toISOString().slice(0, 10);

/**
 * GET /api/clima/:estacionId?fecha=AAAA-MM-DD
 *
 * Endpoint público: lo consulta el planificador para avisar al turista qué llevar,
 * antes incluso de emitir el informe. Sin `fecha` se entiende hoy.
 */
const obtener = async (req, res) => {
  try {
    const estacionId = req.params.estacionId;
    const fecha = req.query.fecha || hoyISO();

    const [[estacion]] = await db.query("SELECT * FROM est_estacion WHERE est_id_estacion = ?", [estacionId]);
    if (!estacion) {
      return res.status(404).json({ success: false, mensaje: "Estación no encontrada" });
    }

    // Caché del día: si esa estación y esa fecha ya se consultaron, se responde con
    // lo guardado y no se toca la API externa.
    const [[cache]] = await db.query(
      "SELECT * FROM cli_prevision WHERE est_id_estacion = ? AND cli_fecha = ?",
      [estacionId, fecha]
    );
    if (cache) {
      return res.json({ success: true, mensaje: "Previsión obtenida de la caché", data: cache });
    }

    // Primera consulta del día para esa estación: se trae de Open-Meteo y se guarda.
    // Normalmente el cron de jobs/clima.cron.js ya lo hizo a las 05:00.
    const fila = await sincronizarEstacion(estacion, fecha);
    return res.json({ success: true, mensaje: "Previsión sincronizada desde Open-Meteo", data: fila });
  } catch (error) {
    // 502 y no 500: lo que suele fallar aquí es la API externa, no esta API. El
    // frontend lo distingue para mostrar la ruta sin la tarjeta de clima.
    return res.status(502).json({ success: false, mensaje: "No se pudo obtener el pronóstico del clima", error: error.message });
  }
};

module.exports = { obtener };
