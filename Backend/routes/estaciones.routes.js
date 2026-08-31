const express = require("express");
const router = express.Router();
const {
  listar, obtener, crear, actualizar, desactivar, reactivar, cambiarPublicado,
} = require("../controllers/estacionController");
const {
  verificarToken, tokenOpcional, soloPeruRail, soloMtc,
} = require("../middleware/auth.middleware");
const { recibirImagenDe, responderSubida } = require("../middleware/upload.middleware");
const { idParam, estacionBody, publicadoBody } = require("../middleware/validators");
const validar = require("../middleware/validate.middleware");

// Lectura con token OPCIONAL: sin sesión devuelve solo lo publicado; con sesión
// de panel devuelve el catálogo completo, que es lo que necesita el operador
// para encontrar lo que está de baja o pendiente.
router.get("/", tokenOpcional, listar);

// Antes de "/:id" para que "imagen" no se interprete como un identificador.
router.post("/imagen", verificarToken, soloPeruRail, recibirImagenDe("estacion"), responderSubida);

router.get("/:id", tokenOpcional, idParam(), validar, obtener);

// CRUD: PeruRail es el dueño del dato (el gestor MTC también entra).
router.post("/", verificarToken, soloPeruRail, estacionBody, validar, crear);
router.put("/:id", verificarToken, soloPeruRail, idParam(), estacionBody, validar, actualizar);

// Baja y alta lógicas. No existe DELETE en toda la API: nada se borra.
router.patch("/:id/desactivar", verificarToken, soloPeruRail, idParam(), validar, desactivar);
router.patch("/:id/reactivar", verificarToken, soloPeruRail, idParam(), validar, reactivar);

// Publicar es potestad exclusiva del gestor MTC.
router.patch("/:id/publicacion", verificarToken, soloMtc, idParam(), publicadoBody, validar, cambiarPublicado);

module.exports = router;
