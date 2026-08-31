const express = require("express");
const router = express.Router();
const { crear, obtener } = require("../controllers/informeController");
const { informeBody } = require("../middleware/validators");
const validar = require("../middleware/validate.middleware");

router.post("/", informeBody, validar, crear);
router.get("/:codigo", obtener);

module.exports = router;
