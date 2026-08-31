const express = require("express");
const router = express.Router();
const { login, perfil, cuentasDemo } = require("../controllers/authController");
const { verificarToken } = require("../middleware/auth.middleware");
const { credencialesLogin } = require("../middleware/validators");
const validar = require("../middleware/validate.middleware");

router.post("/login", credencialesLogin, validar, login);
router.get("/perfil", verificarToken, perfil);
// Atajos de acceso para probar cada rol. Solo tiene sentido en el entorno de
// demostración: se apaga poniendo DEMO_ACCOUNTS=off en el .env.
router.get("/cuentas-demo", cuentasDemo);

module.exports = router;
