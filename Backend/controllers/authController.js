const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/database");

/**
 * El rol sale de la base de datos y viaja firmado dentro del token. No se
 * acepta nunca desde el cuerpo de la petición: si el cliente pudiera declarar
 * su propio rol, la separación de módulos no valdría nada.
 */
const firmarToken = (admin) =>
  jwt.sign(
    {
      id: admin.usr_id_admin,
      usuario: admin.usr_usuario,
      rol: admin.usr_rol,
      entidad: admin.usr_entidad,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );

const publico = (admin) => ({
  id: admin.usr_id_admin,
  usuario: admin.usr_usuario,
  nombreCompleto: admin.usr_nombre_completo,
  rol: admin.usr_rol,
  entidad: admin.usr_entidad,
});

const login = async (req, res) => {
  try {
    const { usuario, clave } = req.body;
    const [[fila]] = await db.query(
      "SELECT * FROM usr_admin WHERE usr_usuario = ? AND usr_activo = 1",
      [usuario]
    );

    if (!fila) {
      return res.status(401).json({ success: false, mensaje: "Usuario o contraseña incorrectos" });
    }

    const coincide = await bcrypt.compare(clave, fila.usr_contrasena_hash);
    if (!coincide) {
      return res.status(401).json({ success: false, mensaje: "Usuario o contraseña incorrectos" });
    }

    const token = firmarToken(fila);
    return res.json({ success: true, mensaje: "Inicio de sesión exitoso", token, usuario: publico(fila) });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al iniciar sesión", error: error.message });
  }
};

const perfil = async (req, res) => {
  return res.json({ success: true, mensaje: "Sesión activa", data: req.usuario });
};

/**
 * Cuentas de demostración que la pantalla de acceso ofrece como atajo. Se
 * sirven desde el backend (y no incrustadas en el bundle del cliente) para que
 * la lista siga a la base de datos: si se desactiva una cuenta, el atajo
 * desaparece solo. Nunca devuelve el hash; la clave de demo es la misma para
 * las tres y está pensada solo para el entorno de prueba.
 */
const cuentasDemo = async (req, res) => {
  try {
    // En un despliegue real esto se apaga: publicar usuarios válidos, aunque
    // sea sin contraseña, le regala al atacante la mitad del trabajo.
    if (String(process.env.DEMO_ACCOUNTS || "on").toLowerCase() === "off") {
      return res.json({ success: true, mensaje: "Atajos de demostración desactivados", data: [] });
    }
    const [filas] = await db.query(
      `SELECT usr_usuario, usr_nombre_completo, usr_rol, usr_entidad
       FROM usr_admin WHERE usr_activo = 1
       ORDER BY FIELD(usr_rol, 'mtc', 'perurail', 'travelgroup')`
    );
    return res.json({
      success: true,
      mensaje: "Cuentas de demostración",
      data: filas.map((f) => ({
        usuario: f.usr_usuario,
        nombreCompleto: f.usr_nombre_completo,
        rol: f.usr_rol,
        entidad: f.usr_entidad,
        clave: process.env.DEMO_PASSWORD || "demo2026",
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: "Error al listar cuentas de demostración", error: error.message });
  }
};

module.exports = { login, perfil, cuentasDemo };
