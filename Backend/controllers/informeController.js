const db = require("../config/database");
const { calcularDistanciaTotal, generarFolio, construirTimeline } = require("../utils/ruta.util");
const { sincronizarEstacion } = require("../services/openMeteo.service");

async function obtenerHitos(zonaId) {
  const [hitos] = await db.query(
    "SELECT * FROM zon_hito WHERE zon_id_zona = ? ORDER BY zon_orden ASC",
    [zonaId]
  );
  return hitos;
}

async function obtenerServicioPrincipal(estacionId) {
  const [[servicio]] = await db.query(
    `SELECT s.*, o.est_nombre AS origenNombre, d.est_nombre AS destinoNombre
     FROM est_servicio s
     JOIN est_estacion o ON o.est_id_estacion = s.est_id_estacion_origen
     JOIN est_estacion d ON d.est_id_estacion = s.est_id_estacion_destino
     WHERE s.est_id_estacion_origen = ? AND s.est_serv_activo = 1 AND s.est_serv_publicado = 1
     ORDER BY s.est_hora_salida ASC LIMIT 1`,
    [estacionId]
  );
  return servicio || null;
}

async function obtenerClima(estacion, fecha) {
  const [[cache]] = await db.query(
    "SELECT * FROM cli_prevision WHERE est_id_estacion = ? AND cli_fecha = ?",
    [estacion.est_id_estacion, fecha]
  );
  if (cache) return cache;
  try {
    return await sincronizarEstacion(estacion, fecha);
  } catch {
    return null;
  }
}

/** Arma el payload completo de un informe (encabezado + 5 secciones) a partir de la fila persistida. */
async function armarPayload(informe) {
  const [[estacion]] = await db.query("SELECT * FROM est_estacion WHERE est_id_estacion = ?", [informe.est_id_estacion]);
  const [[zona]] = await db.query("SELECT * FROM zon_zona_turistica WHERE zon_id_zona = ?", [informe.zon_id_zona]);
  const hitos = await obtenerHitos(informe.zon_id_zona);
  const servicio = await obtenerServicioPrincipal(informe.est_id_estacion);
  const clima = await obtenerClima(estacion, informe.rut_fecha_viaje);
  const timeline = construirTimeline({
    estacionNombre: estacion.est_nombre,
    zonaNombre: zona.zon_nombre,
    minutosTotal: informe.rut_tiempo_total_min,
    hitos,
  });

  return {
    codigo: informe.rut_codigo,
    emitido: informe.rut_fecha_generacion,
    fechaViaje: informe.rut_fecha_viaje,
    preferencias: {
      intereses: informe.rut_intereses.split(",").filter(Boolean),
      dificultadMax: informe.rut_dificultad_max,
      minutosMax: informe.rut_minutos_max,
    },
    estacion,
    zona: { ...zona, hitos },
    servicio,
    clima,
    ruta: {
      distanciaTotalKm: informe.rut_distancia_total_km,
      tiempoTotalMin: informe.rut_tiempo_total_min,
      dificultadResultado: informe.rut_dificultad_resultado,
      timeline,
    },
  };
}

const crear = async (req, res) => {
  try {
    const { estacionId, zonaId, intereses, dificultadMax, minutosMax, fecha } = req.body;

    // Se exige catálogo VISIBLE, no solo existente: si no, bastaría con adivinar
    // un id para emitir un informe sobre una zona dada de baja o aún sin
    // publicar por el MTC.
    const [[estacion]] = await db.query(
      "SELECT * FROM est_estacion WHERE est_id_estacion = ? AND est_activo = 1 AND est_publicado = 1",
      [estacionId]
    );
    if (!estacion) {
      return res.status(404).json({ success: false, mensaje: "La estación no está disponible en el sistema" });
    }
    const [[zona]] = await db.query(
      "SELECT * FROM zon_zona_turistica WHERE zon_id_zona = ? AND zon_activo = 1 AND zon_publicado = 1",
      [zonaId]
    );
    if (!zona) {
      return res.status(404).json({ success: false, mensaje: "La zona turística no está disponible en el sistema" });
    }
    if (zona.zon_id_estacion !== estacion.est_id_estacion) {
      return res.status(400).json({ success: false, mensaje: "La zona turística no corresponde a la estación seleccionada" });
    }

    const distanciaTotalKm = calcularDistanciaTotal(zona.zon_distancia_km);
    const tiempoTotalMin = zona.zon_minutos_ida_vuelta;

    const [insercion] = await db.query(
      `INSERT INTO rut_informe
        (rut_codigo, est_id_estacion, zon_id_zona, rut_intereses, rut_dificultad_max, rut_minutos_max, rut_fecha_viaje, rut_distancia_total_km, rut_tiempo_total_min, rut_dificultad_resultado)
       VALUES (CONCAT('TMP-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 100000)), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [estacionId, zonaId, intereses.join(","), dificultadMax, minutosMax, fecha, distanciaTotalKm, tiempoTotalMin, zona.zon_dificultad]
    );
    const codigo = generarFolio(insercion.insertId);
    await db.query("UPDATE rut_informe SET rut_codigo = ? WHERE rut_id_informe = ?", [codigo, insercion.insertId]);

    const [[informe]] = await db.query("SELECT * FROM rut_informe WHERE rut_id_informe = ?", [insercion.insertId]);
    const payload = await armarPayload(informe);
    return res.status(201).json({ success: true, mensaje: "Informe turístico generado", data: payload });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al generar el informe turístico", error: error.message });
  }
};

const obtener = async (req, res) => {
  try {
    const [[informe]] = await db.query("SELECT * FROM rut_informe WHERE rut_codigo = ?", [req.params.codigo]);
    if (!informe) {
      return res.status(404).json({ success: false, mensaje: "Informe no encontrado" });
    }
    const payload = await armarPayload(informe);
    return res.json({ success: true, mensaje: "Informe obtenido", data: payload });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al obtener el informe", error: error.message });
  }
};

module.exports = { crear, obtener };
