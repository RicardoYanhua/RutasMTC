const express = require("express");
const router = express.Router();
const {
  listar, crear, actualizar, desactivar, reactivar, cambiarPublicado,
} = require("../controllers/servicioController");
const { verificarToken, tokenOpcional, soloPeruRail, soloMtc } = require("../middleware/auth.middleware");
const { idParam, servicioBody, publicadoBody } = require("../middleware/validators");
const validar = require("../middleware/validate.middleware");

router.get("/", tokenOpcional, listar);

// Horarios y tarifas son dato de PeruRail (el gestor MTC también entra).
router.post("/", verificarToken, soloPeruRail, servicioBody, validar, crear);
router.put("/:id", verificarToken, soloPeruRail, idParam(), servicioBody, validar, actualizar);

router.patch("/:id/desactivar", verificarToken, soloPeruRail, idParam(), validar, desactivar);
router.patch("/:id/reactivar", verificarToken, soloPeruRail, idParam(), validar, reactivar);

router.patch("/:id/publicacion", verificarToken, soloMtc, idParam(), publicadoBody, validar, cambiarPublicado);

module.exports = router;
