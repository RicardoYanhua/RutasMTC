const express = require("express");
const router = express.Router();
const {
  listar, obtener, crear, actualizar, desactivar, reactivar, cambiarPublicado,
} = require("../controllers/zonaController");
const {
  verificarToken, tokenOpcional, soloTravelGroup, soloMtc,
} = require("../middleware/auth.middleware");
const { recibirImagenDe, responderSubida } = require("../middleware/upload.middleware");
const { idParam, zonaBody, zonasQuery, publicadoBody } = require("../middleware/validators");
const validar = require("../middleware/validate.middleware");

router.get("/", tokenOpcional, zonasQuery, validar, listar);

// Antes de "/:id" para que "imagen" no se interprete como un identificador.
router.post("/imagen", verificarToken, soloTravelGroup, recibirImagenDe("zona"), responderSubida);

router.get("/:id", tokenOpcional, idParam(), validar, obtener);

// CRUD: Travel Group Perú es el dueño del dato (el gestor MTC también entra).
router.post("/", verificarToken, soloTravelGroup, zonaBody, validar, crear);
router.put("/:id", verificarToken, soloTravelGroup, idParam(), zonaBody, validar, actualizar);

router.patch("/:id/desactivar", verificarToken, soloTravelGroup, idParam(), validar, desactivar);
router.patch("/:id/reactivar", verificarToken, soloTravelGroup, idParam(), validar, reactivar);

router.patch("/:id/publicacion", verificarToken, soloMtc, idParam(), publicadoBody, validar, cambiarPublicado);

module.exports = router;
