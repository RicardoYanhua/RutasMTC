const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bd_rutas_turisticas",
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  decimalNumbers: true,
});

const db = pool.promise();

db.getConnection()
  .then((connection) => {
    console.log(`Conexión exitosa a la base de datos "${process.env.DB_NAME || "bd_rutas_turisticas"}"`);
    connection.release();
  })
  .catch((err) => {
    console.error("Error de conexión a la base de datos:", err.message);
  });

module.exports = db;
