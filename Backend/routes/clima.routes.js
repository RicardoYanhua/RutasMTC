const express = require("express");
const router = express.Router();
const { obtener } = require("../controllers/climaController");
const { idParam, climaQuery } = require("../middleware/validators");
const validar = require("../middleware/validate.middleware");

router.get("/:estacionId", idParam("estacionId"), climaQuery, validar, obtener);

module.exports = router;
