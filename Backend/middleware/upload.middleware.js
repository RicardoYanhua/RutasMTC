const fs = require("fs");
const path = require("path");
const multer = require("multer");

/**
 * Subida de imágenes del sistema (zonas turísticas y estaciones ferroviarias).
 *
 * El archivo se guarda en disco dentro de `Backend/uploads/` y en la base de
 * datos solo viaja la ruta pública (`/uploads/<archivo>`), nunca el binario:
 * así la tabla no engorda y el servidor puede servir la imagen como estático.
 *
 * El prefijo del nombre indica a qué entidad pertenece el archivo (`zona-`,
 * `estacion-`), lo que hace legible el directorio y permite auditarlo de un
 * vistazo sin consultar la base.
 */
const DIRECTORIO_SUBIDAS = path.join(__dirname, "..", "uploads");
const EXTENSION_POR_TIPO = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};
const TAMANO_MAXIMO_BYTES = 4 * 1024 * 1024;
const PREFIJOS_VALIDOS = ["zona", "estacion"];

fs.mkdirSync(DIRECTORIO_SUBIDAS, { recursive: true });

const crearSubida = (prefijo) => {
  if (!PREFIJOS_VALIDOS.includes(prefijo)) {
    throw new Error(`Prefijo de subida no permitido: ${prefijo}`);
  }
  const almacenamiento = multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIRECTORIO_SUBIDAS),
    filename: (req, file, cb) => {
      // Nombre impredecible: evita colisiones y que se pueda adivinar la ruta
      // de una imagen ajena. Se conserva solo la extensión del tipo declarado.
      const aleatorio = Math.random().toString(36).slice(2, 10);
      cb(null, `${prefijo}-${Date.now()}-${aleatorio}${EXTENSION_POR_TIPO[file.mimetype]}`);
    },
  });

  return multer({
    storage: almacenamiento,
    limits: { fileSize: TAMANO_MAXIMO_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
      if (!EXTENSION_POR_TIPO[file.mimetype]) {
        return cb(new Error("Formato no admitido. Usa JPG, PNG, WebP o AVIF."));
      }
      cb(null, true);
    },
  }).single("imagen");
};

/** Envuelve multer para devolver los errores con el mismo sobre JSON que el resto de la API. */
const recibirImagenDe = (prefijo) => {
  const subida = crearSubida(prefijo);
  return (req, res, next) => {
    subida(req, res, (error) => {
      if (!error) return next();
      const esLimite = error.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({
        success: false,
        mensaje: esLimite ? "La imagen supera los 4 MB permitidos." : error.message,
      });
    });
  };
};

/**
 * Borra un archivo de `uploads/` a partir de su ruta pública. Solo actúa dentro
 * del directorio de subidas (descarta cualquier intento de salir con `..`) y
 * nunca lanza: si el archivo ya no está, no hay nada que hacer.
 *
 * Ojo: esto se usa al SUSTITUIR una imagen, no al dar de baja un registro. Una
 * baja es lógica y conserva su fotografía, porque puede reactivarse.
 */
const borrarImagen = (rutaPublica) => {
  if (!rutaPublica || !rutaPublica.startsWith("/uploads/")) return;
  const nombre = path.basename(rutaPublica);
  const destino = path.join(DIRECTORIO_SUBIDAS, nombre);
  if (path.dirname(destino) !== DIRECTORIO_SUBIDAS) return;
  fs.promises.unlink(destino).catch(() => {});
};

/** Respuesta común de los tres endpoints de subida. */
const responderSubida = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, mensaje: "No se recibió ninguna imagen" });
  }
  return res.status(201).json({
    success: true,
    mensaje: "Imagen subida",
    data: { url: `/uploads/${req.file.filename}`, bytes: req.file.size },
  });
};

module.exports = {
  recibirImagenDe,
  recibirImagen: recibirImagenDe("zona"),
  borrarImagen,
  responderSubida,
  DIRECTORIO_SUBIDAS,
};
