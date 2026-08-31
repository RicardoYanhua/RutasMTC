-- ============================================================================
-- Datos semilla del catálogo.
--
-- PROCEDENCIA Y NIVEL DE VERIFICACIÓN (importa distinguirlo, porque no todo el
-- dato de un ferrocarril es público con la misma calidad):
--
--   · Estaciones: son las estaciones REALES que opera PeruRail en sus dos
--     corredores (Cusco - Valle Sagrado - Machu Picchu, y Cusco - Puno -
--     Arequipa). Nombres y altitudes son los públicos y comprobables.
--     Las coordenadas son las del emplazamiento de la estación cuando es
--     identificable, y las del núcleo urbano cuando la estación está dentro de
--     él; en ambos casos con precisión suficiente para encuadrar un mapa, no
--     para replantear una obra.
--
--   · Zonas turísticas: sitios reales, existentes y visitables a pie desde
--     cada estación. Distancias y tiempos son estimaciones de caminata a unos
--     4 km/h sobre el trazado urbano o el sendero, redondeadas; los horarios e
--     ingresos son los habituales publicados por cada sitio. Conviene
--     revisarlos por temporada.
--
--   · Servicios ferroviarios: los NOMBRES de servicio son los reales de
--     PeruRail (Expedition, Vistadome, Vistadome Observatory, Sacred Valley,
--     Hiram Bingham, Titicaca Train). Horarios y tarifas son valores de
--     referencia: PeruRail no publica una API abierta y su tarifario cambia
--     por temporada, disponibilidad y punto de venta. Se cargan como punto de
--     partida y el rol `perurail` los mantiene desde el panel, que es
--     exactamente el flujo que describe el caso.
--
-- ESTADO INICIAL: todo se carga `activo = 1` y `publicado = 1` para que el
-- sistema tenga catálogo desde el primer arranque. Lo que se dé de alta desde
-- el panel nace despublicado y espera al gestor MTC.
-- ============================================================================
SET NAMES utf8mb4;
USE bd_rutas_turisticas;

-- ---------------------------------------------------------------------------
-- 1) Estaciones ferroviarias (PeruRail)
-- ---------------------------------------------------------------------------
INSERT INTO est_estacion
  (est_codigo, est_nombre, est_region, est_altitud_msnm, est_andenes, est_latitud, est_longitud, est_badge, est_activo, est_publicado) VALUES
('CUS', 'Cusco San Pedro',    'Cusco',                       3399, 2, -13.520500, -71.982000, 'Centro histórico',   1, 1),
('WAN', 'Cusco Wanchaq',      'Cusco',                       3360, 2, -13.526500, -71.966600, 'Ruta a Puno',        1, 1),
('POR', 'Poroy',              'Cusco',                       3465, 2, -13.484900, -71.967500, 'Vía Cusco',          1, 1),
('PAC', 'Pachar',             'Cusco · Valle Sagrado',       2790, 1, -13.290500, -72.207200, 'Servicio alterno',   1, 1),
('URU', 'Urubamba',           'Cusco · Valle Sagrado',       2871, 1, -13.305000, -72.116700, 'Servicio estacional',1, 1),
('OLL', 'Ollantaytambo',      'Cusco · Valle Sagrado',       2792, 3, -13.258300, -72.263600, 'Mayor afluencia',    1, 1),
('AGC', 'Machu Picchu Pueblo','Cusco · Aguas Calientes',     2040, 4, -13.154700, -72.525600, 'Terminal',           1, 1),
('HID', 'Hidroeléctrica',     'Cusco · Santa Teresa',        1850, 1, -13.174700, -72.665000, 'Acceso alterno',     1, 1),
('SIC', 'Sicuani',            'Cusco · Canchis',             3552, 1, -14.269400, -71.226100, NULL,                 1, 1),
('RAY', 'La Raya',            'Cusco / Puno · Abra',         4338, 1, -14.508300, -70.982500, 'Punto más alto',     1, 1),
('JUL', 'Juliaca',            'Puno',                        3825, 2, -15.493900, -70.132900, NULL,                 1, 1),
('PUN', 'Puno',               'Puno · Lago Titicaca',        3827, 2, -15.840200, -70.021900, 'Terminal sur',       1, 1),
('AQP', 'Arequipa',           'Arequipa',                    2335, 2, -16.398900, -71.535000, NULL,                 1, 1);

-- ---------------------------------------------------------------------------
-- 2) Servicios ferroviarios (horario + tarifa fusionados; tarifa de ida y vuelta)
--    Los ids siguen el orden de inserción anterior: 1 CUS, 2 WAN, 3 POR,
--    4 PAC, 5 URU, 6 OLL, 7 AGC, 8 HID, 9 SIC, 10 RAY, 11 JUL, 12 PUN, 13 AQP.
-- ---------------------------------------------------------------------------
INSERT INTO est_servicio
  (est_id_estacion_origen, est_id_estacion_destino, est_nombre_servicio, est_hora_salida, est_hora_retorno, est_minutos_transito, est_precio, est_moneda, est_serv_activo, est_serv_publicado) VALUES
(6,  7, 'Expedition',            '07:05:00', '18:45:00', 100,  210.00, 'PEN', 1, 1),
(6,  7, 'Vistadome',             '08:53:00', '17:23:00',  95,  320.00, 'PEN', 1, 1),
(6,  7, 'Vistadome Observatory', '07:45:00', '16:43:00',  95,  380.00, 'PEN', 1, 1),
(5,  7, 'Sacred Valley',         '08:10:00', '19:30:00', 150,  260.00, 'PEN', 1, 1),
(4,  7, 'Expedition',            '06:10:00', '17:50:00', 115,  220.00, 'PEN', 1, 1),
(3,  7, 'Hiram Bingham',         '09:05:00', '21:15:00', 210, 1290.00, 'PEN', 1, 1),
(1,  7, 'Expedition Bimodal',    '05:00:00', '20:30:00', 240,  240.00, 'PEN', 1, 1),
(2, 12, 'Titicaca Train',        '07:30:00', '18:00:00', 630, 1150.00, 'PEN', 1, 1),
(12, 2, 'Titicaca Train',        '07:30:00', '18:00:00', 630, 1150.00, 'PEN', 1, 1),
(11, 2, 'Titicaca Train',        '09:40:00', '16:10:00', 480,  940.00, 'PEN', 1, 1),
(9,  2, 'Titicaca Train',        '10:50:00', '15:05:00', 180,  620.00, 'PEN', 1, 1),
(13,12, 'Tren Turístico',        '08:00:00', '19:40:00', 420,  680.00, 'PEN', 1, 1),
(8,  7, 'Tren Local',            '06:45:00', '16:30:00',  45,   80.00, 'PEN', 1, 1);

-- ---------------------------------------------------------------------------
-- 3) Zonas turísticas (Travel Group Perú) — una zona parte de UNA estación
-- ---------------------------------------------------------------------------
INSERT INTO zon_zona_turistica
  (zon_id_estacion, zon_codigo, zon_nombre, zon_categoria, zon_distancia_km, zon_minutos_ida_vuelta, zon_dificultad, zon_horario_atencion, zon_ingreso, zon_descripcion, zon_activo, zon_publicado) VALUES
-- Cusco San Pedro
(1, 'ZN-01', 'Mercado Central de San Pedro',        'Gastronomía', 0.15,  30, 'Fácil',    '06:00-17:00',              'Libre',                    'Mercado de abastos frente a la estación, con puestos de jugos, panes y comida cusqueña.', 1, 1),
(1, 'ZN-02', 'Qorikancha (Templo del Sol)',         'Historia',    0.90,  70, 'Fácil',    '08:30-17:30',              'S/ 15',                    'Recinto inca sobre el que se levantó el convento de Santo Domingo; muros de sillería.', 1, 1),
(1, 'ZN-03', 'Plaza de Armas y Catedral del Cusco', 'Cultura',     0.80,  60, 'Fácil',    '10:00-18:00',              'S/ 25 (Circuito Religioso)','Plaza mayor de la ciudad, con la Catedral y la Compañía de Jesús.', 1, 1),
(1, 'ZN-04', 'Barrio de San Blas',                  'Cultura',     1.40,  95, 'Moderada', 'Todo el día',              'Libre',                    'Barrio de artesanos en cuesta, calles empedradas y talleres de imaginería.', 1, 1),
-- Cusco Wanchaq
(2, 'ZN-05', 'Mercado de Wanchaq',                  'Gastronomía', 0.50,  30, 'Fácil',    '06:00-18:00',              'Libre',                    'Mercado de barrio con comida local y productos del valle.', 1, 1),
(2, 'ZN-06', 'Parque de la Madre',                  'Naturaleza',  0.70,  35, 'Fácil',    'Todo el día',              'Libre',                    'Alameda arbolada junto a la avenida de la Cultura, buena para estirar antes del tren.', 1, 1),
-- Poroy
(3, 'ZN-07', 'Mirador de Poroy',                    'Naturaleza',  1.20,  45, 'Fácil',    'Todo el día',              'Libre',                    'Promontorio con vista panorámica al valle de Poroy y a la línea férrea.', 1, 1),
(3, 'ZN-08', 'Iglesia de Poroy',                    'Historia',    0.80,  25, 'Fácil',    '08:00-17:00',              'Libre',                    'Templo de adobe del periodo colonial junto a la plaza del pueblo.', 1, 1),
-- Pachar
(4, 'ZN-09', 'Puente Inca de Pachar',               'Historia',    0.60,  30, 'Fácil',    'Todo el día',              'Libre',                    'Estribos incas sobre el río Vilcanota, en el cruce hacia Ollantaytambo.', 1, 1),
(4, 'ZN-10', 'Ribera del Vilcanota',                'Naturaleza',  1.50,  75, 'Moderada', 'Todo el día',              'Libre',                    'Camino de ribera entre andenes y sauces, con vista al cañón del río.', 1, 1),
-- Urubamba
(5, 'ZN-11', 'Mercado Artesanal de Urubamba',       'Gastronomía', 0.60,  30, 'Fácil',    '07:00-18:00',              'Libre',                    'Puestos de comida y artesanía típica del Valle Sagrado.', 1, 1),
(5, 'ZN-12', 'Iglesia San Pedro Apóstol',           'Historia',    0.40,  20, 'Fácil',    '08:00-12:00, 15:00-18:00', 'Libre',                    'Templo colonial del siglo XVII con retablo barroco y pinturas cusqueñas.', 1, 1),
(5, 'ZN-13', 'Mirador del Valle Sagrado',           'Naturaleza',  2.00, 110, 'Moderada', 'Todo el día',              'Libre',                    'Vista elevada de los andenes y del río Urubamba, subiendo por camino rural.', 1, 1),
-- Ollantaytambo
(6, 'ZN-14', 'Fortaleza de Ollantaytambo',          'Historia',    1.00,  95, 'Moderada', '07:00-17:30',              'S/ 70 (Boleto Turístico)', 'Complejo arqueológico inca con terrazas agrícolas y el Templo del Sol.', 1, 1),
(6, 'ZN-15', 'Pinkuylluna (graneros incas)',        'Aventura',    1.60, 105, 'Exigente', '07:00-16:30',              'Libre',                    'Sendero de piedra hasta los graneros incas colgados en la ladera oriental.', 1, 1),
(6, 'ZN-16', 'Plaza y calles incas',                'Cultura',     0.50,  35, 'Fácil',    'Todo el día',              'Libre',                    'Trazado urbano inca en uso desde el siglo XV, con canales de agua a cielo abierto.', 1, 1),
(6, 'ZN-17', 'Mercado de Ollantaytambo',            'Gastronomía', 0.40,  25, 'Fácil',    '07:00-19:00',              'Libre',                    'Pasaje de comida y textiles junto a la plaza principal.', 1, 1),
(6, 'ZN-18', 'Museo CATCCO',                        'Cultura',     0.60,  40, 'Fácil',    '09:00-17:00',              'S/ 10',                    'Centro de interpretación del patrimonio de Ollantaytambo, en una casona de adobe.', 1, 1),
-- Machu Picchu Pueblo (Aguas Calientes)
(7, 'ZN-19', 'Aguas Termales de Machu Picchu',      'Aventura',    0.90,  60, 'Moderada', '05:00-20:30',              'S/ 20',                    'Pozas termales naturales al pie de la montaña, al final de la Av. Pachacútec.', 1, 1),
(7, 'ZN-20', 'Mercado Artesanal de Aguas Calientes','Gastronomía', 0.50,  30, 'Fácil',    '08:00-20:00',              'Libre',                    'Pasaje comercial con textiles, café de altura y gastronomía local.', 1, 1),
(7, 'ZN-21', 'Jardín de Mariposas',                 'Naturaleza',  1.10,  45, 'Fácil',    '09:00-15:30',              'S/ 15',                    'Vivero de mariposas nativas de la selva alta cusqueña, camino a Hidroeléctrica.', 1, 1),
(7, 'ZN-22', 'Museo de Sitio Manuel Chávez Ballón', 'Historia',    1.80, 105, 'Moderada', '09:00-16:00',              'S/ 22',                    'Museo arqueológico junto al puente Ruinas, con las piezas halladas en el santuario.', 1, 1),
(7, 'ZN-23', 'Jardín Botánico de Mandor',           'Naturaleza',  3.00, 155, 'Moderada', '07:00-17:00',              'S/ 10',                    'Bosque de neblina y catarata, siguiendo la vía férrea aguas abajo.', 1, 1),
(7, 'ZN-24', 'Plaza Manco Cápac',                   'Cultura',     0.30,  20, 'Fácil',    'Todo el día',              'Libre',                    'Plaza central del pueblo, con la iglesia y el mirador sobre el río Vilcanota.', 1, 1),
-- Hidroeléctrica
(8, 'ZN-25', 'Catarata de Mandor',                  'Naturaleza',  2.50, 130, 'Moderada', '07:00-16:00',              'S/ 10',                    'Salto de agua en bosque húmedo, por el sendero que sigue la vía del tren.', 1, 1),
(8, 'ZN-26', 'Mirador del río Vilcanota',           'Naturaleza',  1.20,  60, 'Moderada', 'Todo el día',              'Libre',                    'Balcón natural sobre el cañón, a la salida de la central hidroeléctrica.', 1, 1),
-- Sicuani
(9, 'ZN-27', 'Plaza de Armas de Sicuani',           'Cultura',     0.50,  30, 'Fácil',    'Todo el día',              'Libre',                    'Plaza principal de la capital de Canchis, con su catedral y portales.', 1, 1),
(9, 'ZN-28', 'Mercado Dominical de Sicuani',        'Gastronomía', 0.70,  40, 'Fácil',    'Domingos 06:00-16:00',     'Libre',                    'Feria semanal de productos altoandinos: quesos, papa nativa y tejidos.', 1, 1),
(9, 'ZN-29', 'Baños termales de Uyurmiri',          'Aventura',    3.50, 180, 'Exigente', '06:00-18:00',              'S/ 8',                     'Fuentes termales al noreste de la ciudad, por camino de tierra en ascenso.', 1, 1),
-- La Raya
(10,'ZN-30', 'Mirador del Abra La Raya',            'Naturaleza',  0.40,  30, 'Moderada', 'Todo el día',              'Libre',                    'Punto más alto de la línea Cusco-Puno, con vista a la cordillera de Vilcanota.', 1, 1),
(10,'ZN-31', 'Sendero al nevado Chimboya',          'Aventura',    1.50,  95, 'Exigente', 'Todo el día',              'Libre',                    'Tramo de puna a más de 4.300 m frente al glaciar; exige aclimatación previa.', 1, 1),
-- Juliaca
(11,'ZN-32', 'Plaza de Armas de Juliaca',           'Cultura',     0.80,  40, 'Fácil',    'Todo el día',              'Libre',                    'Plaza central con la catedral de Santa Catalina y el reloj municipal.', 1, 1),
(11,'ZN-33', 'Mercado Túpac Amaru',                 'Gastronomía', 1.00,  50, 'Fácil',    '06:00-18:00',              'Libre',                    'Uno de los mercados más grandes del altiplano; comida típica puneña.', 1, 1),
(11,'ZN-34', 'Cerro Huaynarroque',                  'Aventura',    1.60,  95, 'Moderada', '06:00-18:00',              'Libre',                    'Mirador urbano con vía crucis en ascenso y vista de la meseta del Collao.', 1, 1),
-- Puno
(12,'ZN-35', 'Muelle y bahía del Titicaca',         'Naturaleza',  0.60,  35, 'Fácil',    'Todo el día',              'Libre',                    'Malecón sobre el lago navegable más alto del mundo, punto de salida a los Uros.', 1, 1),
(12,'ZN-36', 'Plaza de Armas y Catedral de Puno',   'Cultura',     1.00,  55, 'Fácil',    '08:00-18:00',              'Libre',                    'Catedral barroca de sillar y plaza principal de la ciudad.', 1, 1),
(12,'ZN-37', 'Mirador Kuntur Wasi',                 'Aventura',    1.30,  95, 'Exigente', '07:00-18:00',              'S/ 5',                     'Escalinata hasta el cóndor de piedra, con vista completa de la bahía.', 1, 1),
(12,'ZN-38', 'Casa del Corregidor',                 'Historia',    1.00,  45, 'Fácil',    '09:00-20:00',              'Libre',                    'Casona del siglo XVII, hoy centro cultural y café en el centro histórico.', 1, 1),
-- Arequipa
(13,'ZN-39', 'Monasterio de Santa Catalina',        'Historia',    1.20,  95, 'Fácil',    '09:00-17:00',              'S/ 45',                    'Ciudadela religiosa del siglo XVI, con calles y patios de sillar pintado.', 1, 1),
(13,'ZN-40', 'Plaza de Armas y Basílica Catedral',  'Cultura',     1.10,  60, 'Fácil',    '10:00-17:00',              'Libre',                    'Plaza porticada de sillar blanco frente al volcán Misti.', 1, 1),
(13,'ZN-41', 'Mercado San Camilo',                  'Gastronomía', 1.00,  45, 'Fácil',    '07:00-18:00',              'Libre',                    'Mercado histórico de estructura de hierro; queso helado y adobo arequipeño.', 1, 1),
(13,'ZN-42', 'Mirador de Yanahuara',                'Naturaleza',  2.00, 110, 'Moderada', 'Todo el día',              'Libre',                    'Arquerías de sillar con vista abierta al Misti, el Chachani y el Pichu Pichu.', 1, 1);

-- ---------------------------------------------------------------------------
-- 4) Hitos del recorrido a pie (2 por zona, en orden)
-- ---------------------------------------------------------------------------
INSERT INTO zon_hito (zon_id_zona, zon_orden, zon_hito_titulo, zon_hito_detalle) VALUES
(1, 1,'Salida del andén',            'Cruza la calle Túpac Amaru hacia la puerta principal del mercado.'),
(1, 2,'Pasillo de jugos',            'Sigue por el corredor central hasta los puestos de fruta y pan.'),
(2, 1,'Avenida El Sol',              'Baja por la avenida principal en dirección al convento.'),
(2, 2,'Muro curvo inca',             'Rodea el ábside y observa la sillería pulida del recinto.'),
(3, 1,'Calle Mantas',                'Sube por la calle comercial hacia la plaza mayor.'),
(3, 2,'Atrio de la Catedral',        'Bordea el atrio y la portada de la Compañía de Jesús.'),
(4, 1,'Cuesta de San Blas',          'Toma la cuesta empedrada desde la plaza mayor.'),
(4, 2,'Plazoleta de San Blas',       'Llega al templo y a los talleres de artesanos del barrio.'),
(5, 1,'Salida a la avenida',         'Camina una cuadra hacia el interior del barrio de Wanchaq.'),
(5, 2,'Pasaje de comidas',           'Recorre los puestos de caldo de gallina y chicharrón.'),
(6, 1,'Avenida de la Cultura',       'Sigue la vereda arbolada hasta la entrada del parque.'),
(6, 2,'Alameda central',             'Da la vuelta al estanque y regresa por el otro costado.'),
(7, 1,'Trocha junto a la vía',       'Toma el camino hacia el oeste, paralelo a la línea férrea.'),
(7, 2,'Curva del mirador',           'Sube la pendiente suave hasta el promontorio con vista al valle.'),
(8, 1,'Cruce de la plazoleta',       'Camina por la calle principal hacia el templo.'),
(8, 2,'Fachada de la capilla',       'Observa la arquería colonial de adobe y el campanario.'),
(9, 1,'Camino al río',               'Baja desde el andén hacia la ribera del Vilcanota.'),
(9, 2,'Estribos del puente',         'Observa la cantería inca que aún sostiene el cruce.'),
(10,1,'Sendero de ribera',           'Sigue el camino de tierra aguas arriba, entre sauces.'),
(10,2,'Balcón sobre el cañón',       'Llega al ensanche con vista a los andenes de la ladera.'),
(11,1,'Salida de la estación',       'Camina hacia la avenida principal de Urubamba.'),
(11,2,'Puestos de comida local',     'Prueba el pan artesanal y la chicha de jora.'),
(12,1,'Plaza de Urubamba',           'Ubica la torre colonial junto al parque.'),
(12,2,'Nave principal',              'Observa el retablo barroco del siglo XVII.'),
(13,1,'Cruce del río Urubamba',      'Sigue el camino rural hacia las colinas del norte.'),
(13,2,'Cima del mirador',            'Contempla los andenes y el valle sagrado completo.'),
(14,1,'Acceso principal',            'Sube por la escalinata de terrazas agrícolas.'),
(14,2,'Templo del Sol',              'Llega a la plataforma superior con los muros ciclópeos.'),
(15,1,'Inicio del sendero',          'Sube por el camino de piedra al este del pueblo.'),
(15,2,'Mirador de los graneros',     'Alcanza los depósitos incas colgados en la ladera.'),
(16,1,'Plaza principal',             'Recorre los canales de agua originales incas.'),
(16,2,'Calle Del Medio',             'Observa los muros incas que sostienen las viviendas actuales.'),
(17,1,'Portal del mercado',          'Entra por el costado de la plaza principal.'),
(17,2,'Pasaje de textiles',          'Recorre los puestos de tejido y comida de la zona.'),
(18,1,'Casona de adobe',             'Ubica la entrada del museo en la calle Patacalle.'),
(18,2,'Sala de interpretación',      'Recorre las salas sobre agricultura y cantería inca.'),
(19,1,'Av. Pachacútec',              'Sube por la avenida principal desde la plaza.'),
(19,2,'Complejo termal',             'Ingresa a las pozas de aguas termales naturales.'),
(20,1,'Puente sobre el Vilcanota',   'Cruza hacia la zona comercial del pueblo.'),
(20,2,'Pasaje artesanal',            'Recorre los puestos de textiles y café.'),
(21,1,'Camino a Hidroeléctrica',     'Camina junto a la vía del tren aguas abajo.'),
(21,2,'Ingreso al jardín',           'Observa las especies de mariposas nativas de la selva alta.'),
(22,1,'Puente Ruinas',               'Sigue la carretera hacia el puente sobre el río.'),
(22,2,'Sala arqueológica',           'Recorre las piezas halladas en el santuario histórico.'),
(23,1,'Vía férrea aguas abajo',      'Camina por el costado de la vía, atento a los trenes.'),
(23,2,'Sendero al bosque',           'Desvía hacia el jardín y la catarata de Mandor.'),
(24,1,'Salida del andén',            'Sube las escaleras hacia el centro del pueblo.'),
(24,2,'Atrio de la iglesia',         'Rodea la plaza y asómate al mirador sobre el río.'),
(25,1,'Sendero junto a la vía',      'Sal de la central siguiendo el camino peatonal.'),
(25,2,'Poza de la catarata',         'Llega al salto de agua dentro del bosque húmedo.'),
(26,1,'Camino de servicio',          'Toma el desvío que sube por encima de la central.'),
(26,2,'Balcón natural',              'Asómate al cañón con el río muy por debajo.'),
(27,1,'Jirón principal',             'Camina desde la estación hacia el centro de Sicuani.'),
(27,2,'Portales de la plaza',        'Recorre los portales y la fachada de la catedral.'),
(28,1,'Puente del Vilcanota',        'Cruza hacia el sector donde se instala la feria.'),
(28,2,'Zona de quesos',              'Recorre los puestos de queso y papa nativa.'),
(29,1,'Salida noreste',              'Toma el camino de tierra que asciende fuera de la ciudad.'),
(29,2,'Pozas de Uyurmiri',           'Llega a las fuentes termales al pie del cerro.'),
(30,1,'Andén del abra',              'Baja del tren en el punto más alto de la línea.'),
(30,2,'Mirador de la cordillera',    'Camina hasta el hito y observa el nevado Chimboya.'),
(31,1,'Inicio de la puna',           'Sigue la huella hacia el norte, sobre pasto de altura.'),
(31,2,'Vista del glaciar',           'Alcanza el promontorio frente al nevado. Regresa antes del mediodía.'),
(32,1,'Jirón San Román',             'Camina desde la estación hacia el centro de Juliaca.'),
(32,2,'Atrio de la catedral',        'Rodea la plaza y la torre del reloj municipal.'),
(33,1,'Avenida Huancané',            'Sigue la avenida hacia el sector comercial.'),
(33,2,'Zona de comidas',             'Prueba el chairo y el thimpo de trucha del altiplano.'),
(34,1,'Base del cerro',              'Toma la escalinata del vía crucis en el barrio alto.'),
(34,2,'Cruz de la cima',             'Alcanza la cima con vista de la meseta del Collao.'),
(35,1,'Salida al malecón',           'Camina desde la estación hacia la orilla del lago.'),
(35,2,'Muelle turístico',            'Recorre el muelle desde donde parten las lanchas a los Uros.'),
(36,1,'Jirón Lima',                  'Sube por la calle peatonal hacia la plaza.'),
(36,2,'Fachada de sillar',           'Observa la portada barroca de la catedral de Puno.'),
(37,1,'Escalinata inicial',          'Empieza la subida desde el jirón Independencia.'),
(37,2,'Cóndor de piedra',            'Llega al mirador con la escultura y la vista de la bahía.'),
(38,1,'Jirón Deustua',               'Camina hacia el centro histórico de Puno.'),
(38,2,'Patio de la casona',          'Entra al patio empedrado del siglo XVII.'),
(39,1,'Calle Santa Catalina',        'Camina desde la plaza hacia el muro del monasterio.'),
(39,2,'Calles de sillar',            'Recorre los patios y las calles interiores pintadas.'),
(40,1,'Portal de la Municipalidad',  'Entra a la plaza por el costado porticado.'),
(40,2,'Atrio de la basílica',        'Rodea la catedral con el Misti al fondo.'),
(41,1,'Calle San Camilo',            'Camina desde la plaza hacia el mercado histórico.'),
(41,2,'Nave de hierro',              'Recorre los pasillos bajo la estructura metálica.'),
(42,1,'Puente Grau',                 'Cruza el puente hacia el distrito de Yanahuara.'),
(42,2,'Arquerías del mirador',       'Llega a los arcos de sillar con vista a los tres volcanes.');

-- ---------------------------------------------------------------------------
-- 5) Cuentas del panel — una por rol. Todas comparten la clave `demo2026`
--    (hash bcrypt de 10 rondas) para poder probar los tres módulos.
--    En producción se cambiarían en el primer acceso.
-- ---------------------------------------------------------------------------
INSERT INTO usr_admin (usr_usuario, usr_contrasena_hash, usr_nombre_completo, usr_rol, usr_entidad, usr_activo) VALUES
('operador.tgp',  '$2b$10$R.VaW6nX/5UrqADaXJpzC.5uTktxlcblAiwzcWR9Eq7FHwF7GQpWC', 'Operador Travel Group Perú', 'travelgroup', 'Travel Group Perú', 1),
('operador.prl',  '$2b$10$R.VaW6nX/5UrqADaXJpzC.5uTktxlcblAiwzcWR9Eq7FHwF7GQpWC', 'Operador PeruRail',          'perurail',    'PeruRail',           1),
('gestor.mtc',    '$2b$10$R.VaW6nX/5UrqADaXJpzC.5uTktxlcblAiwzcWR9Eq7FHwF7GQpWC', 'Gestor MTC',                 'mtc',         'Ministerio de Transportes y Comunicaciones', 1);

-- ---------------------------------------------------------------------------
-- 6) Reenganche de las fotografías ya subidas al directorio `uploads/`.
--    Al recargar el esquema se pierden las referencias en la tabla, pero los
--    archivos siguen en disco: esto los vuelve a asociar a la zona equivalente
--    del catálogo nuevo. Si un archivo ya no existe, la tarjeta cae sola a su
--    marcador de posición (el componente de imagen gestiona el error de carga).
-- ---------------------------------------------------------------------------
UPDATE zon_zona_turistica SET zon_imagen_url = '/uploads/zona-1788156599909-243ogs6g.png' WHERE zon_codigo = 'ZN-07';
UPDATE zon_zona_turistica SET zon_imagen_url = '/uploads/zona-1788156713038-0b0bf4cc.png' WHERE zon_codigo = 'ZN-14';
UPDATE zon_zona_turistica SET zon_imagen_url = '/uploads/zona-1788176433839-wxw3avmx.webp' WHERE zon_codigo = 'ZN-19';
