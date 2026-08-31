/**
 * Radiografía rápida del estado de la base de datos. Se usa antes de recargar
 * el esquema para no destruir trabajo real sin darse cuenta.
 * Uso: node scripts/inspeccionar-bd.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

(async () => {
  const cn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const tablas = [
    "est_estacion", "est_servicio", "zon_zona_turistica", "zon_hito",
    "rut_informe", "usr_admin", "cli_prevision",
  ];
  for (const t of tablas) {
    try {
      const [[r]] = await cn.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
      console.log(t.padEnd(22), r.n);
    } catch (e) {
      console.log(t.padEnd(22), "no existe");
    }
  }
  const [zi] = await cn.query(
    "SELECT zon_id_zona, zon_nombre, zon_imagen_url FROM zon_zona_turistica WHERE zon_imagen_url IS NOT NULL"
  );
  console.log("\nzonas con imagen subida:", zi.length ? zi : "(ninguna)");
  const [inf] = await cn.query("SELECT rut_codigo FROM rut_informe ORDER BY rut_id_informe DESC LIMIT 5");
  console.log("últimos informes:", inf.map((i) => i.rut_codigo).join(", ") || "(ninguno)");
  await cn.end();
})().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
