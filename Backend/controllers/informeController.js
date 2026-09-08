const db = require("../config/database");
const { calcularDistanciaTotal, generarFolio, construirTimeline } = require("../utils/ruta.util");
const { sincronizarEstacion } = require("../services/openMeteo.service");

/**
 * CASO DE USO PRINCIPAL: generar el informe de la ruta turística peatonal.
 *
 * Es el punto donde se cruzan las tres fuentes que describe el caso:
 *   PeruRail     -> la estación de partida y el servicio de tren (horario y tarifa)
 *   Travel Group -> la zona turística y los hitos del recorrido a pie
 *   SENAMHI      -> la previsión del clima para la fecha del viaje (vía Open-Meteo)
 *
 * El turista elige estación + zona + preferencias + fecha; el sistema calcula el
 * recorrido de ida y vuelta, lo sella con un folio irrepetible (INF-AAAA-NNNNNN) y
 * lo guarda en `rut_informe`. Ese folio es lo único que hace falta para volver a
 * abrir el informe, así que el turista puede guardarlo o compartirlo sin tener
 * cuenta en el sistema.
 */

/**
 * Hitos (puntos de referencia) del tramo a pie, en el orden en que se encuentran
 * al ir. La vuelta reutiliza esta misma lista invertida: ver `construirTimeline`
 * en utils/ruta.util.js.
 */
async function obtenerHitos(zonaId) {
  const [hitos] = await db.query(
    "SELECT * FROM zon_hito WHERE zon_id_zona = ? ORDER BY zon_orden ASC",
    [zonaId]
  );
  return hitos;
}

/**
 * Tren sugerido para llegar a la estación: el primero que sale entre los que están
 * activos Y publicados. Se exige `publicado` porque el informe es material que ve
 * el ciudadano; anunciar ahí un servicio que el MTC todavía no aprobó sería
 * publicarlo por la puerta de atrás.
 *
 * Devuelve null si la estación no tiene servicios ofrecibles: el informe se emite
 * igual, solo que sin la sección de tren.
 */
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

/**
 * Clima de la fecha del viaje: primero la caché de `cli_prevision` y, si ese día
 * todavía no está guardado, se sincroniza con Open-Meteo en el momento.
 *
 * El `catch` que devuelve null es deliberado: el clima es un dato de apoyo, no
 * parte del cálculo de la ruta. Si la API externa está caída, el informe sale sin
 * esa sección en lugar de fallar entero por algo accesorio.
 */
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

/**
 * Arma el payload completo del informe a partir de la fila persistida.
 *
 * En `rut_informe` solo se guarda el resultado del cálculo (distancia, tiempo y
 * dificultad) junto con las preferencias con que se pidió; la estación, la zona,
 * los hitos, el tren y el clima se releen aquí en cada consulta. Así un informe
 * reabierto muestra el horario y el pronóstico vigentes, sin que cambien los
 * números con los que se emitió.
 *
 * Devuelve las cinco secciones que pinta el frontend: estación de partida, zona
 * turística con sus hitos, servicio ferroviario, clima y ruta a pie.
 */
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

/**
 * POST /api/informes — genera el informe. Endpoint público: el turista no necesita
 * cuenta, las credenciales son cosa del panel de administración.
 *
 * Cinco pasos: (1) la estación es visible, (2) la zona es visible, (3) la zona
 * cuelga de esa estación, (4) se calcula el recorrido y (5) se persiste con folio.
 */
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

    // El recorrido informado es de ida y vuelta: la zona registra solo los km de
    // ida, así que se duplican. Los minutos, en cambio, ya vienen medidos ida y
    // vuelta, y la dificultad del informe es la de la zona que se recorre.
    const distanciaTotalKm = calcularDistanciaTotal(zona.zon_distancia_km);
    const tiempoTotalMin = zona.zon_minutos_ida_vuelta;

    // El folio se construye sobre el id autoincremental, que solo se conoce DESPUÉS
    // de insertar, y `rut_codigo` no admite nulos ni repetidos. Por eso la fila nace
    // con un código temporal único y el UPDATE siguiente lo cambia por el definitivo.
    //
    // Las preferencias del turista (intereses, dificultad y minutos máximos) se
    // guardan tal cual: aquí no filtran nada —eso ya ocurrió al listar zonas— pero
    // quedan en el informe como constancia de con qué criterios se armó.
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

/**
 * GET /api/informes/:codigo — recupera por folio un informe ya emitido.
 *
 * Público y sin caducidad: es lo que permite volver a abrirlo desde el enlace
 * guardado, o consultarlo en el andén el día del viaje ya con el clima al día.
 */
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
