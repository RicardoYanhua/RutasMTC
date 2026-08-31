const cron = require("node-cron");
const { sincronizarTodas } = require("../services/openMeteo.service");

const hoyISO = () => new Date().toISOString().slice(0, 10);

/**
 * Precalienta `cli_prevision` para las 13 estaciones. No es indispensable
 * para la corrección del sistema: `GET /api/clima/:estacionId` ya sincroniza
 * bajo demanda si la caché del día no existe (ver climaController.js). Esto
 * solo evita que el primer turista del día page esa espera.
 */
const precalentar = async () => {
  const fecha = hoyISO();
  const resultados = await sincronizarTodas(fecha);
  const exitosos = resultados.filter((r) => r.ok).length;
  console.log(`[cron clima] ${exitosos}/${resultados.length} estaciones sincronizadas para ${fecha}`);
};

/**
 * Arranca la sincronización diaria del clima (SENAMHI, vía Open-Meteo).
 *
 * Corre una vez al iniciar el servidor (por si el proceso llevaba días
 * corriendo y la caché de hoy aún no existe) y luego todos los días a las
 * 05:00 hora de Lima, antes de que salga el primer tren.
 *
 * Reemplaza al botón "Sincronizar ahora" del panel MTC: ya no hace falta que
 * una persona lo dispare a mano.
 */
const iniciarCronClima = () => {
  precalentar().catch((e) => console.error("[cron clima] fallo al precalentar al arrancar:", e.message));

  cron.schedule(
    "0 5 * * *",
    () => precalentar().catch((e) => console.error("[cron clima] fallo la sincronización diaria:", e.message)),
    { timezone: "America/Lima" }
  );
};

module.exports = { iniciarCronClima };
