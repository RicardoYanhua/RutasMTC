const db = require("../config/database");
const { sincronizarEstacion } = require("../services/openMeteo.service");

const hoyISO = () => new Date().toISOString().slice(0, 10);

const obtener = async (req, res) => {
  try {
    const estacionId = req.params.estacionId;
    const fecha = req.query.fecha || hoyISO();

    const [[estacion]] = await db.query("SELECT * FROM est_estacion WHERE est_id_estacion = ?", [estacionId]);
    if (!estacion) {
      return res.status(404).json({ success: false, mensaje: "Estación no encontrada" });
    }

    const [[cache]] = await db.query(
      "SELECT * FROM cli_prevision WHERE est_id_estacion = ? AND cli_fecha = ?",
      [estacionId, fecha]
    );
    if (cache) {
      return res.json({ success: true, mensaje: "Previsión obtenida de la caché", data: cache });
    }

    const fila = await sincronizarEstacion(estacion, fecha);
    return res.json({ success: true, mensaje: "Previsión sincronizada desde Open-Meteo", data: fila });
  } catch (error) {
    return res.status(502).json({ success: false, mensaje: "No se pudo obtener el pronóstico del clima", error: error.message });
  }
};

module.exports = { obtener };
