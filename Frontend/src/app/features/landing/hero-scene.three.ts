import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { prefersReducedMotion } from '../../shared/animations/animar.util';

/* Espejo de los tokens del sistema (Three.js no lee custom properties). */
const PAPER = 0xfbfaf9;
const INK_900 = 0x17140f;
const INK_700 = 0x3a332c;
const INK_500 = 0x726860;
const ACC_500 = 0xe5372a;
/* Verde muy apagado: la escenografía acompaña, no compite con el vehículo. */
const PINO = 0x2f3d2c;
/* Gris apenas frío para la cordillera: el resto de la paleta es cálida, y esa
   diferencia mínima de temperatura es la que empuja el fondo hacia atrás. */
const SIERRA = 0x6f7680;

/** Ruta del modelo optimizado (EXT_meshopt_compression, 11 MB de 61 MB). */
const MODELO_URL = 'models/er-9-p-electric-train.glb';

/**
 * Ancho (gálibo) objetivo del vehículo en unidades de escena.
 *
 * La normalización va por el ANCHO y no por el largo a propósito: el gálibo de
 * un tren ronda siempre los 3 m, mida la unidad 18 m o 83 m, así que es la
 * medida que mantiene constante la escala aparente al cambiar de .glb. Ajustar
 * por el largo hacía lo contrario: una unidad de cuatro coches se encogía hasta
 * parecer una maqueta al lado de las traviesas, que sí tienen medida fija.
 */
const ANCHO_OBJETIVO = 0.58;
/** Dónde se clava el morro del tren sobre la vía. */
const MORRO_X = 1.8;
/** Largo de la vía: mucho más que el tren, para que entre y salga de la niebla. */
const LARGO_VIA = 30;
/** Separación entre traviesas. También es el módulo del bucle de desplazamiento. */
const PASO_TRAVIESA = 0.34;
/** Velocidad de la vía bajo el tren, en unidades por segundo. */
const VELOCIDAD = 7.2;
/**
 * Semiancho de vía como FRACCIÓN del ancho del vehículo.
 *
 * En un tren real la trocha (1,435 m) mide algo más de la mitad del ancho de la
 * caja (~2,7 m), así que los raíles caen bajo las ruedas y no fuera de ellas.
 * Se deduce del modelo en vez de fijarse a un número: así la vía encaja con
 * cualquier .glb que se cargue, sin volver a tocar esta constante.
 */
const FACTOR_TROCHA = 0.26;

export interface HeroSceneHandle {
  /** Progreso de salida del hero, 0..1. Lo alimenta el componente contenedor. */
  setScroll(progreso: number): void;
  dispose(): void;
}

export interface HeroSceneOpts {
  /** 0..1 mientras descarga el .glb; se usa para pintar la barra de carga. */
  onProgress?(valor: number): void;
  onReady?(): void;
  onError?(): void;
}

/** Recolector de recursos GPU: todo lo que se cree se registra y se libera junto. */
class Basura {
  private readonly items: Array<{ dispose(): void }> = [];
  add<T extends { dispose(): void }>(item: T): T {
    this.items.push(item);
    return item;
  }
  vaciar(): void {
    for (const item of this.items) item.dispose();
    this.items.length = 0;
  }
}

/**
 * Sombra de contacto sin shadow map: un plano con un degradado radial pintado
 * en canvas y usado como `alphaMap` sobre tinta.
 *
 * Nada de `MultiplyBlending`: three exige `premultipliedAlpha` para ese modo y,
 * sobre un lienzo en alpha, el resultado ni siquiera oscurece. Un plano negro
 * con alfa degradado hace exactamente el mismo trabajo sobre papel blanco.
 */
function crearSombraContacto(basura: Basura): THREE.Mesh {
  const lienzo = document.createElement('canvas');
  lienzo.width = 256;
  lienzo.height = 128;
  const ctx = lienzo.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 128);
  const grad = ctx.createRadialGradient(128, 64, 0, 128, 64, 122);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.42, '#9a9a9a');
  grad.addColorStop(1, '#000000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  const textura = basura.add(new THREE.CanvasTexture(lienzo));
  const geo = basura.add(new THREE.PlaneGeometry(1, 1));
  const mat = basura.add(
    new THREE.MeshBasicMaterial({
      color: INK_900,
      alphaMap: textura,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      fog: false,
    }),
  );
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  return mesh;
}

/** Perfil de raíl (patín, alma y cabeza) extruido a lo largo de la vía. */
function crearGeometriaRail(basura: Basura): THREE.ExtrudeGeometry {
  const perfil = new THREE.Shape();
  perfil.moveTo(-0.05, 0);
  perfil.lineTo(0.05, 0);
  perfil.lineTo(0.05, 0.018);
  perfil.lineTo(0.016, 0.038);
  perfil.lineTo(0.016, 0.074);
  perfil.lineTo(0.036, 0.084);
  perfil.lineTo(0.036, 0.1);
  perfil.lineTo(-0.036, 0.1);
  perfil.lineTo(-0.036, 0.084);
  perfil.lineTo(-0.016, 0.074);
  perfil.lineTo(-0.016, 0.038);
  perfil.lineTo(-0.05, 0.018);
  perfil.closePath();

  const geo = basura.add(
    new THREE.ExtrudeGeometry(perfil, { depth: LARGO_VIA, bevelEnabled: false, steps: 1, curveSegments: 1 }),
  );
  // El perfil se dibuja en XY y se extruye en Z; se gira para que el largo caiga
  // sobre el eje X, que es por donde corre el tren.
  geo.rotateY(Math.PI / 2);
  geo.translate(-LARGO_VIA / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

interface Via {
  objeto: THREE.Group;
  /** Desplaza las traviesas para que el tren parezca avanzar. */
  avanzar(distancia: number): void;
}

/**
 * Vía con volumen, sin terreno.
 *
 * El brief es explícito: raíles y traviesas con cuerpo (no simples líneas),
 * en gris/negro, y **nada** de balasto ni suelo, para que floten sobre el papel
 * blanco de la página. La niebla, del color del papel, se come los dos extremos
 * y evita ver dónde acaba la vía.
 *
 * La cabeza del raíl queda exactamente en y = 0, que es donde se apoya el
 * modelo tras normalizarlo, así que las ruedas pisan el carril en vez de
 * flotar. Alma, patín y traviesas cuelgan por debajo.
 *
 * El movimiento no lo hace el tren sino el suelo: las traviesas son un
 * `InstancedMesh` que se desplaza y se reengancha cada `PASO_TRAVIESA`. Es lo
 * mismo que hace un plató de rodaje, y cuesta una matriz por frame en vez de
 * mover 250.000 triángulos.
 */
function crearVia(basura: Basura, semiTrocha: number): Via {
  const grupo = new THREE.Group();

  // — traviesas —
  const cantidad = Math.ceil(LARGO_VIA / PASO_TRAVIESA) + 2;
  const traviesaGeo = basura.add(new THREE.BoxGeometry(0.17, 0.062, semiTrocha * 3.4));
  const traviesaMat = basura.add(
    new THREE.MeshStandardMaterial({ color: INK_900, roughness: 0.86, metalness: 0.06 }),
  );
  const traviesas = new THREE.InstancedMesh(traviesaGeo, traviesaMat, cantidad);
  traviesas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  traviesas.position.y = -0.108;
  traviesas.frustumCulled = false;
  grupo.add(traviesas);

  // Desviaciones fijas por traviesa (giro y altura): sin ellas la vía parece
  // impresa a máquina y delata que es un bucle.
  const desvio = new Float32Array(cantidad * 2);
  for (let i = 0; i < cantidad; i++) {
    desvio[i * 2] = (Math.random() - 0.5) * 0.028;
    desvio[i * 2 + 1] = (Math.random() - 0.5) * 0.01;
  }

  const matriz = new THREE.Matrix4();
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3(1, 1, 1);

  const colocar = (offset: number): void => {
    for (let i = 0; i < cantidad; i++) {
      // Módulo positivo: la traviesa que sale por un extremo reaparece por el
      // otro, así que bastan ~90 instancias para una vía infinita.
      const bruto = i * PASO_TRAVIESA - offset;
      const x = ((((bruto + LARGO_VIA / 2) % LARGO_VIA) + LARGO_VIA) % LARGO_VIA) - LARGO_VIA / 2;
      posicion.set(x, desvio[i * 2 + 1], 0);
      euler.set(0, desvio[i * 2], 0);
      quat.setFromEuler(euler);
      matriz.compose(posicion, quat, escala);
      traviesas.setMatrixAt(i, matriz);
    }
    traviesas.instanceMatrix.needsUpdate = true;
  };
  colocar(0);

  // — raíles —
  const railGeo = crearGeometriaRail(basura);
  const railMat = basura.add(
    new THREE.MeshStandardMaterial({ color: INK_700, roughness: 0.32, metalness: 0.9 }),
  );
  for (const z of [-semiTrocha, semiTrocha]) {
    const rail = new THREE.Mesh(railGeo, railMat);
    // Cabeza del raíl a y = 0: el perfil mide 0,1 de alto, así que se baja
    // justo esa altura para que la rodadura coincida con la base del modelo.
    rail.position.set(0, -0.1, z);
    grupo.add(rail);
  }

  let recorrido = 0;
  return {
    objeto: grupo,
    avanzar(distancia: number): void {
      recorrido += distancia;
      colocar(recorrido);
    },
  };
}

interface Escenografia {
  objeto: THREE.Object3D;
  avanzar(distancia: number): void;
}

/** Copia un color plano al atributo `color` de una geometría. */
function pintarVertices(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const total = geo.getAttribute('position').count;
  const canal = new Float32Array(total * 3);
  for (let i = 0; i < total; i++) {
    canal[i * 3] = color.r;
    canal[i * 3 + 1] = color.g;
    canal[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(canal, 3));
  return geo;
}

/**
 * Pino completo en UNA geometría: tronco troncocónico y tres pisos de copa
 * solapados.
 *
 * Un cono suelto no lee como conífera; lo que hace la silueta de un pino es el
 * escalonado de las ramas y el estrechamiento hacia la punta. Los cuatro
 * trozos se fusionan en una sola geometría en vez de instanciarse por separado,
 * así que el bosque entero sigue costando UNA llamada de dibujo (antes eran
 * dos: copas y troncos).
 *
 * El color viaja en los vértices —tinta en el tronco, verde que se aclara
 * piso a piso, como cuando la luz cenital solo alcanza las ramas altas— y en
 * el shader se multiplica por el color de instancia, que varía por árbol. Un
 * bosque de un único verde plano se delata como trama repetida.
 *
 * La base del tronco queda en y = 0, así que cada instancia se planta con una
 * sola matriz y el balanceo se aplica sobre el propio pie del árbol.
 */
function crearGeometriaPino(basura: Basura): THREE.BufferGeometry {
  const ALTO_TRONCO = 0.2;
  const verde = new THREE.Color(PINO);
  const papel = new THREE.Color(PAPER);

  const tronco = pintarVertices(
    new THREE.CylinderGeometry(0.03, 0.047, ALTO_TRONCO, 6),
    new THREE.Color(INK_700),
  );
  tronco.translate(0, ALTO_TRONCO / 2, 0);

  /** radio, alto, base y mezcla hacia el papel de cada piso, de abajo arriba. */
  const pisos: ReadonlyArray<readonly [number, number, number, number]> = [
    [0.195, 0.33, ALTO_TRONCO - 0.03, 0],
    [0.135, 0.28, ALTO_TRONCO + 0.135, 0.06],
    [0.082, 0.24, ALTO_TRONCO + 0.29, 0.13],
  ];

  const partes = [tronco];
  for (const [radio, alto, base, mezcla] of pisos) {
    const cono = new THREE.ConeGeometry(radio, alto, 8);
    cono.translate(0, base + alto / 2, 0);
    partes.push(pintarVertices(cono, verde.clone().lerp(papel, mezcla)));
  }

  return basura.add(mergeGeometries(partes) as THREE.BufferGeometry);
}

/**
 * Vegetación y piedras a los lados de la vía.
 *
 * Sin nada en el suelo, las traviesas corriendo bajo un tren quieto se leen
 * como una cinta transportadora: falta un punto de referencia FUERA del carril
 * que confirme el avance. Unos pinos y unas rocas pasando de largo lo resuelven
 * con muy poco coste, porque todo va en `InstancedMesh` (dos llamadas de dibujo
 * en total, no una por árbol).
 *
 * Se colocan a partir de `margen`, calculado desde el ancho del vehículo, para
 * que nunca aparezca un pino atravesando la carrocería. Y como el resto de la
 * escena, se reenganchan por módulo: el que sale por un extremo vuelve a entrar
 * por el otro.
 */
function crearEscenografia(basura: Basura, margen: number): Escenografia {
  const grupo = new THREE.Group();

  const PINOS = 34;
  const ROCAS = 46;
  /**
   * Distancia mínima al eje de la vía. Es MUY superior al gálibo del vehículo a
   * propósito: la cámara mira desde un costado, y un pino plantado a un metro
   * del carril se cuela entre el objetivo y el tren y lo tapa. Plantados a
   * partir de aquí, encuadran la escena en vez de estorbarla.
   */
  const DISTANCIA_MINIMA = Math.max(margen, 1.6);
  const DISPERSION = 3.4;

  // — pinos: tronco y tres pisos de copa fusionados, una instancia por árbol —
  const pinoGeo = crearGeometriaPino(basura);
  // `vertexColors`: el color va en la malla (tronco / pisos de copa) y se
  // multiplica por el tinte de instancia, así que el material queda en blanco.
  const pinoMat = basura.add(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
  );
  const pinos = new THREE.InstancedMesh(pinoGeo, pinoMat, PINOS);

  // — rocas: un icosaedro deformado por instancia con escala no uniforme —
  const rocaGeo = basura.add(new THREE.IcosahedronGeometry(0.1, 0));
  const rocaMat = basura.add(new THREE.MeshStandardMaterial({ color: INK_500, roughness: 0.88, metalness: 0.05 }));
  const rocas = new THREE.InstancedMesh(rocaGeo, rocaMat, ROCAS);

  for (const malla of [pinos, rocas]) {
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    malla.frustumCulled = false;
    grupo.add(malla);
  }

  /** x0, z, ancho, alto, giro, inclinación — fijos; solo la x se recalcula. */
  const semillaPino = new Float32Array(PINOS * 6);
  const tinte = new THREE.Color();
  for (let i = 0; i < PINOS; i++) {
    const lado = Math.random() < 0.5 ? -1 : 1;
    const talla = 0.55 + Math.random() * 0.75;
    semillaPino[i * 6] = Math.random() * LARGO_VIA;
    semillaPino[i * 6 + 1] = lado * (DISTANCIA_MINIMA + Math.random() * DISPERSION);
    // Ancho y alto por separado: unos pinos salen enjutos y otros achaparrados.
    // Con una sola escala uniforme los 34 árboles son el mismo árbol de lejos.
    // Los dos factores van centrados en 1 para que la variación no engorde el
    // bosque: un pino que le saque la cabeza al tren le roba el plano.
    semillaPino[i * 6 + 2] = talla * (0.87 + Math.random() * 0.26);
    semillaPino[i * 6 + 3] = talla * (0.86 + Math.random() * 0.28);
    semillaPino[i * 6 + 4] = Math.random() * Math.PI * 2;
    // Nadie planta un bosque a plomo: hasta ~5° de caída rompe la verticalidad.
    semillaPino[i * 6 + 5] = Math.random() * 0.09;

    // Tinte de instancia: multiplica al color de los vértices, así que ronda el
    // blanco. Un pelo más claro u oscuro y con deriva cálida/fría por árbol.
    const brillo = 0.86 + Math.random() * 0.22;
    tinte.setRGB(brillo * (0.96 + Math.random() * 0.09), brillo, brillo * (0.94 + Math.random() * 0.08));
    pinos.setColorAt(i, tinte);
  }
  const semillaRoca = new Float32Array(ROCAS * 4);
  for (let i = 0; i < ROCAS; i++) {
    const lado = Math.random() < 0.5 ? -1 : 1;
    semillaRoca[i * 4] = Math.random() * LARGO_VIA;
    semillaRoca[i * 4 + 1] = lado * (DISTANCIA_MINIMA * 0.72 + Math.random() * DISPERSION);
    semillaRoca[i * 4 + 2] = 0.4 + Math.random() * 0.75;
    semillaRoca[i * 4 + 3] = Math.random() * Math.PI;
  }

  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const escala = new THREE.Vector3();

  const enVia = (bruto: number): number =>
    ((((bruto % LARGO_VIA) + LARGO_VIA) % LARGO_VIA)) - LARGO_VIA / 2;

  const colocar = (offset: number): void => {
    for (let i = 0; i < PINOS; i++) {
      const giro = semillaPino[i * 6 + 4];
      const caida = semillaPino[i * 6 + 5];
      // La inclinación se reparte entre X y Z según el giro: el árbol se
      // vence hacia donde mira, no siempre hacia el mismo punto cardinal.
      euler.set(Math.sin(giro) * caida, giro, Math.cos(giro) * caida);
      quat.setFromEuler(euler);

      // El pie del pino está en y = 0 de la geometría, así que se planta
      // directamente sobre la cota de la vía.
      posicion.set(enVia(semillaPino[i * 6] - offset), 0, semillaPino[i * 6 + 1]);
      escala.set(semillaPino[i * 6 + 2], semillaPino[i * 6 + 3], semillaPino[i * 6 + 2]);
      matriz.compose(posicion, quat, escala);
      pinos.setMatrixAt(i, matriz);
    }
    pinos.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < ROCAS; i++) {
      const k = semillaRoca[i * 4 + 2];
      euler.set(semillaRoca[i * 4 + 3], semillaRoca[i * 4 + 3] * 1.7, 0);
      quat.setFromEuler(euler);
      // Escala no uniforme: una piedra achatada parece piedra; una esfera, no.
      posicion.set(enVia(semillaRoca[i * 4] - offset), 0.045 * k, semillaRoca[i * 4 + 1]);
      escala.set(k, k * 0.7, k * 1.15);
      matriz.compose(posicion, quat, escala);
      rocas.setMatrixAt(i, matriz);
    }
    rocas.instanceMatrix.needsUpdate = true;
  };
  colocar(0);

  let recorrido = 0;
  return {
    objeto: grupo,
    avanzar(distancia: number): void {
      recorrido += distancia;
      colocar(recorrido);
    },
  };
}

/**
 * Una cresta: anillo vertical alrededor de la escena, recortado por arriba con
 * un perfil de cumbres y desvanecido por abajo.
 *
 * Es un anillo y no un telón plano porque la cámara viaja del costado al morro:
 * un plano de fondo fijo enseñaría el canto al girar el encuadre. Dando la
 * vuelta completa, siempre hay cordillera detrás mire donde mire.
 *
 * El perfil suma armónicos ENTEROS del ángulo, así que cierra sin costura al
 * completar la vuelta, y se pliega con `1 - |sen|`: eso convierte ondas suaves
 * en cumbres con punta, que es lo que separa una montaña de una duna.
 *
 * El desvanecido inferior va en el alfa de los vértices (opaco en la cima,
 * transparente `caida` unidades más abajo). Sin él haría falta cerrar la
 * silueta por abajo con una recta, y esa recta se leería como una línea de
 * suelo: justo el terreno que la escena no debe tener.
 */
function crearCresta(
  basura: Basura,
  radio: number,
  base: number,
  relieve: number,
  caida: number,
): THREE.BufferGeometry {
  const COLUMNAS = 108;
  const posiciones = new Float32Array((COLUMNAS + 1) * 2 * 3);
  const colores = new Float32Array((COLUMNAS + 1) * 2 * 4);
  const indices: number[] = [];
  const fase = [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28];

  for (let i = 0; i <= COLUMNAS; i++) {
    const angulo = (i / COLUMNAS) * Math.PI * 2;
    const cumbre =
      base +
      relieve *
        (0.6 * (1 - Math.abs(Math.sin(angulo * 3 + fase[0]))) +
          0.27 * (1 - Math.abs(Math.sin(angulo * 7 + fase[1]))) +
          0.13 * (1 - Math.abs(Math.sin(angulo * 17 + fase[2]))));
    const x = Math.cos(angulo) * radio;
    const z = Math.sin(angulo) * radio;

    const arriba = i * 2;
    const abajo = arriba + 1;
    posiciones.set([x, cumbre, z], arriba * 3);
    posiciones.set([x, cumbre - caida, z], abajo * 3);
    colores.set([1, 1, 1, 1], arriba * 4);
    colores.set([1, 1, 1, 0], abajo * 4);

    if (i < COLUMNAS) indices.push(arriba, abajo, abajo + 2, arriba, abajo + 2, arriba + 2);
  }

  const geo = basura.add(new THREE.BufferGeometry());
  geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colores, 4));
  geo.setIndex(indices);
  return geo;
}

/**
 * Cordillera de fondo: dos crestas concéntricas, muy lejos y muy lavadas.
 *
 * El encargo pide paisaje, no escenario: tiene que sostener el fondo sin que
 * nadie repare en él. Se consigue con tres decisiones, no con una opacidad
 * baja a secas:
 *
 *   1. van MÁS ALLÁ del alcance de la niebla (que muere a 21) y por eso la
 *      llevan desactivada: si les afectara desaparecerían del todo. La bruma
 *      la fingen su color y su alfa, no el `Fog`.
 *   2. perspectiva aérea: la cresta lejana es más alta, más clara y más
 *      transparente que la cercana. Es lo que hace la atmósfera de verdad.
 *   3. nada de suelo. Son siluetas verticales que se disuelven hacia abajo, de
 *      modo que el papel de la página sigue siendo lo único bajo el tren.
 *
 * `depthWrite: false` y un `renderOrder` muy bajo las dejan detrás de todo sin
 * recortar la sombra de contacto ni las estelas.
 */
function crearMontanas(basura: Basura): THREE.Group {
  const grupo = new THREE.Group();

  /** radio, base, relieve, caída, opacidad y mezcla del color hacia el papel. */
  const capas: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
    [26, 2.1, 3, 2.8, 0.13, 0.3],
    [19, 1.35, 1.95, 2, 0.2, 0.1],
  ];

  const papel = new THREE.Color(PAPER);
  for (const [radio, base, relieve, caida, opacidad, mezcla] of capas) {
    const material = basura.add(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(SIERRA).lerp(papel, mezcla),
        vertexColors: true,
        transparent: true,
        opacity: opacidad,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide,
      }),
    );
    const cresta = new THREE.Mesh(crearCresta(basura, radio, base, relieve, caida), material);
    cresta.renderOrder = -3;
    grupo.add(cresta);
  }

  return grupo;
}

interface Estelas {
  objeto: THREE.Object3D;
  avanzar(distancia: number): void;
}

/**
 * Estelas de velocidad: trazos finos que cruzan el encuadre en la dirección de
 * marcha. Sobre papel blanco van en tinta translúcida, no en luz aditiva: sobre
 * blanco lo aditivo desaparece.
 */
function crearEstelas(basura: Basura, cantidad = 64): Estelas {
  const geo = basura.add(new THREE.PlaneGeometry(1, 0.0075));
  const mat = basura.add(
    new THREE.MeshBasicMaterial({
      color: INK_500,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const malla = new THREE.InstancedMesh(geo, mat, cantidad);
  malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  malla.frustumCulled = false;

  const semillas = new Float32Array(cantidad * 4); // x0, y, z, largo
  for (let i = 0; i < cantidad; i++) {
    semillas[i * 4] = Math.random() * LARGO_VIA;
    semillas[i * 4 + 1] = 0.04 + Math.random() * 1.3;
    semillas[i * 4 + 2] = (Math.random() - 0.5) * 3.4;
    semillas[i * 4 + 3] = 0.6 + Math.random() * 2.4;
  }

  const matriz = new THREE.Matrix4();
  const posicion = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const escala = new THREE.Vector3(1, 1, 1);

  let recorrido = 0;
  const colocar = (): void => {
    for (let i = 0; i < cantidad; i++) {
      // Cada estela corre a su propio ritmo (`largo` hace de factor) para que la
      // capa tenga profundidad en vez de moverse como un bloque.
      const bruto = semillas[i * 4] - recorrido * (0.55 + semillas[i * 4 + 3] * 0.4);
      const x = ((((bruto % LARGO_VIA) + LARGO_VIA) % LARGO_VIA)) - LARGO_VIA / 2;
      posicion.set(x, semillas[i * 4 + 1], semillas[i * 4 + 2]);
      escala.set(semillas[i * 4 + 3], 1, 1);
      matriz.compose(posicion, quat, escala);
      malla.setMatrixAt(i, matriz);
    }
    malla.instanceMatrix.needsUpdate = true;
  };
  colocar();

  return {
    objeto: malla,
    avanzar(distancia: number): void {
      recorrido += distancia;
      colocar();
    },
  };
}

/**
 * Hero de la landing: el tren eléctrico ER9-P corriendo sobre su vía, sobre el
 * papel blanco del sistema.
 *
 * El fondo no lo pinta WebGL: el renderer va en alpha y el papel es el del
 * documento, de modo que hero y página son la misma superficie. La niebla usa
 * `--paper`, así que la vía se disuelve en el fondo real por los dos extremos y
 * el bucle nunca enseña la costura.
 *
 * Iluminación de estudio sobre fondo claro: clave cálida alta, relleno frío
 * amplio para que ninguna sombra se cierre a negro, contraluz en el bermellón
 * de marca recortando el techo, y un environment PMREM (RoomEnvironment) para
 * que el metal del modelo tenga a qué reflejar sin cargar un HDRI externo.
 *
 * Movimiento (tres capas, todas motivadas por lo mismo: el tren está en marcha):
 *   1. el suelo corre bajo un tren quieto (traviesas + estelas de aire)
 *   2. la caja del tren cabecea y balancea muy poco, como sobre bogies
 *   3. la cámara describe un bucle lento del tres cuartos al frontal y vuelve
 *
 * El progreso de scroll lo inyecta el componente vía `setScroll`, a partir de
 * un IntersectionObserver; aquí no hay ningún listener de `scroll`.
 */
export function mountHeroScene(container: HTMLDivElement, opts: HeroSceneOpts = {}): HeroSceneHandle {
  const reducedMotion = prefersReducedMotion();
  const basura = new Basura();

  const w0 = container.clientWidth || 1200;
  const h0 = container.clientHeight || 700;

  const scene = new THREE.Scene();
  // Niebla del color del papel: la vía y las estelas se desvanecen en el fondo
  // de la página, no contra un plano de recorte. El `near` se pone más lejos que
  // los coches de cabeza (cámara a ~6,6 de ellos): si empieza antes, la niebla
  // lava el morro y el tren parece roto. La cola, en cambio, sí entra en la
  // niebla, y ahí es donde se pierde el final de una unidad de 83 m.
  scene.fog = new THREE.Fog(PAPER, 9.5, 21);

  /* — movimiento de cámara: travelling, no órbita —
     La cámara NO gira alrededor del tren. Se desliza hacia delante, en paralelo
     a la vía, hasta quedar frente al morro, y vuelve. Se interpola en línea
     recta entre dos posiciones y dos objetivos, que es exactamente lo que hace
     una cámara sobre raíles en un rodaje:

       POS_LADO / MIRA_LADO      -> tres cuartos del costado, la vista de partida
       POS_FRENTE / MIRA_FRENTE  -> por delante del morro, mirándolo de frente

     Un `lerp` entre ambos pares da un desplazamiento limpio; un barrido polar
     daría la vuelta al vehículo, que es lo que había que evitar. */
  const POS_LADO = new THREE.Vector3(4.8, 1.4, 5.2);
  const POS_FRENTE = new THREE.Vector3(6.2, 1.05, 1.5);
  const MIRA_LADO = new THREE.Vector3(0, 0.56, 0);
  const MIRA_FRENTE = new THREE.Vector3(1.75, 0.48, 0);
  // 14 s de ida y vuelta: el movimiento se percibe sin llegar a marear.
  const PERIODO_CAMARA = 14;
  /**
   * Recorrido de cámara con `prefers-reduced-motion: reduce`.
   *
   * Antes se congelaba la cámara del todo, y eso dejaba el hero como una foto
   * fija para cualquiera que tenga desactivadas las animaciones del sistema
   * (en Windows es una casilla de Accesibilidad que mucha gente ni recuerda
   * haber tocado). El travelling es EL gesto de esta portada, así que en vez de
   * quitarlo se reduce: un tercio del recorrido y el doble de lento.
   *
   * Sigue respetando el espíritu de la preferencia: lo que marea de un
   * movimiento de cámara es la amplitud y la velocidad, no su existencia. Un
   * 60 % de recorrido a ritmo lento se percibe con claridad y sigue siendo
   * bastante menos movimiento del que ve quien no tiene la preferencia puesta.
   */
  const FRACCION_SUAVE = 0.6;
  const PERIODO_CAMARA_SUAVE = 20;

  const camera = new THREE.PerspectiveCamera(34, w0 / h0, 0.1, 60);
  camera.position.copy(POS_LADO);
  camera.lookAt(MIRA_LADO);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(w0, h0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);

  // Reflejos sin HDRI externo: RoomEnvironment se renderiza una vez a un cube
  // map PMREM y se descarta. Sin esto el metal del tren queda plano.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = entorno.texture;
  scene.environmentIntensity = 0.85;

  // Cielo blanco / rebote de papel: sobre fondo claro las sombras no pueden
  // cerrarse a negro o el modelo se recorta como un sticker.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdcd5cd, 0.9));

  const clave = new THREE.DirectionalLight(0xfff4ea, 2.1);
  clave.position.set(3.6, 5.4, 3.8);
  scene.add(clave);

  const relleno = new THREE.DirectionalLight(0xeef3ff, 0.85);
  relleno.position.set(-4.6, 2.2, 3);
  scene.add(relleno);

  // Contraluz de marca: recorta el borde superior del tren en bermellón. Es el
  // único color de señal de la escena, igual que en el mapa.
  const contraluz = new THREE.DirectionalLight(ACC_500, 1.5);
  contraluz.position.set(-2.8, 2.6, -3.6);
  scene.add(contraluz);

  const grupo = new THREE.Group();
  scene.add(grupo);

  // Telón de fondo: se monta antes que nada porque es lo único que no depende
  // del modelo, y así ya hay paisaje mientras se descarga el .glb.
  grupo.add(crearMontanas(basura));

  const estelas = crearEstelas(basura);
  grupo.add(estelas.objeto);

  const sombra = crearSombraContacto(basura);
  // Medida provisional: al cargar el .glb se reajusta al largo real del tren.
  sombra.scale.set(MORRO_X * 2, ANCHO_OBJETIVO * 1.5, 1);
  sombra.position.y = -0.145;
  grupo.add(sombra);

  // La vía y la escenografía se construyen DESPUÉS de cargar el modelo, cuando
  // ya se conoce su ancho: la trocha y el margen de los árboles se deducen de él
  // (ver `FACTOR_TROCHA`). Hasta entonces solo corren las estelas, y la barra de
  // carga explica la espera.
  let via: Via | null = null;
  let escenografia: Escenografia | null = null;

  // La caja del tren cuelga de este pivote: así el balanceo afecta al vehículo
  // y no a la vía, que tiene que quedarse quieta bajo él.
  const caja = new THREE.Group();
  grupo.add(caja);

  let modelo: THREE.Object3D | null = null;
  let alturaBase = 0; // y del modelo una vez apoyado sobre el carril
  let escalaLayout = 1; // factor por breakpoint, independiente del fundido
  let aparicion = 0; // 0..1, fundido de entrada del modelo ya cargado

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    MODELO_URL,
    (gltf) => {
      if (destruido) {
        gltf.scene.traverse((h) => {
          const m = h as THREE.Mesh;
          if (m.isMesh) m.geometry.dispose();
        });
        return;
      }
      const raiz = gltf.scene;

      // El .glb viene de Sketchfab con su propia escala, su centro y su
      // orientación. Se normaliza aquí para que la cámara, las luces y la vía no
      // dependan del export: así se puede cambiar de modelo sin retocar la
      // escena. No se toca ni un vértice ni un material más allá de esto.
      // `precise`: hay que medir vértice a vértice, no por cajas.
      //
      // El modelo va cuantizado (KHR_mesh_quantization), y eso mete una
      // rotación en la matriz de cada nodo. La medida rápida de three.js coge la
      // caja LOCAL de cada malla y la gira: para una pieza que en local es una
      // diagonal larga —los instrumentos de cabina repetidos coche a coche lo
      // son— la caja girada se hincha muchísimo. Este tren daba 83 × 71 × 82 en
      // vez de 3,8 × 6,2 × 83, y de ahí salía una escala 20 veces menor: el tren
      // aparecía como una maqueta perdida al fondo de la vía.
      let limites = new THREE.Box3().setFromObject(raiz, true);
      let medida = limites.getSize(new THREE.Vector3());

      // Un tren es mucho más largo que ancho: el eje horizontal mayor ES su
      // longitud. Si el modelo viene orientado sobre Z, se gira un cuarto de
      // vuelta para que corra sobre X, que es por donde va la vía.
      if (medida.z > medida.x) {
        raiz.rotation.y = -Math.PI / 2;
      }
      // Media vuelta más: el suelo corre hacia -X, así que el tren avanza hacia
      // +X y su morro tiene que mirar ahí. Sin esto circula marcha atrás, que es
      // justo lo que delata que la escena está montada al revés.
      raiz.rotation.y += Math.PI;
      raiz.updateMatrixWorld(true);
      limites = new THREE.Box3().setFromObject(raiz, true);
      medida = limites.getSize(new THREE.Vector3());

      const centro = limites.getCenter(new THREE.Vector3());
      const escala = ANCHO_OBJETIVO / Math.max(medida.z, 0.001);
      raiz.scale.setScalar(escala);
      alturaBase = -limites.min.y * escala;
      // El morro se clava siempre en el mismo punto de la vía; lo que sobre por
      // detrás se va hacia la niebla. Centrar el vehículo, en cambio, movería el
      // encuadre cada vez que el modelo tuviera otro número de coches.
      const largoEscena = medida.x * escala;
      raiz.position.set(MORRO_X - limites.max.x * escala, alturaBase, -centro.z * escala);

      via = crearVia(basura, Math.max(ANCHO_OBJETIVO * FACTOR_TROCHA, 0.08));
      grupo.add(via.objeto);
      sombra.scale.set(largoEscena * 1.04, ANCHO_OBJETIVO * 1.5, 1);
      sombra.position.x = MORRO_X - largoEscena / 2;

      // Pinos y rocas a partir del gálibo del vehículo: nunca dentro de él.
      escenografia = crearEscenografia(basura, ANCHO_OBJETIVO * 0.6);
      grupo.add(escenografia.objeto);

      raiz.traverse((hijo) => {
        const malla = hijo as THREE.Mesh;
        if (!malla.isMesh) return;
        basura.add(malla.geometry);
        for (const mat of Array.isArray(malla.material) ? malla.material : [malla.material]) {
          const std = basura.add(mat as THREE.MeshStandardMaterial);
          for (const clave of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'] as const) {
            const tex = std[clave];
            if (tex) basura.add(tex);
          }
          std.envMapIntensity = 1;
          // Se respeta el `side` del export: este modelo usa doble cara en
          // chapas y cristales, y forzar una sola abriría agujeros.
          // Lo único que se corrige es la profundidad de los materiales
          // translúcidos casi opacos, que GLTFLoader deja sin escribir y hacen
          // que la carrocería se vea fantasma.
          if (std.transparent && std.opacity >= 1) std.depthWrite = true;
        }
      });

      modelo = raiz;
      caja.add(raiz);
      opts.onProgress?.(1);
      opts.onReady?.();
    },
    (evento) => {
      if (evento.total > 0) opts.onProgress?.(Math.min(evento.loaded / evento.total, 0.99));
    },
    () => {
      if (!destruido) opts.onError?.();
    },
  );

  const inicio = performance.now();
  let ultimoTiempo = inicio;
  let punteroX = 0;
  let punteroY = 0;
  let punteroXSuave = 0;
  let punteroYSuave = 0;
  let scrollObjetivo = 0;
  let scrollSuave = 0;

  let corriendo = false;
  let raf = 0;
  let destruido = false;
  let enViewport = true;

  const objetivoVivo = new THREE.Vector3();

  const animate = (): void => {
    const ahora = performance.now();
    const dt = Math.min((ahora - ultimoTiempo) / 1000, 0.05);
    ultimoTiempo = ahora;
    const t = (ahora - inicio) / 1000;

    // Entrada del modelo: baja hasta apoyarse en el carril. Motivo: transición
    // de estado, marca el momento en que el .glb terminó de descargar.
    if (modelo && aparicion < 1) {
      aparicion = Math.min(aparicion + dt / 0.9, 1);
      const e = 1 - Math.pow(1 - aparicion, 3);
      modelo.position.y = alturaBase + 0.45 * (1 - e);
      grupo.scale.setScalar(escalaLayout * (0.96 + 0.04 * e));
    }

    // 1 · el suelo corre bajo el tren
    const avance = VELOCIDAD * dt * (reducedMotion ? 0.12 : 1);
    via?.avanzar(avance);
    escenografia?.avanzar(avance);
    estelas.avanzar(avance);

    // 2 · la caja cabecea y balancea sobre los bogies
    if (reducedMotion) {
      caja.position.y = 0;
      caja.rotation.set(0, 0, 0);
    } else {
      caja.position.y = Math.sin(t * 7.3) * 0.005 + Math.sin(t * 2.9) * 0.003;
      caja.rotation.z = Math.sin(t * 1.9) * 0.007;
      caja.rotation.x = Math.sin(t * 3.4 + 1.1) * 0.003;
    }

    // 3 · travelling de cámara: costado -> morro -> costado
    // Coseno: sale y llega con velocidad cero, sin el tirón de un ida-vuelta
    // lineal en los extremos del recorrido. Con movimiento reducido se recorta
    // la amplitud y se alarga el periodo, pero el gesto no desaparece.
    const periodo = reducedMotion ? PERIODO_CAMARA_SUAVE : PERIODO_CAMARA;
    const alcance = reducedMotion ? FRACCION_SUAVE : 1;
    const k = (0.5 - 0.5 * Math.cos((t / periodo) * Math.PI * 2)) * alcance;
    camera.position.lerpVectors(POS_LADO, POS_FRENTE, k);
    objetivoVivo.lerpVectors(MIRA_LADO, MIRA_FRENTE, k);

    if (!reducedMotion) {
      punteroXSuave += (punteroX - punteroXSuave) * 0.045;
      punteroYSuave += (punteroY - punteroYSuave) * 0.045;
      scrollSuave += (scrollObjetivo - scrollSuave) * 0.06;
      camera.position.x += punteroXSuave * 0.32;
      camera.position.y += punteroYSuave * -0.26 + scrollSuave * -0.35;
      camera.position.z += scrollSuave * 1.3;
    }
    camera.lookAt(objetivoVivo);

    renderer.render(scene, camera);
    if (corriendo) raf = requestAnimationFrame(animate);
  };

  const iniciarLoop = (): void => {
    if (corriendo || destruido) return;
    corriendo = true;
    ultimoTiempo = performance.now();
    raf = requestAnimationFrame(animate);
  };
  const detenerLoop = (): void => {
    corriendo = false;
    cancelAnimationFrame(raf);
  };
  const sincronizarEstado = (): void => {
    if (enViewport && !document.hidden) iniciarLoop();
    else detenerLoop();
  };

  /**
   * Reparte el ancho. En escritorio el hero ocupa la pantalla entera y el
   * titular vive en el tercio izquierdo, así que la escena se descentra con
   * `setViewOffset`: se renderiza una ventana desplazada del plano de imagen,
   * que mueve el tren a la derecha sin girar la cámara ni deformar la
   * perspectiva (lo que sí haría mover el objetivo).
   */
  const aplicarLayout = (): void => {
    const w = container.clientWidth || 1200;
    const h = container.clientHeight || 700;
    const anchoVentana = window.innerWidth;
    escalaLayout = anchoVentana < 720 ? 0.78 : anchoVentana < 1180 ? 0.9 : 1;
    grupo.scale.setScalar(escalaLayout * (aparicion >= 1 ? 1 : 0.96));
    camera.fov = anchoVentana < 720 ? 42 : anchoVentana < 1180 ? 37 : 34;
    camera.aspect = w / h;

    // Desplaza la ventana de render dentro del plano de imagen. Mover la
    // ventana a la izquierda y hacia abajo hace que el sujeto se vea más a la
    // derecha y más arriba, sin girar la cámara ni deformar la perspectiva (que
    // es lo que pasaría moviendo el objetivo).
    //
    // El desplazamiento vertical se aplica en TODOS los tamaños porque el
    // problema es el mismo en los tres: el hero mide una pantalla entera y, sin
    // corregir, el tren se queda clavado en mitad de la banda dejando un vacío
    // bajo el header. Lo que cambia por tamaño es el horizontal, que solo hace
    // falta cuando el titular comparte fila con la escena.
    if (anchoVentana >= 1180) {
      camera.setViewOffset(w, h, -w * 0.13, h * 0.11, w, h);
    } else if (anchoVentana >= 860) {
      camera.setViewOffset(w, h, -w * 0.06, h * 0.1, w, h);
    } else {
      // Bajo 860px el texto pasa a ocupar el pie del hero, así que la escena
      // sube a llenar la mitad alta en lugar de flotar en el centro.
      camera.setViewOffset(w, h, 0, h * 0.24, w, h);
    }
    camera.updateProjectionMatrix();
  };
  aplicarLayout();

  const onResize = (): void => {
    const w = container.clientWidth || 1200;
    const h = container.clientHeight || 700;
    renderer.setSize(w, h);
    aplicarLayout();
  };
  window.addEventListener('resize', onResize);

  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => onResize());
    resizeObserver.observe(container);
  }

  let onPointerMove: ((event: PointerEvent) => void) | undefined;
  if (!reducedMotion) {
    onPointerMove = (event: PointerEvent): void => {
      punteroX = (event.clientX / window.innerWidth) * 2 - 1;
      punteroY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointerMove);
  }

  const onVisibility = (): void => sincronizarEstado();
  document.addEventListener('visibilitychange', onVisibility);

  // Un contexto WebGL perdido (cambio de GPU, suspensión) dejaría un lienzo
  // vacío para siempre: se para el loop y se avisa para que el hero se degrade.
  const onContextLost = (event: Event): void => {
    event.preventDefault();
    detenerLoop();
    opts.onError?.();
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);

  let observer: IntersectionObserver | undefined;
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      ([entry]) => {
        enViewport = entry.isIntersecting;
        sincronizarEstado();
      },
      { rootMargin: '160px 0px' },
    );
    observer.observe(container);
  } else {
    sincronizarEstado();
  }

  return {
    setScroll(progreso: number): void {
      scrollObjetivo = Math.min(Math.max(progreso, 0), 1);
    },
    dispose(): void {
      destruido = true;
      corriendo = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (onPointerMove) window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      observer?.disconnect();
      resizeObserver?.disconnect();

      basura.vaciar();
      entorno.texture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
