const jwt = require("jsonwebtoken");

/**
 * Roles del panel. Cada uno corresponde a una de las fuentes que el caso
 * describe, más el ministerio que gobierna la plataforma:
 *
 *   perurail    -> estaciones, horarios y tarifas
 *   travelgroup -> zonas turísticas (y consulta de estaciones, en solo lectura)
 *   mtc         -> gestor: ve todos los módulos y decide qué se publica
 *
 * El rol viaja dentro del JWT y se comprueba SIEMPRE en el servidor. Ocultar
 * una opción del menú es una comodidad para el operador, no una medida de
 * seguridad: sin esta comprobación bastaría un `curl` para saltársela.
 */
const ROLES = {
  PERURAIL: "perurail",
  TRAVELGROUP: "travelgroup",
  MTC: "mtc",
};

/**
 * Puerta de entrada al panel: exige un token válido en `Authorization: Bearer` y
 * deja al usuario firmado en `req.usuario` para los siguientes middlewares.
 *
 * Distingue el token caducado del inválido porque al operador le sirve saber que
 * solo tiene que volver a entrar; en ambos casos la petición se detiene con 401.
 */
const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, mensaje: "Token de acceso requerido" });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, mensaje: "La sesión expiró, vuelve a iniciar sesión" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, mensaje: "Token inválido" });
    }
    return res.status(500).json({ success: false, mensaje: "Error al verificar el token", error: error.message });
  }
};

/**
 * Igual que `verificarToken` pero sin exigirlo: si viene un token válido deja
 * `req.usuario`, y si no viene (o no vale) sigue adelante como anónimo.
 *
 * Es lo que permite que un mismo endpoint sirva dos vistas del catálogo: el
 * ciudadano ve solo lo activo y publicado, y el operador autenticado ve además
 * lo dado de baja y lo pendiente de publicar, sin duplicar rutas.
 */
const tokenOpcional = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return next();
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    /* token caducado o inválido: se atiende como público, no como error */
  }
  next();
};

/**
 * Fábrica de guardias por rol: `verificarRol("perurail", "mtc")` deja pasar a esos
 * dos y responde 403 al resto. Se aplica en las rutas siempre DESPUÉS de
 * `verificarToken`, que es quien rellena `req.usuario`.
 */
const verificarRol = (...rolesPermitidos) => (req, res, next) => {
  if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({ success: false, mensaje: "Tu rol no tiene permisos para esta acción" });
  }
  next();
};

/** El gestor MTC entra a todos los módulos, así que siempre va en la lista. */
const soloPeruRail = verificarRol(ROLES.PERURAIL, ROLES.MTC);
const soloTravelGroup = verificarRol(ROLES.TRAVELGROUP, ROLES.MTC);
const soloMtc = verificarRol(ROLES.MTC);

/** ¿La petición llega sin sesión de panel? Entonces solo puede ver lo publicado. */
const esPeticionPublica = (req) => !req.usuario;

module.exports = {
  ROLES,
  verificarToken,
  tokenOpcional,
  verificarRol,
  soloPeruRail,
  soloTravelGroup,
  soloMtc,
  esPeticionPublica,
};
