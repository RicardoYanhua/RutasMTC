require("dotenv").config();
require("./config/database");

const path = require("path");
const express = require("express");
const cors = require("cors");
const rutas = require("./routes/index");
const { iniciarCronClima } = require("./jobs/clima.cron");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:4200" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Imágenes de zonas turísticas. En la base de datos solo se guarda la ruta
// pública (/uploads/<archivo>); el binario vive en disco y se sirve desde aquí.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "7d",
    fallthrough: true,
    index: false,
  })
);

app.get("/", (req, res) => {
  res.json({ success: true, mensaje: "API de Rutas Turísticas Peatonales — en línea" });
});

app.use("/api", rutas);

app.use((req, res) => {
  res.status(404).json({ success: false, mensaje: "Recurso no encontrado" });
});

app.use((err, req, res, next) => {
  console.error("Error no controlado:", err);
  res.status(err.status || 500).json({ success: false, mensaje: err.message || "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  iniciarCronClima();
});

module.exports = app;
