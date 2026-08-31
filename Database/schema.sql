-- ============================================================================
-- Sistema Web de Rutas Turísticas Peatonales desde Estaciones Ferroviarias
-- Esquema en 3FN.
--
-- ROLES DEL PANEL (según el caso de la hoja de práctica: el MTC dispone la
-- plataforma y la alimenta con tres fuentes periódicas):
--
--   · perurail     -> CRUD de estaciones, horarios y tarifas. Es la fuente de
--                     "datos logísticos sobre estaciones, horarios, tiempos de
--                     tránsito y tarifas de billetes".
--   · travelgroup  -> CRUD de zonas turísticas y sus hitos. Es la fuente
--                     "responsable del levantamiento y actualización de las
--                     zonas turísticas". Consulta las estaciones en solo
--                     lectura para poder vincular cada zona a su punto de
--                     partida.
--   · mtc          -> gestor de la plataforma. Ve todos los módulos y decide
--                     qué se publica al ciudadano. También administra la
--                     configuración visual del planificador.
--
--   SENAMHI no tiene panel: entra por sincronización automática (Open-Meteo).
--
-- DOS BANDERAS POR REGISTRO, porque son dos decisiones de dueños distintos:
--
--   *_activo     -> baja lógica. La marca el dueño del dato (PeruRail sobre
--                   sus estaciones, Travel Group sobre sus zonas). NADA se
--                   borra nunca: no hay un solo DELETE en la aplicación, así
--                   que los informes históricos siguen resolviendo sus FK.
--   *_publicado  -> visibilidad pública. La marca el gestor MTC. Un registro
--                   recién creado nace despublicado y no aparece en el
--                   planificador hasta que el MTC lo habilita.
--
--   El sitio público exige SIEMPRE `activo = 1 AND publicado = 1`.
--
-- Normalización: ver Database/NORMALIZACION.md. Resumen: toda PK es un entero
-- autoincremental de una sola columna (no hay dependencia parcial posible);
-- ningún atributo no clave determina a otro atributo no clave; los catálogos
-- fijos sin atributos propios (categoría, dificultad, rol) se modelan como
-- ENUM porque normalizarlos no elimina ninguna anomalía real.
-- ============================================================================

DROP DATABASE IF EXISTS bd_rutas_turisticas;
CREATE DATABASE bd_rutas_turisticas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bd_rutas_turisticas;

-- ----------------------------------------------------------------------------
-- 1. est_estacion — estaciones ferroviarias. Dueño: PeruRail.
--    1FN: todo atributo es atómico (lat/lng separados, sin listas). 2FN/3FN:
--    PK de una sola columna -> no hay dependencia parcial; región, altitud y
--    andenes son hechos propios de la estación, no derivables entre sí.
--    `est_imagen_url` guarda solo la ruta pública (/uploads/<archivo>): el
--    binario vive en disco, nunca en la tabla.
-- ----------------------------------------------------------------------------
CREATE TABLE est_estacion (
  est_id_estacion   INT AUTO_INCREMENT PRIMARY KEY,
  est_codigo        VARCHAR(10)  NOT NULL UNIQUE,
  est_nombre        VARCHAR(120) NOT NULL,
  est_region        VARCHAR(100) NOT NULL,
  est_altitud_msnm  SMALLINT UNSIGNED NOT NULL,
  est_andenes       TINYINT UNSIGNED NOT NULL DEFAULT 1,
  est_latitud       DECIMAL(9,6) NOT NULL,
  est_longitud      DECIMAL(9,6) NOT NULL,
  est_badge         VARCHAR(60)  DEFAULT NULL,
  est_imagen_url    VARCHAR(255) DEFAULT NULL,
  est_activo        TINYINT(1)   NOT NULL DEFAULT 1,
  est_publicado     TINYINT(1)   NOT NULL DEFAULT 0,
  est_fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. est_servicio — un servicio ferroviario = un tren con horario y tarifa ya
--    fusionados. Dueño: PeruRail. Autorreferencia a est_estacion para
--    origen/destino, que evita texto libre redundante.
--    3FN: precio, horas y tránsito dependen solo de la PK y ninguno determina
--    a otro (el precio no se deduce de la duración ni viceversa).
-- ----------------------------------------------------------------------------
CREATE TABLE est_servicio (
  est_id_servicio         INT AUTO_INCREMENT PRIMARY KEY,
  est_id_estacion_origen  INT NOT NULL,
  est_id_estacion_destino INT NOT NULL,
  est_nombre_servicio     VARCHAR(80) NOT NULL,
  est_hora_salida         TIME NOT NULL,
  est_hora_retorno        TIME NOT NULL,
  est_minutos_transito    SMALLINT UNSIGNED NOT NULL,
  est_precio              DECIMAL(8,2) NOT NULL,
  est_moneda              CHAR(3) NOT NULL DEFAULT 'PEN',
  est_serv_activo         TINYINT(1) NOT NULL DEFAULT 1,
  est_serv_publicado      TINYINT(1) NOT NULL DEFAULT 0,
  est_fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_serv_origen  FOREIGN KEY (est_id_estacion_origen)  REFERENCES est_estacion(est_id_estacion),
  CONSTRAINT fk_serv_destino FOREIGN KEY (est_id_estacion_destino) REFERENCES est_estacion(est_id_estacion),
  CONSTRAINT chk_serv_precio CHECK (est_precio >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. zon_zona_turistica — zonas turísticas. Dueño: Travel Group Perú.
--    Cada zona parte de UNA sola estación (no M:N), por eso es FK directa y no
--    tabla puente. La FK es RESTRICT y no CASCADE a propósito: si nada se
--    borra, un borrado en cascada solo puede ser un accidente.
--    3FN: categoría y dificultad son ENUM (dominio fijo, sin atributos
--    propios); normalizarlos no evitaría ninguna anomalía de actualización
--    sobre una lista cerrada de 5 y 3 valores conocidos de antemano.
-- ----------------------------------------------------------------------------
CREATE TABLE zon_zona_turistica (
  zon_id_zona            INT AUTO_INCREMENT PRIMARY KEY,
  zon_id_estacion        INT NOT NULL,
  zon_codigo             VARCHAR(10) NOT NULL UNIQUE,
  zon_nombre             VARCHAR(150) NOT NULL,
  zon_categoria          ENUM('Naturaleza','Historia','Aventura','Cultura','Gastronomía') NOT NULL,
  zon_distancia_km       DECIMAL(5,2) NOT NULL,
  zon_minutos_ida_vuelta SMALLINT UNSIGNED NOT NULL,
  zon_dificultad         ENUM('Fácil','Moderada','Exigente') NOT NULL DEFAULT 'Fácil',
  zon_horario_atencion   VARCHAR(100) DEFAULT NULL,
  zon_ingreso            VARCHAR(60)  DEFAULT 'Libre',
  zon_descripcion        TEXT,
  zon_imagen_url         VARCHAR(255) DEFAULT NULL,
  zon_activo             TINYINT(1) NOT NULL DEFAULT 1,
  zon_publicado          TINYINT(1) NOT NULL DEFAULT 0,
  zon_fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_zona_estacion FOREIGN KEY (zon_id_estacion) REFERENCES est_estacion(est_id_estacion) ON DELETE RESTRICT,
  CONSTRAINT chk_zona_km CHECK (zon_distancia_km > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. zon_hito — waypoints ordenados del recorrido a pie de cada zona.
--    Tabla hija clásica para eliminar el grupo repetitivo "hitos[]" (guardarlo
--    como lista en una columna violaría 1FN). Aquí sí hay CASCADE: un hito no
--    tiene vida propia fuera de su zona y la aplicación los reescribe en bloque
--    al guardar el formulario.
-- ----------------------------------------------------------------------------
CREATE TABLE zon_hito (
  zon_id_hito      INT AUTO_INCREMENT PRIMARY KEY,
  zon_id_zona      INT NOT NULL,
  zon_orden        TINYINT UNSIGNED NOT NULL,
  zon_hito_titulo  VARCHAR(120) NOT NULL,
  zon_hito_detalle VARCHAR(255) NOT NULL,
  CONSTRAINT fk_hito_zona FOREIGN KEY (zon_id_zona) REFERENCES zon_zona_turistica(zon_id_zona) ON DELETE CASCADE,
  UNIQUE KEY uq_hito_orden (zon_id_zona, zon_orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. cli_prevision — caché diaria de previsión climática por estación
--    (Open-Meteo, en el papel que el caso asigna al SENAMHI). Clave natural
--    (estación, fecha) resguardada con UNIQUE para permitir un upsert
--    idempotente en cada sincronización.
-- ----------------------------------------------------------------------------
CREATE TABLE cli_prevision (
  cli_id_prevision  INT AUTO_INCREMENT PRIMARY KEY,
  est_id_estacion   INT NOT NULL,
  cli_fecha         DATE NOT NULL,
  cli_temp          DECIMAL(4,1) DEFAULT NULL,
  cli_condicion     VARCHAR(80)  DEFAULT NULL,
  cli_sensacion     DECIMAL(4,1) DEFAULT NULL,
  cli_prob_lluvia   DECIMAL(5,1) DEFAULT NULL,
  cli_viento_kmh    DECIMAL(5,1) DEFAULT NULL,
  cli_uv_indice     DECIMAL(4,1) DEFAULT NULL,
  cli_aviso         VARCHAR(200) DEFAULT NULL,
  cli_fuente        VARCHAR(40)  NOT NULL DEFAULT 'Open-Meteo',
  cli_fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_clima_estacion FOREIGN KEY (est_id_estacion) REFERENCES est_estacion(est_id_estacion) ON DELETE CASCADE,
  UNIQUE KEY uq_clima_estacion_fecha (est_id_estacion, cli_fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. usr_admin — cuentas del panel. Un rol por cuenta; el rol decide qué
--    módulos ve y qué operaciones puede ejecutar (se comprueba en el servidor,
--    no solo en el menú del cliente). Nunca se expone usr_contrasena_hash
--    fuera del backend.
-- ----------------------------------------------------------------------------
CREATE TABLE usr_admin (
  usr_id_admin        INT AUTO_INCREMENT PRIMARY KEY,
  usr_usuario         VARCHAR(60)  NOT NULL UNIQUE,
  usr_contrasena_hash VARCHAR(255) NOT NULL,
  usr_nombre_completo VARCHAR(120) DEFAULT NULL,
  usr_rol             ENUM('perurail','travelgroup','mtc') NOT NULL DEFAULT 'travelgroup',
  usr_entidad         VARCHAR(80)  DEFAULT NULL,
  usr_activo          TINYINT(1)   NOT NULL DEFAULT 1,
  usr_fecha_creacion  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. rut_informe — un registro por informe turístico generado. El turista
--    final no se autentica, por eso no hay FK a usuario: es una tabla de
--    hechos (evento) que referencia catálogos por FK pero registra los datos
--    propios del evento. No es una violación de 3FN, es el patrón estándar
--    para tablas de evento o auditoría.
-- ----------------------------------------------------------------------------
CREATE TABLE rut_informe (
  rut_id_informe          INT AUTO_INCREMENT PRIMARY KEY,
  rut_codigo              VARCHAR(20) NOT NULL UNIQUE,
  est_id_estacion         INT NOT NULL,
  zon_id_zona             INT NOT NULL,
  rut_intereses           VARCHAR(150) NOT NULL,
  rut_dificultad_max      ENUM('Fácil','Moderada','Exigente') NOT NULL,
  rut_minutos_max         SMALLINT UNSIGNED NOT NULL,
  rut_fecha_viaje         DATE NOT NULL,
  rut_fecha_generacion    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rut_distancia_total_km  DECIMAL(5,2) NOT NULL,
  rut_tiempo_total_min    SMALLINT UNSIGNED NOT NULL,
  rut_dificultad_resultado ENUM('Fácil','Moderada','Exigente') NOT NULL,
  CONSTRAINT fk_informe_estacion FOREIGN KEY (est_id_estacion) REFERENCES est_estacion(est_id_estacion),
  CONSTRAINT fk_informe_zona     FOREIGN KEY (zon_id_zona)     REFERENCES zon_zona_turistica(zon_id_zona)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NOTA: la sincronización del clima (SENAMHI, vía Open-Meteo) ya no depende
-- de un botón manual ni de una bitácora propia. `Backend/jobs/clima.cron.js`
-- precalienta `cli_prevision` al arrancar el servidor y todos los días a las
-- 05:00 hora de Lima; "cuándo fue la última sincronización" se responde con
-- MAX(cli_fecha_actualizacion) sobre esa misma tabla, sin tabla aparte.

-- NOTA: las 5 fotografías del paso 1 del planificador (una por categoría de
-- interés) ya no viven en base de datos. Vivieron en una tabla `cfg_interes`
-- editable desde un panel "Configuración", pero en la práctica eran 5 fotos
-- fijas que nunca cambiaron por campaña; hoy son archivos del repositorio en
-- `Frontend/public/img/intereses/` (ver Frontend/src/app/core/config/intereses-imagenes.ts).

CREATE INDEX idx_servicio_origen  ON est_servicio(est_id_estacion_origen);
CREATE INDEX idx_zona_estacion    ON zon_zona_turistica(zon_id_estacion);
CREATE INDEX idx_informe_fecha    ON rut_informe(rut_fecha_generacion);
-- El sitio público filtra siempre por estas dos banderas: conviene que el
-- índice cubra la combinación y no cada columna por separado.
CREATE INDEX idx_zona_visible     ON zon_zona_turistica(zon_activo, zon_publicado);
CREATE INDEX idx_estacion_visible ON est_estacion(est_activo, est_publicado);
CREATE INDEX idx_servicio_visible ON est_servicio(est_serv_activo, est_serv_publicado);
