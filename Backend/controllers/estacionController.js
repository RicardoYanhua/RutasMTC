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

/**
 * Consulta base del módulo. Los dos subconteos son los que el panel muestra en
 * cada tarjeta; cuentan solo filas activas, para que dar de baja una zona o un
 * servicio se refleje enseguida en el número de su estación.
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

/**
 * GET /api/estaciones — catálogo, ordenado por nombre.
 *
 * Sirve a dos consumidores con una sola consulta: el planificador del ciudadano y
 * la tabla del panel. Lo que cambia entre ambos es solo `filtroVisibilidad`.
 */
const listar = async (req, res) => {
  try {
    const [filas] = await db.query(`${SELECT_BASE} ${filtroVisibilidad(req)} ORDER BY e.est_nombre ASC`);
    return res.json({ success: true, mensaje: "Estaciones obtenidas", data: filas });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al listar estaciones", error: error.message });
  }
};

/**
 * GET /api/estaciones/:id — detalle de una estación.
 *
 * A quien no tiene sesión se le responde 404 —y no 403— cuando la estación existe
 * pero está de baja o sin publicar: para el público esa fila sencillamente no
 * forma parte del catálogo, y un 403 delataría que sí existe.
 */
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

/**
 * Relee la fila con sus subconteos y la devuelve. Se usa tras cada escritura para
 * que el panel reciba el registro ya consolidado y no tenga que volver a pedirlo.
 */
const devolver = async (id, res, mensaje, codigo = 200) => {
  const [[fila]] = await db.query(`${SELECT_BASE} WHERE e.est_id_estacion = ?`, [id]);
  return res.status(codigo).json({ success: true, mensaje, data: fila });
};

/**
 * POST /api/estaciones — alta de una estación. Solo PeruRail (y el gestor MTC).
 *
 * El código se guarda en mayúsculas porque es la clave con la que se reconoce la
 * estación y es única en la tabla: así "cus" y "CUS" no llegan a convivir.
 */
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

/**
 * PUT /api/estaciones/:id — edición del dato logístico. Solo PeruRail (y MTC).
 *
 * Editar no toca la publicación: una estación ya publicada sigue publicada con sus
 * datos nuevos, porque corregir un andén o una altitud no es volver a proponerla.
 */
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
