const db = require("../config/database");
const { esPeticionPublica } = require("../middleware/auth.middleware");

/**
 * Servicios ferroviarios: un tren con su horario, su tiempo de tránsito y su
 * tarifa. Dueño del dato: PeruRail.
 *
 * El planificador público exige que el servicio esté activo y publicado, y
 * además que lo estén sus dos estaciones: anunciar un tren que sale de una
 * estación retirada sería un dato falso, no un dato incompleto.
 */

const SELECT_BASE = `
  SELECT s.*, o.est_nombre AS origenNombre, d.est_nombre AS destinoNombre
  FROM est_servicio s
  JOIN est_estacion o ON o.est_id_estacion = s.est_id_estacion_origen
  JOIN est_estacion d ON d.est_id_estacion = s.est_id_estacion_destino
`;

const CONDICION_PUBLICA = `
  s.est_serv_activo = 1 AND s.est_serv_publicado = 1
  AND o.est_activo = 1 AND o.est_publicado = 1
  AND d.est_activo = 1 AND d.est_publicado = 1
`;

const listar = async (req, res) => {
  try {
    const { estacionId } = req.query;
    const condiciones = [];
    const parametros = [];

    if (esPeticionPublica(req)) condiciones.push(CONDICION_PUBLICA);
    if (estacionId) {
      condiciones.push("s.est_id_estacion_origen = ?");
      parametros.push(estacionId);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
    const [filas] = await db.query(`${SELECT_BASE} ${where} ORDER BY s.est_hora_salida ASC`, parametros);
    return res.json({ success: true, mensaje: "Servicios obtenidos", data: filas });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al listar servicios", error: error.message });
  }
};

const devolver = async (id, res, mensaje, codigoHttp = 200) => {
  const [[fila]] = await db.query(`${SELECT_BASE} WHERE s.est_id_servicio = ?`, [id]);
  return res.status(codigoHttp).json({ success: true, mensaje, data: fila });
};

const crear = async (req, res) => {
  try {
    const { estacionOrigenId, estacionDestinoId, nombreServicio, horaSalida, horaRetorno, minutosTransito, precio } = req.body;
    const [resultado] = await db.query(
      `INSERT INTO est_servicio
        (est_id_estacion_origen, est_id_estacion_destino, est_nombre_servicio, est_hora_salida, est_hora_retorno,
         est_minutos_transito, est_precio, est_serv_activo, est_serv_publicado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [estacionOrigenId, estacionDestinoId, nombreServicio, horaSalida, horaRetorno, minutosTransito, precio]
    );
    return devolver(resultado.insertId, res, "Servicio registrado. Queda pendiente de publicación por el MTC.", 201);
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al registrar el servicio", error: error.message });
  }
};

const actualizar = async (req, res) => {
  try {
    const { estacionOrigenId, estacionDestinoId, nombreServicio, horaSalida, horaRetorno, minutosTransito, precio } = req.body;
    const [resultado] = await db.query(
      `UPDATE est_servicio SET
        est_id_estacion_origen = ?, est_id_estacion_destino = ?, est_nombre_servicio = ?,
        est_hora_salida = ?, est_hora_retorno = ?, est_minutos_transito = ?, est_precio = ?
       WHERE est_id_servicio = ?`,
      [estacionOrigenId, estacionDestinoId, nombreServicio, horaSalida, horaRetorno, minutosTransito, precio, req.params.id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, mensaje: "Servicio no encontrado" });
    }
    return devolver(req.params.id, res, "Servicio actualizado");
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al actualizar el servicio", error: error.message });
  }
};

/** Baja y alta lógicas: un servicio de temporada se retira y vuelve, no se borra. */
const cambiarActivo = (activo) => async (req, res) => {
  try {
    const [resultado] = await db.query("UPDATE est_servicio SET est_serv_activo = ? WHERE est_id_servicio = ?", [
      activo ? 1 : 0,
      req.params.id,
    ]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, mensaje: "Servicio no encontrado" });
    }
    return devolver(req.params.id, res, activo ? "Servicio reactivado" : "Servicio dado de baja");
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al cambiar el estado del servicio", error: error.message });
  }
};

/** Publicación: decisión exclusiva del gestor MTC (la ruta lo restringe). */
const cambiarPublicado = async (req, res) => {
  try {
    const publicado = req.body.publicado ? 1 : 0;
    const [[fila]] = await db.query("SELECT est_serv_activo FROM est_servicio WHERE est_id_servicio = ?", [req.params.id]);
    if (!fila) {
      return res.status(404).json({ success: false, mensaje: "Servicio no encontrado" });
    }
    if (publicado && !fila.est_serv_activo) {
      return res.status(409).json({
        success: false,
        mensaje: "No se puede publicar un servicio dado de baja. Pide a PeruRail que lo reactive primero.",
      });
    }
    await db.query("UPDATE est_servicio SET est_serv_publicado = ? WHERE est_id_servicio = ?", [publicado, req.params.id]);
    return devolver(req.params.id, res, publicado ? "Servicio publicado en el sitio" : "Servicio retirado del sitio");
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al cambiar la publicación", error: error.message });
  }
};

module.exports = {
  listar,
  crear,
  actualizar,
  desactivar: cambiarActivo(false),
  reactivar: cambiarActivo(true),
  cambiarPublicado,
};
