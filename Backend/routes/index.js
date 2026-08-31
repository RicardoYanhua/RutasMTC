const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth.routes"));
router.use("/estaciones", require("./estaciones.routes"));
router.use("/zonas", require("./zonas.routes"));
router.use("/servicios", require("./servicios.routes"));
router.use("/clima", require("./clima.routes"));
router.use("/informes", require("./informes.routes"));

module.exports = router;
