const { body, param, query } = require("express-validator");

/**
 * Reglas de negocio del caso expresadas como validación de entrada.
 *
 * Se comprueban aquí, en el servidor, y no solo en el formulario de Angular: el
 * frontend evita que el operador se equivoque, pero cualquiera puede llamar a la
 * API directamente. Cuando algo no pasa, validate.middleware corta la petición con
 * un 400 y el controlador ya recibe datos limpios y convertidos.
 */

// Vocabulario cerrado del caso: los intereses que puede marcar el turista y el
// esfuerzo del recorrido a pie. Son los mismos valores que usan el planificador,
// el filtro de zonas y la base de datos.
const CATEGORIAS = ["Naturaleza", "Historia", "Aventura", "Cultura", "Gastronomía"];
const DIFICULTADES = ["Fácil", "Moderada", "Exigente"];

/** Solo se acepta una ruta servida por esta misma API: nada de URLs externas
 *  ni de rutas que intenten salir del directorio de subidas. */
const imagenSubida = (campo = "imagenUrl") =>
  body(campo)
    .optional({ values: "falsy" })
    .trim()
    .isLength({ max: 255 })
    .matches(/^\/uploads\/[A-Za-z0-9._-]+$/)
    .withMessage("La imagen debe ser un archivo subido a /uploads");

const idParam = (nombre = "id") =>
  param(nombre).isInt({ min: 1 }).withMessage("Identificador inválido").toInt();

/** Acceso al panel: aquí solo se exige que vengan; comprobarlas es cosa del login. */
const credencialesLogin = [
  body("usuario").trim().notEmpty().withMessage("El usuario es obligatorio"),
  body("clave").notEmpty().withMessage("La contraseña es obligatoria"),
];

/**
 * Ficha de zona turística (Travel Group). Los rangos delimitan lo que sigue siendo
 * un paseo a pie desde una estación: hasta 20 km de ida y hasta 8 horas ida y
 * vuelta. Más allá deja de ser una ruta peatonal y sería un error de captura.
 */
const zonaBody = [
  body("estacionId").isInt({ min: 1 }).withMessage("Selecciona una estación").toInt(),
  body("nombre").trim().isLength({ min: 3, max: 150 }).withMessage("El nombre debe tener entre 3 y 150 caracteres"),
  body("categoria").isIn(CATEGORIAS).withMessage("Categoría inválida"),
  body("distanciaKm").isFloat({ min: 0.1, max: 20 }).withMessage("La distancia de ida debe estar entre 0.1 y 20 km").toFloat(),
  body("minutosIdaVuelta").isInt({ min: 5, max: 480 }).withMessage("Los minutos ida y vuelta deben estar entre 5 y 480").toInt(),
  body("dificultad").isIn(DIFICULTADES).withMessage("Dificultad inválida"),
  body("horarioAtencion").optional({ values: "falsy" }).trim().isLength({ max: 100 }),
  body("ingreso").optional({ values: "falsy" }).trim().isLength({ max: 60 }),
  body("descripcion").optional({ values: "falsy" }).trim().isLength({ max: 2000 }),
  imagenSubida(),
];

/**
 * Estación ferroviaria. Los rangos acotan el territorio peruano y la escala
 * real de una estación de tren: una latitud fuera de [-19, 0] o una altitud de
 * seis cifras solo pueden ser un error de tecleo.
 */
const estacionBody = [
  body("codigo")
    .trim()
    .toUpperCase()
    .matches(/^[A-Z0-9]{2,10}$/)
    .withMessage("El código debe tener de 2 a 10 letras o dígitos, sin espacios"),
  body("nombre").trim().isLength({ min: 3, max: 120 }).withMessage("El nombre debe tener entre 3 y 120 caracteres"),
  body("region").trim().isLength({ min: 2, max: 100 }).withMessage("Indica la región o el corredor"),
  body("altitudMsnm").isInt({ min: 0, max: 6000 }).withMessage("La altitud debe estar entre 0 y 6000 msnm").toInt(),
  body("andenes").isInt({ min: 1, max: 30 }).withMessage("Los andenes deben estar entre 1 y 30").toInt(),
  body("latitud").isFloat({ min: -19, max: 0 }).withMessage("Latitud fuera del territorio peruano").toFloat(),
  body("longitud").isFloat({ min: -82, max: -68 }).withMessage("Longitud fuera del territorio peruano").toFloat(),
  body("badge").optional({ values: "falsy" }).trim().isLength({ max: 60 }),
  imagenSubida(),
];

/**
 * Servicio ferroviario. El nombre pasó de lista cerrada a texto libre: ahora
 * PeruRail mantiene su propia oferta desde el panel y no puede depender de que
 * alguien edite una constante del backend para dar de alta un tren nuevo.
 */
const servicioBody = [
  body("estacionOrigenId").isInt({ min: 1 }).withMessage("Selecciona la estación de origen").toInt(),
  body("estacionDestinoId")
    .isInt({ min: 1 })
    .withMessage("Selecciona la estación de destino")
    .toInt()
    .custom((valor, { req }) => valor !== Number(req.body.estacionOrigenId))
    .withMessage("El destino debe ser distinto del origen"),
  body("nombreServicio").trim().isLength({ min: 3, max: 80 }).withMessage("El nombre del servicio debe tener entre 3 y 80 caracteres"),
  body("horaSalida").matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage("Hora de salida inválida (HH:MM)"),
  body("horaRetorno")
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage("Hora de retorno inválida (HH:MM)")
    .custom((valor, { req }) => valor > req.body.horaSalida)
    .withMessage("El retorno debe ser posterior a la salida"),
  body("minutosTransito").isInt({ min: 1, max: 900 }).withMessage("El tiempo de tránsito debe estar entre 1 y 900 minutos").toInt(),
  body("precio").isFloat({ min: 0, max: 100000 }).withMessage("La tarifa no puede ser negativa").toFloat(),
];

/** Único campo del cambio de publicación, la decisión reservada al gestor MTC. */
const publicadoBody = [body("publicado").isBoolean().withMessage("Indica si se publica o se retira").toBoolean()];

/**
 * Preferencias con las que el turista pide su informe. `minutosMax` se acota entre
 * 30 y 240: por debajo no da tiempo a bajar del tren, caminar y volver; por encima
 * ya no es una escala entre trenes sino una excursión de otro tipo.
 */
const informeBody = [
  body("estacionId").isInt({ min: 1 }).withMessage("Selecciona una estación").toInt(),
  body("zonaId").isInt({ min: 1 }).withMessage("Selecciona una zona turística").toInt(),
  body("intereses").isArray({ min: 1 }).withMessage("Selecciona al menos un interés"),
  body("intereses.*").isIn(CATEGORIAS).withMessage("Interés inválido"),
  body("dificultadMax").isIn(DIFICULTADES).withMessage("Dificultad inválida"),
  body("minutosMax").isInt({ min: 30, max: 240 }).withMessage("El tiempo disponible debe estar entre 30 y 240 minutos").toInt(),
  body("fecha").isISO8601().withMessage("Fecha de viaje inválida"),
];

// Filtros de solo lectura. Se limpian y convierten aquí (toInt) para que el
// controlador los pueda meter en la consulta sin volver a comprobarlos.
const climaQuery = [query("fecha").optional().isISO8601().withMessage("Fecha inválida")];

const zonasQuery = [
  query("estacionId").optional().isInt({ min: 1 }).toInt(),
  query("dificultadMax").optional().isIn(DIFICULTADES),
  query("minutosMax").optional().isInt({ min: 1 }).toInt(),
];

module.exports = {
  CATEGORIAS,
  DIFICULTADES,
  idParam,
  credencialesLogin,
  zonaBody,
  estacionBody,
  servicioBody,
  publicadoBody,
  informeBody,
  climaQuery,
  zonasQuery,
};
