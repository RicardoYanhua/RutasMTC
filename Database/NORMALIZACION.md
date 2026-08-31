<!-- title: Normalización de la base de datos -->

# Normalización — `bd_rutas_turisticas`

8 tablas, todas con clave primaria entera de una sola columna. Esto ya
garantiza 2FN de forma automática: al no existir claves primarias
compuestas, no puede haber dependencia funcional *parcial* de un atributo
respecto a solo una parte de la clave.

## 1FN — Atomicidad

Todo atributo guarda un único valor indivisible:

- `est_estacion.est_latitud` / `est_longitud` están separados (no un
  campo "coordenadas" combinado, que era como lo mostraba el mockup).
- La lista de "hitos" del recorrido de cada zona (`hitos: [[titulo,
  detalle], ...]` en el mockup) **no** se guarda como texto/JSON en una
  columna de `zon_zona_turistica`: se extrajo a la tabla hija
  `zon_hito` (una fila por hito, con `zon_orden` para mantener la
  secuencia). Guardarlo en una sola columna habría violado 1FN.
- `rut_informe.rut_intereses` guarda una lista corta de categorías como
  texto separado por comas; se aceptó como excepción pragmática porque
  es un dato de solo lectura del informe generado (no se filtra ni se
  actualiza por interés individual), no una relación que necesite
  consultarse por separado.

## 2FN — Sin dependencias parciales

Todas las claves primarias son de una sola columna (`AUTO_INCREMENT`),
así que no existe combinación de columnas de la PK de la que un atributo
pueda depender solo parcialmente. Las únicas claves compuestas del
esquema son claves *alternas* (`UNIQUE`), no primarias:
- `zon_hito (zon_id_zona, zon_orden)` — evita huecos/duplicados de orden.
- `cli_prevision (est_id_estacion, cli_fecha)` — permite upsert diario.

## 3FN — Sin dependencias transitivas

Ningún atributo no clave determina a otro atributo no clave:

- **`est_servicio`**: `est_precio`, `est_hora_salida/retorno`,
  `est_minutos_transito` son hechos independientes del servicio; ninguno
  se calcula a partir de otro (la tarifa no depende de la duración).
- **`zon_zona_turistica`**: `zon_categoria` y `zon_dificultad` se
  modelaron como `ENUM` y no como tablas de catálogo aparte. Normalizar
  un dominio fijo y cerrado (5 categorías, 3 niveles) que **no tiene
  atributos propios** (no tiene descripción, ícono, orden, etc. que
  pueda cambiar independientemente) no elimina ninguna anomalía real de
  actualización — solo agrega un JOIN sin beneficio. Si en el futuro una
  categoría necesitara metadatos propios, ahí sí se justificaría
  extraerla a `cat_categoria`.
- **`cli_prevision`**: es una tabla de caché de un servicio externo
  (Open-Meteo); todos sus atributos (temperatura, viento, UV, aviso)
  describen el mismo hecho atómico "clima de esta estación en esta
  fecha", ninguno depende de otro.
- **`rut_informe`**: tabla de **hechos/evento** (se genera un registro
  por cada informe turístico emitido). Referencia catálogos por FK
  (`est_id_estacion`, `zon_id_zona`) pero también guarda snapshots
  propios del evento (distancia y tiempo totales calculados en ese
  momento, dificultad resultante). Esto es el patrón estándar de tablas
  de auditoría/eventos (equivalente a una fila de "pedido" que fija el
  precio pagado aunque el catálogo cambie después) y no una violación de
  3FN: ninguno de esos atributos determina a otro atributo no clave de
  otra fila.

## Por qué se descartó el esquema anterior (13 tablas)

El intento previo (`bd_rutas_turisticas` con `zon_estacion_zona` M:N,
`est_horario` por día de semana, `usr_preferencia` como catálogo
editable) modelaba relaciones que el mockup real de Claude Design no
usa: ahí cada zona pertenece a **una sola** estación de partida, cada
servicio tiene **un solo** horario/tarifa vigente, y las categorías de
interés son una lista fija de 5, no un catálogo administrable. Mantener
esas tablas habría sido sobre-normalización sin correspondencia con el
diseño aprobado ni con los requerimientos del caso.
