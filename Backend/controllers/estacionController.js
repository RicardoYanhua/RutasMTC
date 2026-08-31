const db = require("../config/database");
const { esPeticionPublica } = require("../middleware/auth.middleware");
const { borrarImagen } = require("../middleware/upload.middleware");

/**
 * Estaciones ferroviarias. Dueño del dato: PeruRail.
 *
 * Travel Group las consulta en solo lectura para vincular sus zonas, y el
 * gestor MTC decide cuáles se publican al ciudadano. Nada se borra: la baja es
 * lógica (`est_activo`), de modo que los informes ya emitidos siguen
 * resolviendo su clave foránea.
 */

const SELECT_BASE = `
  SELECT e.*,
    (SELECT COUNT(*) FROM zon_zona_turistica z
      WHERE z.zon_id_estacion = e.est_id_estacion AND z.zon_activo = 1) AS zonasCount,
    (SELECT COUNT(*) FROM est_servicio s
      WHERE s.est_id_estacion_origen = e.est_id_estacion AND s.est_serv_activo = 1) AS serviciosCount
  FROM est_estacion e
`;

/**
 * El ciudadano solo ve lo activo y publicado. El operador autenticado ve todo
 * el catálogo, porque necesita encontrar precisamente lo que está de baja o
 * pendiente para poder reactivarlo o publicarlo.
 */
const filtroVisibilidad = (req) =>
  esPeticionPublica(req) ? "WHERE e.est_activo = 1 AND e.est_publicado = 1" : "";

const listar = async (req, res) => {
  try {
    const [filas] = await db.query(`${SELECT_BASE} ${filtroVisibilidad(req)} ORDER BY e.est_nombre ASC`);
    return res.json({ success: true, mensaje: "Estaciones obtenidas", data: filas });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al listar estaciones", error: error.message });
  }
};

const obtener = async (req, res) => {
  try {
    const [[fila]] = await db.query(`${SELECT_BASE} WHERE e.est_id_estacion = ?`, [req.params.id]);
    if (!fila) {
      return res.status(404).json({ success: false, mensaje: "Estación no encontrada" });
    }
    if (esPeticionPublica(req) && (!fila.est_activo || !fila.est_publicado)) {
      return res.status(404).json({ success: false, mensaje: "Estación no encontrada" });
    }
    return res.json({ success: true, mensaje: "Estación obtenida", data: fila });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al obtener la estación", error: error.message });
  }
};

const devolver = async (id, res, mensaje, codigo = 200) => {
  const [[fila]] = await db.query(`${SELECT_BASE} WHERE e.est_id_estacion = ?`, [id]);
  return res.status(codigo).json({ success: true, mensaje, data: fila });
};

const crear = async (req, res) => {
  try {
    const { codigo, nombre, region, altitudMsnm, andenes, latitud, longitud, badge, imagenUrl } = req.body;
    const [resultado] = await db.query(
      `INSERT INTO est_estacion
        (est_codigo, est_nombre, est_region, est_altitud_msnm, est_andenes, est_latitud, est_longitud, est_badge, est_imagen_url, est_activo, est_publicado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        codigo.toUpperCase(),
        nombre,
        region,
        altitudMsnm,
        andenes,
        latitud,
        longitud,
        badge || null,
        imagenUrl || null,
      ]
    );
    // Nace despublicada: el gestor MTC es quien la habilita para el sitio.
    return devolver(resultado.insertId, res, "Estación registrada. Queda pendiente de publicación por el MTC.", 201);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, mensaje: "Ya existe una estación con ese código" });
    }
    return res.status(500).json({ success: false, mensaje: "Error al registrar la estación", error: error.message });
  }
};

const actualizar = async (req, res) => {
  try {
    const { codigo, nombre, region, altitudMsnm, andenes, latitud, longitud, badge, imagenUrl } = req.body;
    const nuevaImagen = imagenUrl || null;

    // Se lee la imagen previa antes de escribir: si el operador la sustituye o
    // la quita, el archivo huérfano se borra del disco tras el UPDATE.
    const [[anterior]] = await db.query("SELECT est_imagen_url FROM est_estacion WHERE est_id_estacion = ?", [
      req.params.id,
    ]);
    if (!anterior) {
      return res.status(404).json({ success: false, mensaje: "Estación no encontrada" });
    }

    await db.query(
      `UPDATE est_estacion SET
        est_codigo = ?, est_nombre = ?, est_region = ?, est_altitud_msnm = ?, est_andenes = ?,
        est_latitud = ?, est_longitud = ?, est_badge = ?, est_imagen_url = ?
       WHERE est_id_estacion = ?`,
      [
        codigo.toUpperCase(),
        nombre,
        region,
        altitudMsnm,
        andenes,
        latitud,
        longitud,
        badge || null,
        nuevaImagen,
        req.params.id,
      ]
    );

    if (anterior.est_imagen_url && anterior.est_imagen_url !== nuevaImagen) {
      borrarImagen(anterior.est_imagen_url);
    }
    return devolver(req.params.id, res, "Estación actualizada");
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, mensaje: "Ya existe otra estación con ese código" });
    }
    return res.status(500).json({ success: false, mensaje: "Error al actualizar la estación", error: error.message });
  }
};

/**
 * Baja y alta lógicas. Dar de baja una estación la retira también del sitio
 * público (el filtro exige activo Y publicado), pero conserva la fila, su
 * imagen y sus zonas asociadas para poder revertirlo.
 */
const cambiarActivo = (activo) => async (req, res) => {
  try {
    const [resultado] = await db.query("UPDATE est_estacion SET est_activo = ? WHERE est_id_estacion = ?", [
      activo ? 1 : 0,
      req.params.id,
    ]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, mensaje: "Estación no encontrada" });
    }
    return devolver(req.params.id, res, activo ? "Estación reactivada" : "Estación dada de baja");
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al cambiar el estado de la estación", error: error.message });
  }
};

/** Publicación: decisión exclusiva del gestor MTC (la ruta lo restringe). */
const cambiarPublicado = async (req, res) => {
  try {
    const publicado = req.body.publicado ? 1 : 0;
    const [[fila]] = await db.query("SELECT est_activo FROM est_estacion WHERE est_id_estacion = ?", [req.params.id]);
    if (!fila) {
      return res.status(404).json({ success: false, mensaje: "Estación no encontrada" });
    }
    if (publicado && !fila.est_activo) {
      return res.status(409).json({
        success: false,
        mensaje: "No se puede publicar una estación dada de baja. Pide a PeruRail que la reactive primero.",
      });
    }
    await db.query("UPDATE est_estacion SET est_publicado = ? WHERE est_id_estacion = ?", [publicado, req.params.id]);
    return devolver(req.params.id, res, publicado ? "Estación publicada en el sitio" : "Estación retirada del sitio");
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al cambiar la publicación", error: error.message });
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  desactivar: cambiarActivo(false),
  reactivar: cambiarActivo(true),
  cambiarPublicado,
};
