/**
 * Recarga el esquema y los datos semilla.
 *
 * Se hace desde Node y no con el cliente `mysql` porque así usa exactamente las
 * mismas credenciales del `.env` que la API, y sobre todo porque fija
 * `charset: utf8mb4` en la conexión: cargar los .sql desde una consola de
 * Windows con la codificación por defecto es lo que producía los "Tur?stico"
 * de la base anterior.
 *
 * Uso:
 *   node scripts/cargar-bd.js            (esquema + semilla)
 *   node scripts/cargar-bd.js --solo-semilla
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const DIR_SQL = path.join(__dirname, "..", "..", "Database");

(async () => {
  const soloSemilla = process.argv.includes("--solo-semilla");
  const archivos = soloSemilla ? ["seed.sql"] : ["schema.sql", "seed.sql"];

  // Sin `database`: schema.sql crea la base, así que la conexión no puede
  // depender de que ya exista.
  const cn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  for (const archivo of archivos) {
    const sql = fs.readFileSync(path.join(DIR_SQL, archivo), "utf8");
    process.stdout.write(`Ejecutando ${archivo}… `);
    await cn.query(sql);
    console.log("ok");
  }

  await cn.query(`USE \`${process.env.DB_NAME}\``);
  const [[estaciones]] = await cn.query("SELECT COUNT(*) AS n FROM est_estacion");
  const [[zonas]] = await cn.query("SELECT COUNT(*) AS n FROM zon_zona_turistica");
  const [[servicios]] = await cn.query("SELECT COUNT(*) AS n FROM est_servicio");
  const [usuarios] = await cn.query("SELECT usr_usuario, usr_rol FROM usr_admin ORDER BY usr_rol");
  console.log(`\nCatálogo: ${estaciones.n} estaciones · ${zonas.n} zonas · ${servicios.n} servicios`);
  console.log("Cuentas:", usuarios.map((u) => `${u.usr_usuario} (${u.usr_rol})`).join(", "));

  await cn.end();
})().catch((e) => {
  console.error("\nError al cargar la base de datos:", e.message);
  process.exit(1);
});
