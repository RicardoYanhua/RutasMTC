-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: bd_rutas_turisticas
-- ------------------------------------------------------
-- Server version	9.7.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'e7868860-604f-11f1-88d4-d843ae2e16af:1-14275';

--
-- Table structure for table `cli_prevision`
--

DROP TABLE IF EXISTS `cli_prevision`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cli_prevision` (
  `cli_id_prevision` int NOT NULL AUTO_INCREMENT,
  `est_id_estacion` int NOT NULL,
  `cli_fecha` date NOT NULL,
  `cli_temp` decimal(4,1) DEFAULT NULL,
  `cli_condicion` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cli_sensacion` decimal(4,1) DEFAULT NULL,
  `cli_prob_lluvia` decimal(5,1) DEFAULT NULL,
  `cli_viento_kmh` decimal(5,1) DEFAULT NULL,
  `cli_uv_indice` decimal(4,1) DEFAULT NULL,
  `cli_aviso` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cli_fuente` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Open-Meteo',
  `cli_fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cli_id_prevision`),
  UNIQUE KEY `uq_clima_estacion_fecha` (`est_id_estacion`,`cli_fecha`),
  CONSTRAINT `fk_clima_estacion` FOREIGN KEY (`est_id_estacion`) REFERENCES `est_estacion` (`est_id_estacion`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cli_prevision`
--

LOCK TABLES `cli_prevision` WRITE;
/*!40000 ALTER TABLE `cli_prevision` DISABLE KEYS */;
INSERT INTO `cli_prevision` VALUES (1,1,'2026-08-31',22.3,'Nublado',21.4,0.0,12.5,9.5,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:05'),(2,2,'2026-08-31',22.2,'Nublado',21.9,0.0,9.5,9.5,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:05'),(3,3,'2026-08-31',19.1,'Nublado',18.3,0.0,9.5,9.5,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:05'),(4,4,'2026-08-31',23.2,'Nublado',22.6,33.0,18.2,9.5,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:06'),(5,5,'2026-08-31',25.8,'Nublado',25.6,0.0,18.2,9.5,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:06'),(6,6,'2026-08-31',26.0,'Nublado',25.9,33.0,18.2,9.6,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:06'),(7,7,'2026-08-31',25.9,'Llovizna ligera',27.4,96.0,8.0,8.2,'Lleva ropa impermeable: alta probabilidad de lluvia durante el recorrido.','Open-Meteo','2026-08-31 19:58:06'),(8,8,'2026-08-31',16.2,'Llovizna moderada',17.7,69.0,9.4,8.0,'Lleva ropa impermeable: alta probabilidad de lluvia durante el recorrido.','Open-Meteo','2026-08-31 19:58:07'),(9,9,'2026-08-31',21.1,'Nublado',20.4,0.0,6.2,9.6,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:07'),(10,10,'2026-08-31',12.6,'Parcialmente nublado',9.6,0.0,15.3,9.7,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:07'),(11,11,'2026-08-31',20.6,'Despejado',17.4,0.0,20.3,9.5,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:07'),(12,12,'2026-08-31',19.1,'Despejado',18.5,0.0,10.8,9.5,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:08'),(13,13,'2026-08-31',24.9,'Despejado',22.8,0.0,15.1,9.0,'Usa protector solar y sombrero: índice UV muy alto en la zona.','Open-Meteo','2026-08-31 19:58:08');
/*!40000 ALTER TABLE `cli_prevision` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `est_estacion`
--

DROP TABLE IF EXISTS `est_estacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `est_estacion` (
  `est_id_estacion` int NOT NULL AUTO_INCREMENT,
  `est_codigo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `est_nombre` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `est_region` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `est_altitud_msnm` smallint unsigned NOT NULL,
  `est_andenes` tinyint unsigned NOT NULL DEFAULT '1',
  `est_latitud` decimal(9,6) NOT NULL,
  `est_longitud` decimal(9,6) NOT NULL,
  `est_badge` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `est_imagen_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `est_activo` tinyint(1) NOT NULL DEFAULT '1',
  `est_publicado` tinyint(1) NOT NULL DEFAULT '0',
  `est_fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`est_id_estacion`),
  UNIQUE KEY `est_codigo` (`est_codigo`),
  KEY `idx_estacion_visible` (`est_activo`,`est_publicado`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `est_estacion`
--

LOCK TABLES `est_estacion` WRITE;
/*!40000 ALTER TABLE `est_estacion` DISABLE KEYS */;
INSERT INTO `est_estacion` VALUES (1,'CUS','Cusco San Pedro','Cusco',3399,2,-13.520500,-71.982000,'Centro histórico','/uploads/estacion-1788182737853-9gjgx5id.png',1,1,'2026-08-31 13:25:40'),(2,'WAN','Cusco Wanchaq','Cusco',3360,2,-13.526500,-71.966600,'Ruta a Puno','/uploads/estacion-1788182785514-w7xiek0o.jpg',1,1,'2026-08-31 13:26:27'),(3,'POR','Poroy','Cusco',3465,2,-13.484900,-71.967500,'Vía Cusco','/uploads/estacion-1788183119596-ytncsob5.jpg',1,1,'2026-08-31 13:32:00'),(4,'PAC','Pachar','Cusco · Valle Sagrado',2790,1,-13.290500,-72.207200,'Servicio alterno','/uploads/estacion-1788183074552-wd1den6n.jpg',1,1,'2026-08-31 13:31:16'),(5,'URU','Urubamba','Cusco · Valle Sagrado',2871,1,-13.305000,-72.116700,'Servicio estacional','/uploads/estacion-1788183280236-i9b9y6ov.jpg',1,1,'2026-08-31 13:34:41'),(6,'OLL','Ollantaytambo','Cusco · Valle Sagrado',2792,3,-13.258300,-72.263600,'Mayor afluencia','/uploads/estacion-1788183034610-kmzc0994.jpg',1,1,'2026-08-31 13:30:36'),(7,'AGC','Machu Picchu Pueblo','Cusco · Aguas Calientes',2040,4,-13.154700,-72.525600,'Terminal','/uploads/estacion-1788182993185-ct4b6reb.jpg',1,1,'2026-08-31 13:29:55'),(8,'HID','Hidroeléctrica','Cusco · Santa Teresa',1850,1,-13.174700,-72.665000,'Acceso alterno','/uploads/estacion-1788182823132-d0a0agpt.jpg',1,1,'2026-08-31 13:27:04'),(9,'SIC','Sicuani','Cusco · Canchis',3552,1,-14.269400,-71.226100,NULL,'/uploads/estacion-1788183190345-gileayfd.jpg',1,1,'2026-08-31 13:33:12'),(10,'RAY','La Raya','Cusco / Puno · Abra',4338,1,-14.508300,-70.982500,'Punto más alto','/uploads/estacion-1788182923529-2aiajzee.jpg',1,1,'2026-08-31 13:28:45'),(11,'JUL','Juliaca','Puno',3825,2,-15.493900,-70.132900,NULL,'/uploads/estacion-1788182856385-jtiklwd2.jpg',1,1,'2026-08-31 13:27:38'),(12,'PUN','Puno','Puno · Lago Titicaca',3827,2,-15.840200,-70.021900,'Terminal sur','/uploads/estacion-1788183167855-csim0ckj.jpg',1,1,'2026-08-31 13:32:49'),(13,'AQP','Arequipa','Arequipa',2335,2,-16.398900,-71.535000,NULL,'/uploads/estacion-1788182697032-5gcatgzo.jpg',1,1,'2026-08-31 13:24:59');
/*!40000 ALTER TABLE `est_estacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `est_servicio`
--

DROP TABLE IF EXISTS `est_servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `est_servicio` (
  `est_id_servicio` int NOT NULL AUTO_INCREMENT,
  `est_id_estacion_origen` int NOT NULL,
  `est_id_estacion_destino` int NOT NULL,
  `est_nombre_servicio` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `est_hora_salida` time NOT NULL,
  `est_hora_retorno` time NOT NULL,
  `est_minutos_transito` smallint unsigned NOT NULL,
  `est_precio` decimal(8,2) NOT NULL,
  `est_moneda` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PEN',
  `est_serv_activo` tinyint(1) NOT NULL DEFAULT '1',
  `est_serv_publicado` tinyint(1) NOT NULL DEFAULT '0',
  `est_fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`est_id_servicio`),
  KEY `fk_serv_destino` (`est_id_estacion_destino`),
  KEY `idx_servicio_origen` (`est_id_estacion_origen`),
  KEY `idx_servicio_visible` (`est_serv_activo`,`est_serv_publicado`),
  CONSTRAINT `fk_serv_destino` FOREIGN KEY (`est_id_estacion_destino`) REFERENCES `est_estacion` (`est_id_estacion`),
  CONSTRAINT `fk_serv_origen` FOREIGN KEY (`est_id_estacion_origen`) REFERENCES `est_estacion` (`est_id_estacion`),
  CONSTRAINT `chk_serv_precio` CHECK ((`est_precio` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `est_servicio`
--

LOCK TABLES `est_servicio` WRITE;
/*!40000 ALTER TABLE `est_servicio` DISABLE KEYS */;
INSERT INTO `est_servicio` VALUES (1,6,7,'Expedition','07:05:00','18:45:00',100,210.00,'PEN',1,1,'2026-08-31 12:22:21'),(2,6,7,'Vistadome','08:53:00','17:23:00',95,320.00,'PEN',1,1,'2026-08-31 12:22:21'),(3,6,7,'Vistadome Observatory','07:45:00','16:43:00',95,380.00,'PEN',1,1,'2026-08-31 12:22:21'),(4,5,7,'Sacred Valley','08:10:00','19:30:00',150,260.00,'PEN',1,1,'2026-08-31 12:22:21'),(5,4,7,'Expedition','06:10:00','17:50:00',115,220.00,'PEN',1,1,'2026-08-31 12:22:21'),(6,3,7,'Hiram Bingham','09:05:00','21:15:00',210,1290.00,'PEN',1,1,'2026-08-31 12:22:21'),(7,1,7,'Expedition Bimodal','05:00:00','20:30:00',240,240.00,'PEN',1,1,'2026-08-31 12:22:21'),(8,2,12,'Titicaca Train','07:30:00','18:00:00',630,1150.00,'PEN',1,1,'2026-08-31 12:22:21'),(9,12,2,'Titicaca Train','07:30:00','18:00:00',630,1150.00,'PEN',1,1,'2026-08-31 12:22:21'),(10,11,2,'Titicaca Train','09:40:00','16:10:00',480,940.00,'PEN',1,1,'2026-08-31 12:22:21'),(11,9,2,'Titicaca Train','10:50:00','15:05:00',180,620.00,'PEN',1,1,'2026-08-31 12:22:21'),(12,13,12,'Tren Turístico','08:00:00','19:40:00',420,680.00,'PEN',1,1,'2026-08-31 12:22:21'),(13,8,7,'Tren Local','06:45:00','16:30:00',45,80.00,'PEN',1,1,'2026-08-31 12:22:21');
/*!40000 ALTER TABLE `est_servicio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rut_informe`
--

DROP TABLE IF EXISTS `rut_informe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rut_informe` (
  `rut_id_informe` int NOT NULL AUTO_INCREMENT,
  `rut_codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `est_id_estacion` int NOT NULL,
  `zon_id_zona` int NOT NULL,
  `rut_intereses` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rut_dificultad_max` enum('Fácil','Moderada','Exigente') COLLATE utf8mb4_unicode_ci NOT NULL,
  `rut_minutos_max` smallint unsigned NOT NULL,
  `rut_fecha_viaje` date NOT NULL,
  `rut_fecha_generacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rut_distancia_total_km` decimal(5,2) NOT NULL,
  `rut_tiempo_total_min` smallint unsigned NOT NULL,
  `rut_dificultad_resultado` enum('Fácil','Moderada','Exigente') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`rut_id_informe`),
  UNIQUE KEY `rut_codigo` (`rut_codigo`),
  KEY `fk_informe_estacion` (`est_id_estacion`),
  KEY `fk_informe_zona` (`zon_id_zona`),
  KEY `idx_informe_fecha` (`rut_fecha_generacion`),
  CONSTRAINT `fk_informe_estacion` FOREIGN KEY (`est_id_estacion`) REFERENCES `est_estacion` (`est_id_estacion`),
  CONSTRAINT `fk_informe_zona` FOREIGN KEY (`zon_id_zona`) REFERENCES `zon_zona_turistica` (`zon_id_zona`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rut_informe`
--

LOCK TABLES `rut_informe` WRITE;
/*!40000 ALTER TABLE `rut_informe` DISABLE KEYS */;
/*!40000 ALTER TABLE `rut_informe` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usr_admin`
--

DROP TABLE IF EXISTS `usr_admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usr_admin` (
  `usr_id_admin` int NOT NULL AUTO_INCREMENT,
  `usr_usuario` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usr_contrasena_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usr_nombre_completo` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usr_rol` enum('perurail','travelgroup','mtc') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'travelgroup',
  `usr_entidad` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usr_activo` tinyint(1) NOT NULL DEFAULT '1',
  `usr_fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usr_id_admin`),
  UNIQUE KEY `usr_usuario` (`usr_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usr_admin`
--

LOCK TABLES `usr_admin` WRITE;
/*!40000 ALTER TABLE `usr_admin` DISABLE KEYS */;
INSERT INTO `usr_admin` VALUES (1,'operador.tgp','$2b$10$R.VaW6nX/5UrqADaXJpzC.5uTktxlcblAiwzcWR9Eq7FHwF7GQpWC','Operador Travel Group Perú','travelgroup','Travel Group Perú',1,'2026-08-31 12:22:21'),(2,'operador.prl','$2b$10$R.VaW6nX/5UrqADaXJpzC.5uTktxlcblAiwzcWR9Eq7FHwF7GQpWC','Operador PeruRail','perurail','PeruRail',1,'2026-08-31 12:22:21'),(3,'gestor.mtc','$2b$10$R.VaW6nX/5UrqADaXJpzC.5uTktxlcblAiwzcWR9Eq7FHwF7GQpWC','Gestor MTC','mtc','Ministerio de Transportes y Comunicaciones',1,'2026-08-31 12:22:21');
/*!40000 ALTER TABLE `usr_admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `zon_hito`
--

DROP TABLE IF EXISTS `zon_hito`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zon_hito` (
  `zon_id_hito` int NOT NULL AUTO_INCREMENT,
  `zon_id_zona` int NOT NULL,
  `zon_orden` tinyint unsigned NOT NULL,
  `zon_hito_titulo` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zon_hito_detalle` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`zon_id_hito`),
  UNIQUE KEY `uq_hito_orden` (`zon_id_zona`,`zon_orden`),
  CONSTRAINT `fk_hito_zona` FOREIGN KEY (`zon_id_zona`) REFERENCES `zon_zona_turistica` (`zon_id_zona`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `zon_hito`
--

LOCK TABLES `zon_hito` WRITE;
/*!40000 ALTER TABLE `zon_hito` DISABLE KEYS */;
INSERT INTO `zon_hito` VALUES (1,1,1,'Salida del andén','Cruza la calle Túpac Amaru hacia la puerta principal del mercado.'),(2,1,2,'Pasillo de jugos','Sigue por el corredor central hasta los puestos de fruta y pan.'),(3,2,1,'Avenida El Sol','Baja por la avenida principal en dirección al convento.'),(4,2,2,'Muro curvo inca','Rodea el ábside y observa la sillería pulida del recinto.'),(5,3,1,'Calle Mantas','Sube por la calle comercial hacia la plaza mayor.'),(6,3,2,'Atrio de la Catedral','Bordea el atrio y la portada de la Compañía de Jesús.'),(7,4,1,'Cuesta de San Blas','Toma la cuesta empedrada desde la plaza mayor.'),(8,4,2,'Plazoleta de San Blas','Llega al templo y a los talleres de artesanos del barrio.'),(9,5,1,'Salida a la avenida','Camina una cuadra hacia el interior del barrio de Wanchaq.'),(10,5,2,'Pasaje de comidas','Recorre los puestos de caldo de gallina y chicharrón.'),(11,6,1,'Avenida de la Cultura','Sigue la vereda arbolada hasta la entrada del parque.'),(12,6,2,'Alameda central','Da la vuelta al estanque y regresa por el otro costado.'),(13,7,1,'Trocha junto a la vía','Toma el camino hacia el oeste, paralelo a la línea férrea.'),(14,7,2,'Curva del mirador','Sube la pendiente suave hasta el promontorio con vista al valle.'),(15,8,1,'Cruce de la plazoleta','Camina por la calle principal hacia el templo.'),(16,8,2,'Fachada de la capilla','Observa la arquería colonial de adobe y el campanario.'),(17,9,1,'Camino al río','Baja desde el andén hacia la ribera del Vilcanota.'),(18,9,2,'Estribos del puente','Observa la cantería inca que aún sostiene el cruce.'),(19,10,1,'Sendero de ribera','Sigue el camino de tierra aguas arriba, entre sauces.'),(20,10,2,'Balcón sobre el cañón','Llega al ensanche con vista a los andenes de la ladera.'),(21,11,1,'Salida de la estación','Camina hacia la avenida principal de Urubamba.'),(22,11,2,'Puestos de comida local','Prueba el pan artesanal y la chicha de jora.'),(23,12,1,'Plaza de Urubamba','Ubica la torre colonial junto al parque.'),(24,12,2,'Nave principal','Observa el retablo barroco del siglo XVII.'),(25,13,1,'Cruce del río Urubamba','Sigue el camino rural hacia las colinas del norte.'),(26,13,2,'Cima del mirador','Contempla los andenes y el valle sagrado completo.'),(27,14,1,'Acceso principal','Sube por la escalinata de terrazas agrícolas.'),(28,14,2,'Templo del Sol','Llega a la plataforma superior con los muros ciclópeos.'),(29,15,1,'Inicio del sendero','Sube por el camino de piedra al este del pueblo.'),(30,15,2,'Mirador de los graneros','Alcanza los depósitos incas colgados en la ladera.'),(31,16,1,'Plaza principal','Recorre los canales de agua originales incas.'),(32,16,2,'Calle Del Medio','Observa los muros incas que sostienen las viviendas actuales.'),(33,17,1,'Portal del mercado','Entra por el costado de la plaza principal.'),(34,17,2,'Pasaje de textiles','Recorre los puestos de tejido y comida de la zona.'),(35,18,1,'Casona de adobe','Ubica la entrada del museo en la calle Patacalle.'),(36,18,2,'Sala de interpretación','Recorre las salas sobre agricultura y cantería inca.'),(37,19,1,'Av. Pachacútec','Sube por la avenida principal desde la plaza.'),(38,19,2,'Complejo termal','Ingresa a las pozas de aguas termales naturales.'),(39,20,1,'Puente sobre el Vilcanota','Cruza hacia la zona comercial del pueblo.'),(40,20,2,'Pasaje artesanal','Recorre los puestos de textiles y café.'),(41,21,1,'Camino a Hidroeléctrica','Camina junto a la vía del tren aguas abajo.'),(42,21,2,'Ingreso al jardín','Observa las especies de mariposas nativas de la selva alta.'),(43,22,1,'Puente Ruinas','Sigue la carretera hacia el puente sobre el río.'),(44,22,2,'Sala arqueológica','Recorre las piezas halladas en el santuario histórico.'),(45,23,1,'Vía férrea aguas abajo','Camina por el costado de la vía, atento a los trenes.'),(46,23,2,'Sendero al bosque','Desvía hacia el jardín y la catarata de Mandor.'),(47,24,1,'Salida del andén','Sube las escaleras hacia el centro del pueblo.'),(48,24,2,'Atrio de la iglesia','Rodea la plaza y asómate al mirador sobre el río.'),(49,25,1,'Sendero junto a la vía','Sal de la central siguiendo el camino peatonal.'),(50,25,2,'Poza de la catarata','Llega al salto de agua dentro del bosque húmedo.'),(51,26,1,'Camino de servicio','Toma el desvío que sube por encima de la central.'),(52,26,2,'Balcón natural','Asómate al cañón con el río muy por debajo.'),(53,27,1,'Jirón principal','Camina desde la estación hacia el centro de Sicuani.'),(54,27,2,'Portales de la plaza','Recorre los portales y la fachada de la catedral.'),(55,28,1,'Puente del Vilcanota','Cruza hacia el sector donde se instala la feria.'),(56,28,2,'Zona de quesos','Recorre los puestos de queso y papa nativa.'),(57,29,1,'Salida noreste','Toma el camino de tierra que asciende fuera de la ciudad.'),(58,29,2,'Pozas de Uyurmiri','Llega a las fuentes termales al pie del cerro.'),(59,30,1,'Andén del abra','Baja del tren en el punto más alto de la línea.'),(60,30,2,'Mirador de la cordillera','Camina hasta el hito y observa el nevado Chimboya.'),(61,31,1,'Inicio de la puna','Sigue la huella hacia el norte, sobre pasto de altura.'),(62,31,2,'Vista del glaciar','Alcanza el promontorio frente al nevado. Regresa antes del mediodía.'),(63,32,1,'Jirón San Román','Camina desde la estación hacia el centro de Juliaca.'),(64,32,2,'Atrio de la catedral','Rodea la plaza y la torre del reloj municipal.'),(65,33,1,'Avenida Huancané','Sigue la avenida hacia el sector comercial.'),(66,33,2,'Zona de comidas','Prueba el chairo y el thimpo de trucha del altiplano.'),(67,34,1,'Base del cerro','Toma la escalinata del vía crucis en el barrio alto.'),(68,34,2,'Cruz de la cima','Alcanza la cima con vista de la meseta del Collao.'),(69,35,1,'Salida al malecón','Camina desde la estación hacia la orilla del lago.'),(70,35,2,'Muelle turístico','Recorre el muelle desde donde parten las lanchas a los Uros.'),(71,36,1,'Jirón Lima','Sube por la calle peatonal hacia la plaza.'),(72,36,2,'Fachada de sillar','Observa la portada barroca de la catedral de Puno.'),(73,37,1,'Escalinata inicial','Empieza la subida desde el jirón Independencia.'),(74,37,2,'Cóndor de piedra','Llega al mirador con la escultura y la vista de la bahía.'),(75,38,1,'Jirón Deustua','Camina hacia el centro histórico de Puno.'),(76,38,2,'Patio de la casona','Entra al patio empedrado del siglo XVII.'),(77,39,1,'Calle Santa Catalina','Camina desde la plaza hacia el muro del monasterio.'),(78,39,2,'Calles de sillar','Recorre los patios y las calles interiores pintadas.'),(79,40,1,'Portal de la Municipalidad','Entra a la plaza por el costado porticado.'),(80,40,2,'Atrio de la basílica','Rodea la catedral con el Misti al fondo.'),(81,41,1,'Calle San Camilo','Camina desde la plaza hacia el mercado histórico.'),(82,41,2,'Nave de hierro','Recorre los pasillos bajo la estructura metálica.'),(83,42,1,'Puente Grau','Cruza el puente hacia el distrito de Yanahuara.'),(84,42,2,'Arquerías del mirador','Llega a los arcos de sillar con vista a los tres volcanes.');
/*!40000 ALTER TABLE `zon_hito` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `zon_zona_turistica`
--

DROP TABLE IF EXISTS `zon_zona_turistica`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zon_zona_turistica` (
  `zon_id_zona` int NOT NULL AUTO_INCREMENT,
  `zon_id_estacion` int NOT NULL,
  `zon_codigo` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zon_nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zon_categoria` enum('Naturaleza','Historia','Aventura','Cultura','Gastronomía') COLLATE utf8mb4_unicode_ci NOT NULL,
  `zon_distancia_km` decimal(5,2) NOT NULL,
  `zon_minutos_ida_vuelta` smallint unsigned NOT NULL,
  `zon_dificultad` enum('Fácil','Moderada','Exigente') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Fácil',
  `zon_horario_atencion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zon_ingreso` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT 'Libre',
  `zon_descripcion` text COLLATE utf8mb4_unicode_ci,
  `zon_imagen_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zon_activo` tinyint(1) NOT NULL DEFAULT '1',
  `zon_publicado` tinyint(1) NOT NULL DEFAULT '0',
  `zon_fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`zon_id_zona`),
  UNIQUE KEY `zon_codigo` (`zon_codigo`),
  KEY `idx_zona_estacion` (`zon_id_estacion`),
  KEY `idx_zona_visible` (`zon_activo`,`zon_publicado`),
  CONSTRAINT `fk_zona_estacion` FOREIGN KEY (`zon_id_estacion`) REFERENCES `est_estacion` (`est_id_estacion`) ON DELETE RESTRICT,
  CONSTRAINT `chk_zona_km` CHECK ((`zon_distancia_km` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `zon_zona_turistica`
--

LOCK TABLES `zon_zona_turistica` WRITE;
/*!40000 ALTER TABLE `zon_zona_turistica` DISABLE KEYS */;
INSERT INTO `zon_zona_turistica` VALUES (1,1,'ZN-01','Mercado Central de San Pedro','Gastronomía',0.15,30,'Fácil','06:00-17:00','Libre','Mercado de abastos frente a la estación, con puestos de jugos, panes y comida cusqueña.','/uploads/zona-1788184024231-vraqi9wc.jpg',1,1,'2026-08-31 13:47:05'),(2,1,'ZN-02','Qorikancha (Templo del Sol)','Historia',0.90,70,'Fácil','08:30-17:30','S/ 15','Recinto inca sobre el que se levantó el convento de Santo Domingo; muros de sillería.','/uploads/zona-1788184234505-smogvvca.jpg',1,1,'2026-08-31 13:50:35'),(3,1,'ZN-03','Plaza de Armas y Catedral del Cusco','Cultura',0.80,60,'Fácil','10:00-18:00','S/ 25 (Circuito Religioso)','Plaza mayor de la ciudad, con la Catedral y la Compañía de Jesús.','/uploads/zona-1788184673421-r06cf5wb.jpg',1,1,'2026-08-31 13:57:54'),(4,1,'ZN-04','Barrio de San Blas','Cultura',1.40,95,'Moderada','Todo el día','Libre','Barrio de artesanos en cuesta, calles empedradas y talleres de imaginería.','/uploads/zona-1788183522098-lu1va5m1.jpg',1,1,'2026-08-31 13:38:43'),(5,2,'ZN-05','Mercado de Wanchaq','Gastronomía',0.50,30,'Fácil','06:00-18:00','Libre','Mercado de barrio con comida local y productos del valle.','/uploads/zona-1788184080864-dr8om71x.jpg',1,1,'2026-08-31 13:48:02'),(6,2,'ZN-06','Parque de la Madre','Naturaleza',0.70,35,'Fácil','Todo el día','Libre','Alameda arbolada junto a la avenida de la Cultura, buena para estirar antes del tren.','/uploads/zona-1788184549233-dzgyg963.jpg',1,1,'2026-08-31 13:55:50'),(7,3,'ZN-07','Mirador de Poroy','Naturaleza',1.20,45,'Fácil','Todo el día','Libre','Promontorio con vista panorámica al valle de Poroy y a la línea férrea.','/uploads/zona-1788183824755-4pore8dr.jpg',1,1,'2026-08-31 13:43:46'),(8,3,'ZN-08','Iglesia de Poroy','Historia',0.80,25,'Fácil','08:00-17:00','Libre','Templo de adobe del periodo colonial junto a la plaza del pueblo.','/uploads/zona-1788183683567-8b6qbrb7.jpg',1,1,'2026-08-31 13:41:24'),(9,4,'ZN-09','Puente Inca de Pachar','Historia',0.60,30,'Fácil','Todo el día','Libre','Estribos incas sobre el río Vilcanota, en el cruce hacia Ollantaytambo.','/uploads/zona-1788184280701-ke5o8nqf.jpg',1,1,'2026-08-31 13:51:21'),(10,4,'ZN-10','Ribera del Vilcanota','Naturaleza',1.50,75,'Moderada','Todo el día','Libre','Camino de ribera entre andenes y sauces, con vista al cañón del río.','/uploads/zona-1788184207031-uuoh0j07.jpg',1,1,'2026-08-31 13:50:08'),(11,5,'ZN-11','Mercado Artesanal de Urubamba','Gastronomía',0.60,30,'Fácil','07:00-18:00','Libre','Puestos de comida y artesanía típica del Valle Sagrado.','/uploads/zona-1788183973832-a7cw15mz.jpg',1,1,'2026-08-31 13:46:15'),(12,5,'ZN-12','Iglesia San Pedro Apóstol','Historia',0.40,20,'Fácil','08:00-12:00, 15:00-18:00','Libre','Templo colonial del siglo XVII con retablo barroco y pinturas cusqueñas.','/uploads/zona-1788183848489-9os3huzf.jpg',1,1,'2026-08-31 13:44:09'),(13,5,'ZN-13','Mirador del Valle Sagrado','Naturaleza',2.00,110,'Moderada','Todo el día','Libre','Vista elevada de los andenes y del río Urubamba, subiendo por camino rural.','/uploads/zona-1788184351130-djytj84j.jpg',1,1,'2026-08-31 13:52:32'),(14,6,'ZN-14','Fortaleza de Ollantaytambo','Historia',1.00,95,'Moderada','07:00-17:30','S/ 70 (Boleto Turístico)','Complejo arqueológico inca con terrazas agrícolas y el Templo del Sol.','/uploads/zona-1788183650166-tbq8d7ny.webp',1,1,'2026-08-31 13:40:51'),(15,6,'ZN-15','Pinkuylluna (graneros incas)','Aventura',1.60,105,'Exigente','07:00-16:30','Libre','Sendero de piedra hasta los graneros incas colgados en la ladera oriental.','/uploads/zona-1788184570010-69f0v87b.jpg',1,1,'2026-08-31 13:56:11'),(16,6,'ZN-16','Plaza y calles incas','Cultura',0.50,35,'Fácil','Todo el día','Libre','Trazado urbano inca en uso desde el siglo XV, con canales de agua a cielo abierto.','/uploads/zona-1788184729929-zjbodwsk.jpg',1,1,'2026-08-31 13:58:50'),(17,6,'ZN-17','Mercado de Ollantaytambo','Gastronomía',0.40,25,'Fácil','07:00-19:00','Libre','Pasaje de comida y textiles junto a la plaza principal.','/uploads/zona-1788184044648-1ikc34go.jpg',1,1,'2026-08-31 13:47:25'),(18,6,'ZN-18','Museo CATCCO','Cultura',0.60,40,'Fácil','09:00-17:00','S/ 10','Centro de interpretación del patrimonio de Ollantaytambo, en una casona de adobe.','/uploads/zona-1788184491722-eyh807yi.webp',1,1,'2026-08-31 13:54:52'),(19,7,'ZN-19','Aguas Termales de Machu Picchu','Aventura',0.90,60,'Moderada','05:00-20:30','S/ 20','Pozas termales naturales al pie de la montaña, al final de la Av. Pachacútec.','/uploads/zona-1788183426453-vgt43byu.jpg',1,1,'2026-08-31 13:37:08'),(20,7,'ZN-20','Mercado Artesanal de Aguas Calientes','Gastronomía',0.50,30,'Fácil','08:00-20:00','Libre','Pasaje comercial con textiles, café de altura y gastronomía local.','/uploads/zona-1788183943356-8pi522af.jpg',1,1,'2026-08-31 13:45:44'),(21,7,'ZN-21','Jardín de Mariposas','Naturaleza',1.10,45,'Fácil','09:00-15:30','S/ 15','Vivero de mariposas nativas de la selva alta cusqueña, camino a Hidroeléctrica.','/uploads/zona-1788183917225-6v45pygu.jpg',1,1,'2026-08-31 13:45:18'),(22,7,'ZN-22','Museo de Sitio Manuel Chávez Ballón','Historia',1.80,105,'Moderada','09:00-16:00','S/ 22','Museo arqueológico junto al puente Ruinas, con las piezas halladas en el santuario.','/uploads/zona-1788184516526-lesik6dg.jpg',1,1,'2026-08-31 13:55:18'),(23,7,'ZN-23','Jardín Botánico de Mandor','Naturaleza',3.00,155,'Moderada','07:00-17:00','S/ 10','Bosque de neblina y catarata, siguiendo la vía férrea aguas abajo.','/uploads/zona-1788183882400-y3xq88pi.jpg',1,1,'2026-08-31 13:44:43'),(24,7,'ZN-24','Plaza Manco Cápac','Cultura',0.30,20,'Fácil','Todo el día','Libre','Plaza central del pueblo, con la iglesia y el mirador sobre el río Vilcanota.','/uploads/zona-1788184698514-y2ucgjs0.jpg',1,1,'2026-08-31 13:58:19'),(25,8,'ZN-25','Catarata de Mandor','Naturaleza',2.50,130,'Moderada','07:00-16:00','S/ 10','Salto de agua en bosque húmedo, por el sendero que sigue la vía del tren.','/uploads/zona-1788183572930-5723f9c4.jpg',1,1,'2026-08-31 13:39:34'),(26,8,'ZN-26','Mirador del río Vilcanota','Naturaleza',1.20,60,'Moderada','Todo el día','Libre','Balcón natural sobre el cañón, a la salida de la central hidroeléctrica.','/uploads/zona-1788184318002-kvjlp80p.webp',1,1,'2026-08-31 13:51:59'),(27,9,'ZN-27','Plaza de Armas de Sicuani','Cultura',0.50,30,'Fácil','Todo el día','Libre','Plaza principal de la capital de Canchis, con su catedral y portales.','/uploads/zona-1788184614037-k70wrfvs.jpg',1,1,'2026-08-31 13:56:55'),(28,9,'ZN-28','Mercado Dominical de Sicuani','Gastronomía',0.70,40,'Fácil','Domingos 06:00-16:00','Libre','Feria semanal de productos altoandinos: quesos, papa nativa y tejidos.','/uploads/zona-1788184107788-5kzbftpm.jpg',1,1,'2026-08-31 13:48:29'),(29,9,'ZN-29','Baños termales de Uyurmiri','Aventura',3.50,180,'Exigente','06:00-18:00','S/ 8','Fuentes termales al noreste de la ciudad, por camino de tierra en ascenso.','/uploads/zona-1788183488179-7f5vsxr1.webp',1,1,'2026-08-31 13:38:10'),(30,10,'ZN-30','Mirador del Abra La Raya','Naturaleza',0.40,30,'Moderada','Todo el día','Libre','Punto más alto de la línea Cusco-Puno, con vista a la cordillera de Vilcanota.','/uploads/zona-1788184299368-qtvff7fp.jpg',1,1,'2026-08-31 13:51:40'),(31,10,'ZN-31','Sendero al nevado Chimboya','Aventura',1.50,95,'Exigente','Todo el día','Libre','Tramo de puna a más de 4.300 m frente al glaciar; exige aclimatación previa.','/uploads/zona-1788184185905-m9f4wi4b.jpg',1,1,'2026-08-31 13:49:47'),(32,11,'ZN-32','Plaza de Armas de Juliaca','Cultura',0.80,40,'Fácil','Todo el día','Libre','Plaza central con la catedral de Santa Catalina y el reloj municipal.','/uploads/zona-1788184591870-m537oxgv.jpg',1,1,'2026-08-31 13:56:32'),(33,11,'ZN-33','Mercado Túpac Amaru','Gastronomía',1.00,50,'Fácil','06:00-18:00','Libre','Uno de los mercados más grandes del altiplano; comida típica puneña.','/uploads/zona-1788184158292-rug77llu.jpg',1,1,'2026-08-31 13:49:20'),(34,11,'ZN-34','Cerro Huaynarroque','Aventura',1.60,95,'Moderada','06:00-18:00','Libre','Mirador urbano con vía crucis en ascenso y vista de la meseta del Collao.','/uploads/zona-1788183614526-29l85elp.jpg',1,1,'2026-08-31 13:40:15'),(35,12,'ZN-35','Muelle y bahía del Titicaca','Naturaleza',0.60,35,'Fácil','Todo el día','Libre','Malecón sobre el lago navegable más alto del mundo, punto de salida a los Uros.','/uploads/zona-1788184458779-nvfri5s0.jpg',1,1,'2026-08-31 13:54:20'),(36,12,'ZN-36','Plaza de Armas y Catedral de Puno','Cultura',1.00,55,'Fácil','08:00-18:00','Libre','Catedral barroca de sillar y plaza principal de la ciudad.','/uploads/zona-1788184652095-jq1denjo.webp',1,1,'2026-08-31 13:57:33'),(37,12,'ZN-37','Mirador Kuntur Wasi','Aventura',1.30,95,'Exigente','07:00-18:00','S/ 5','Escalinata hasta el cóndor de piedra, con vista completa de la bahía.','/uploads/zona-1788184416993-55swv3q1.jpg',1,1,'2026-08-31 13:53:40'),(38,12,'ZN-38','Casa del Corregidor','Historia',1.00,45,'Fácil','09:00-20:00','Libre','Casona del siglo XVII, hoy centro cultural y café en el centro histórico.','/uploads/zona-1788183546417-9tzktfyq.jpg',1,1,'2026-08-31 13:39:07'),(39,13,'ZN-39','Monasterio de Santa Catalina','Historia',1.20,95,'Fácil','09:00-17:00','S/ 45','Ciudadela religiosa del siglo XVI, con calles y patios de sillar pintado.','/uploads/zona-1788184437951-qyp3strj.jpg',1,1,'2026-08-31 13:53:59'),(40,13,'ZN-40','Plaza de Armas y Basílica Catedral','Cultura',1.10,60,'Fácil','10:00-17:00','Libre','Plaza porticada de sillar blanco frente al volcán Misti.','/uploads/zona-1788184632529-m3pufosv.jpg',1,1,'2026-08-31 13:57:13'),(41,13,'ZN-41','Mercado San Camilo','Gastronomía',1.00,45,'Fácil','07:00-18:00','Libre','Mercado histórico de estructura de hierro; queso helado y adobo arequipeño.','/uploads/zona-1788184130292-djnonimj.jpg',1,1,'2026-08-31 13:48:51'),(42,13,'ZN-42','Mirador de Yanahuara','Naturaleza',2.00,110,'Moderada','Todo el día','Libre','Arquerías de sillar con vista abierta al Misti, el Chachani y el Pichu Pichu.','/uploads/zona-1788184372217-43ghixb0.jpg',1,1,'2026-08-31 13:52:53');
/*!40000 ALTER TABLE `zon_zona_turistica` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-31 15:13:46
