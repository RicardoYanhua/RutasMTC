const db = require("../config/database");
const { DIFN } = require("../utils/ruta.util");
const { esPeticionPublica } = require("../middleware/auth.middleware");
const { borrarImagen } = require("../middleware/upload.middleware");

/**
 * Zonas turísticas. Dueño del dato: Travel Group Perú.
 *
 * El gestor MTC decide cuáles se publican. Nada se borra: la baja es lógica
 * (`zon_activo`), así que los informes ya emitidos siguen resolviendo su clave
 * foránea y una zona retirada por temporada puede volver sin recapturarla.
 *
 * El planificador público exige además que la ESTACIÓN de partida esté activa
 * y publicada: una zona colgada de una estación fuera de servicio no es una
 * ruta ofrecible, por buena que sea la zona.
 */

/** Cada zona viaja con el nombre y la imagen de su estación: se muestran juntas. */
const SELECT_BASE = `
  SELECT z.*, e.est_nombre AS estacionNombre, e.est_imagen_url AS estacionImagenUrl
  FROM zon_zona_turistica z
  JOIN est_estacion e ON e.est_id_estacion = z.zon_id_estacion
`;

/** Visibilidad pública: la zona publicada Y la estación desde la que se camina. */
const CONDICION_PUBLICA = "z.zon_activo = 1 AND z.zon_publicado = 1 AND e.est_activo = 1 AND e.est_publicado = 1";

/**
 * Añade a cada zona sus hitos con UNA sola consulta para todas (`IN (?)`) en lugar
 * de una por zona, y luego los reparte en memoria agrupándolos por zona. Con las
 * treinta y tantas zonas del catálogo, la diferencia entre 1 y 31 consultas ya se
 * nota al abrir el planificador.
 */
async function adjuntarHitos(zonas) {
  if (zonas.length === 0) return zonas;
  const ids = zonas.map((z) => z.zon_id_zona);
  const [hitos] = await db.query(
    `SELECT * FROM zon_hito WHERE zon_id_zona IN (?) ORDER BY zon_id_zona, zon_orden ASC`,
    [ids]
  );
  const porZona = new Map();
  for (const hito of hitos) {
    if (!porZona.has(hito.zon_id_zona)) porZona.set(hito.zon_id_zona, []);
    porZona.get(hito.zon_id_zona).push(hito);
  }
  return zonas.map((z) => ({ ...z, hitos: porZona.get(z.zon_id_zona) || [] }));
}

/**
 * GET /api/zonas — catálogo y buscador del planificador.
 *
 * Los filtros son exactamente los del formulario que llena el turista: estación de
 * partida, intereses, dificultad máxima y tiempo disponible. Se aplican en SQL y no
 * en memoria, y todos son opcionales: sin ninguno devuelve el catálogo entero.
 */
const listar = async (req, res) => {
  try {
    const { estacionId, intereses, dificultadMax, minutosMax } = req.query;
    const condiciones = [];
    const parametros = [];

    if (esPeticionPublica(req)) condiciones.push(CONDICION_PUBLICA);

    if (estacionId) {
      condiciones.push("z.zon_id_estacion = ?");
      parametros.push(estacionId);
    }
    // Intereses: el turista marca varias categorías y le vale cualquiera de ellas,
    // así que es un IN, no una conjunción.
    if (intereses) {
      const lista = String(intereses).split(",").filter(Boolean);
      if (lista.length) {
        condiciones.push(`z.zon_categoria IN (?)`);
        parametros.push(lista);
      }
    }
    // "Máxima" es un techo, no una igualdad: quien acepta Exigente también acepta
    // Fácil y Moderada. DIFN (utils/ruta.util.js) pone números a las etiquetas para
    // poder ordenarlas, ya que la columna guarda el texto.
    if (dificultadMax && DIFN[dificultadMax]) {
      const permitidas = Object.keys(DIFN).filter((d) => DIFN[d] <= DIFN[dificultadMax]);
      condiciones.push("z.zon_dificultad IN (?)");
      parametros.push(permitidas);
    }
    // El tiempo del que dispone el turista se contrasta contra el recorrido completo
    // de ida y vuelta: de nada sirve llegar si no le da para volver al andén.
    if (minutosMax) {
      condiciones.push("z.zon_minutos_ida_vuelta <= ?");
      parametros.push(minutosMax);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";
    const [filas] = await db.query(`${SELECT_BASE} ${where} ORDER BY z.zon_nombre ASC`, parametros);
    const conHitos = await adjuntarHitos(filas);
    return res.json({ success: true, mensaje: "Zonas turísticas obtenidas", data: conHitos });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al listar zonas turísticas", error: error.message });
  }
};

/** GET /api/zonas/:id — ficha con sus hitos. Al público le oculta lo no publicado. */
const obtener = async (req, res) => {
  try {
    const where = esPeticionPublica(req) ? `WHERE z.zon_id_zona = ? AND ${CONDICION_PUBLICA}` : "WHERE z.zon_id_zona = ?";
    const [[fila]] = await db.query(`${SELECT_BASE} ${where}`, [req.params.id]);
    if (!fila) {
      return res.status(404).json({ success: false, mensaje: "Zona turística no encontrada" });
    }
    const [conHitos] = await adjuntarHitos([fila]);
    return res.json({ success: true, mensaje: "Zona turística obtenida", data: conHitos });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al obtener la zona turística", error: error.message });
  }
};

/**
 * Siguiente correlativo ZN-NN. Se calcula sobre el MÁXIMO ya usado y no sobre
 * `COUNT(*)`: con bajas lógicas el conteo deja de coincidir con el último
 * número emitido y se generarían códigos duplicados.
 */
const siguienteCodigo = async () => {
  const [[fila]] = await db.query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(zon_codigo, 4) AS UNSIGNED)), 0) AS ultimo FROM zon_zona_turistica"
  );
  return `ZN-${String(Number(fila.ultimo) + 1).padStart(2, "0")}`;
};

/** Relee la zona con su estación y sus hitos, y la devuelve tras cada escritura. */
const devolver = async (id, res, mensaje, codigoHttp = 200) => {
  const [[fila]] = await db.query(`${SELECT_BASE} WHERE z.zon_id_zona = ?`, [id]);
  const [conHitos] = await adjuntarHitos([fila]);
  return res.status(codigoHttp).json({ success: true, mensaje, data: conHitos });
};

/**
 * POST /api/zonas — alta. Solo Travel Group (y el gestor MTC).
 *
 * Nace activa pero despublicada (1, 0) y el código ZN-NN lo asigna el sistema, no
 * el operador: es un correlativo, y dejarlo escribir a mano invita al duplicado.
 */
const crear = async (req, res) => {
  try {
    const {
      estacionId, nombre, categoria, distanciaKm, minutosIdaVuelta,
      dificultad, horarioAtencion, ingreso, descripcion, imagenUrl,
    } = req.body;
    const codigo = await siguienteCodigo();
    const [resultado] = await db.query(
      `INSERT INTO zon_zona_turistica
        (zon_id_estacion, zon_codigo, zon_nombre, zon_categoria, zon_distancia_km, zon_minutos_ida_vuelta,
         zon_dificultad, zon_horario_atencion, zon_ingreso, zon_descripcion, zon_imagen_url, zon_activo, zon_publicado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      [
        estacionId, codigo, nombre, categoria, distanciaKm, minutosIdaVuelta, dificultad,
        horarioAtencion || null, ingreso || "Libre", descripcion || null, imagenUrl || null,
      ]
    );
    return devolver(resultado.insertId, res, "Zona turística registrada. Queda pendiente de publicación por el MTC.", 201);
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al registrar la zona turística", error: error.message });
  }
};

/** PUT /api/zonas/:id — edición de la ficha. Solo Travel Group (y MTC). */
const actualizar = async (req, res) => {
  try {
    const {
      estacionId, nombre, categoria, distanciaKm, minutosIdaVuelta,
      dificultad, horarioAtencion, ingreso, descripcion, imagenUrl,
    } = req.body;
    const nuevaImagen = imagenUrl || null;

    // Igual que en estaciones: se lee la imagen previa antes de escribir para poder
    // borrar del disco el archivo que quede huérfano si el operador la sustituye.
    const [[anterior]] = await db.query("SELECT zon_imagen_url FROM zon_zona_turistica WHERE zon_id_zona = ?", [
      req.params.id,
    ]);
    if (!anterior) {
      return res.status(404).json({ success: false, mensaje: "Zona turística no encontrada" });
    }

    await db.query(
      `UPDATE zon_zona_turistica SET
        zon_id_estacion = ?, zon_nombre = ?, zon_categoria = ?, zon_distancia_km = ?, zon_minutos_ida_vuelta = ?,
        zon_dificultad = ?, zon_horario_atencion = ?, zon_ingreso = ?, zon_descripcion = ?, zon_imagen_url = ?
       WHERE zon_id_zona = ?`,
      [
        estacionId, nombre, categoria, distanciaKm, minutosIdaVuelta, dificultad,
        horarioAtencion || null, ingreso || "Libre", descripcion || null, nuevaImagen, req.params.id,
      ]
    );
    if (anterior.zon_imagen_url && anterior.zon_imagen_url !== nuevaImagen) {
      borrarImagen(anterior.zon_imagen_url);
    }
    return devolver(req.params.id, res, "Zona turística actualizada");
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al actualizar la zona turística", error: error.message });
  }
};

/** Baja y alta lógicas. La imagen y los hitos se conservan para poder revertir. */
const cambiarActivo = (activo) => async (req, res) => {
  try {
    const [resultado] = await db.query("UPDATE zon_zona_turistica SET zon_activo = ? WHERE zon_id_zona = ?", [
      activo ? 1 : 0,
      req.params.id,
    ]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ success: false, mensaje: "Zona turística no encontrada" });
    }
    return devolver(req.params.id, res, activo ? "Zona turística reactivada" : "Zona turística dada de baja");
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al cambiar el estado de la zona", error: error.message });
  }
};

/** Publicación: decisión exclusiva del gestor MTC (la ruta lo restringe). */
const cambiarPublicado = async (req, res) => {
  try {
    const publicado = req.body.publicado ? 1 : 0;
    const [[fila]] = await db.query("SELECT zon_activo FROM zon_zona_turistica WHERE zon_id_zona = ?", [req.params.id]);
    if (!fila) {
      return res.status(404).json({ success: false, mensaje: "Zona turística no encontrada" });
    }
    if (publicado && !fila.zon_activo) {
      return res.status(409).json({
        success: false,
        mensaje: "No se puede publicar una zona dada de baja. Pide a Travel Group que la reactive primero.",
      });
    }
    await db.query("UPDATE zon_zona_turistica SET zon_publicado = ? WHERE zon_id_zona = ?", [publicado, req.params.id]);
    return devolver(req.params.id, res, publicado ? "Zona publicada en el planificador" : "Zona retirada del planificador");
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
