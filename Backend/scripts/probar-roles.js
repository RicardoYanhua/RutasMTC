/**
 * Prueba de humo de la separación por roles. Recorre las operaciones clave con
 * cada cuenta y comprueba que el servidor concede o deniega lo que debe.
 * Uso: node scripts/probar-roles.js
 */
const API = process.env.API || "http://localhost:3000/api";

const pedir = async (metodo, ruta, { token, cuerpo } = {}) => {
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { estado: res.status, json };
};

const entrar = async (usuario) => {
  const r = await pedir("POST", "/auth/login", { cuerpo: { usuario, clave: "demo2026" } });
  if (!r.json?.token) throw new Error(`No se pudo entrar como ${usuario}: ${JSON.stringify(r.json)}`);
  return r.json.token;
};

/**
 * Borra por SQL directo lo que creó esta prueba. La aplicación no borra nada
 * (toda baja es lógica), pero un script de prueba sí debe recoger su propio
 * desorden para no dejar residuo en el panel.
 */
const limpiar = async (idZona, idEst) => {
  require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
  const mysql = require("mysql2/promise");
  const cn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
  });
  if (idZona) await cn.query("DELETE FROM zon_zona_turistica WHERE zon_id_zona = ?", [idZona]);
  if (idEst) await cn.query("DELETE FROM est_estacion WHERE est_id_estacion = ?", [idEst]);
  await cn.end();
  console.log("\nResiduo de prueba eliminado.");
};

let fallos = 0;
const comprobar = (etiqueta, real, esperado) => {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`${ok ? "ok  " : "FALLA"}  ${etiqueta}  -> ${real} (esperado ${esperado})`);
};

(async () => {
  const tgp = await entrar("operador.tgp");
  const prl = await entrar("operador.prl");
  const mtc = await entrar("gestor.mtc");

  const zona = {
    estacionId: 6, nombre: "Zona de prueba automatizada", categoria: "Cultura",
    distanciaKm: 1, minutosIdaVuelta: 40, dificultad: "Fácil",
    horarioAtencion: "09:00-17:00", ingreso: "Libre", descripcion: "Alta creada por la prueba de roles.",
  };
  const estacion = {
    codigo: "TST", nombre: "Estación de prueba", region: "Cusco",
    altitudMsnm: 3000, andenes: 1, latitud: -13.5, longitud: -71.9,
  };

  console.log("\n— Zonas turísticas (dueño: Travel Group) —");
  const creaZonaTgp = await pedir("POST", "/zonas", { token: tgp, cuerpo: zona });
  comprobar("travelgroup crea zona", creaZonaTgp.estado, 201);
  comprobar("perurail crea zona (debe denegar)", (await pedir("POST", "/zonas", { token: prl, cuerpo: zona })).estado, 403);
  comprobar("anónimo crea zona (debe denegar)", (await pedir("POST", "/zonas", { cuerpo: zona })).estado, 401);

  const idZona = creaZonaTgp.json?.data?.zon_id_zona;
  comprobar("travelgroup publica zona (debe denegar)", (await pedir("PATCH", `/zonas/${idZona}/publicacion`, { token: tgp, cuerpo: { publicado: true } })).estado, 403);
  comprobar("mtc publica zona", (await pedir("PATCH", `/zonas/${idZona}/publicacion`, { token: mtc, cuerpo: { publicado: true } })).estado, 200);
  comprobar("travelgroup da de baja su zona", (await pedir("PATCH", `/zonas/${idZona}/desactivar`, { token: tgp })).estado, 200);
  comprobar("no existe DELETE de zonas", (await pedir("DELETE", `/zonas/${idZona}`, { token: mtc })).estado, 404);

  console.log("\n— Estaciones (dueño: PeruRail) —");
  const creaEstPrl = await pedir("POST", "/estaciones", { token: prl, cuerpo: estacion });
  comprobar("perurail crea estación", creaEstPrl.estado, 201);
  comprobar("travelgroup crea estación (debe denegar)", (await pedir("POST", "/estaciones", { token: tgp, cuerpo: { ...estacion, codigo: "TS2" } })).estado, 403);
  const idEst = creaEstPrl.json?.data?.est_id_estacion;
  comprobar("mtc publica estación", (await pedir("PATCH", `/estaciones/${idEst}/publicacion`, { token: mtc, cuerpo: { publicado: true } })).estado, 200);
  comprobar("perurail da de baja estación", (await pedir("PATCH", `/estaciones/${idEst}/desactivar`, { token: prl })).estado, 200);

  console.log("\n— Visibilidad pública vs. panel —");
  const pub = await pedir("GET", "/zonas");
  const panel = await pedir("GET", "/zonas", { token: mtc });
  console.log(`ok    zonas visibles al ciudadano: ${pub.json.data.length} · vistas por el panel: ${panel.json.data.length}`);
  comprobar("el panel ve más que el público", panel.json.data.length > pub.json.data.length, true);

  await limpiar(idZona, idEst);

  console.log(fallos === 0 ? "\nTodas las comprobaciones pasaron." : `\n${fallos} comprobaciones fallaron.`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });
