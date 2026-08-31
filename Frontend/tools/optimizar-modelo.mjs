/**
 * Optimiza el .glb del hero para la web.
 *
 * El original de Sketchfab (`semi-modern_train.glb`) pesa 107 MB: 86,8 MB son
 * 19 texturas PNG de 4096², y el resto geometría sin comprimir. Servir eso en
 * una landing es inviable, así que este script produce el archivo que vive en
 * `public/models/semi-modern-train.glb` (3,5 MB, misma malla de 252.866
 * triángulos, sin simplificar):
 *
 *   1. texturas  4096 PNG  ->  1024 WebP q78     (86,8 MB -> 0,96 MB)
 *   2. dedup + flatten + join + weld + prune     (limpia el export)
 *   3. EXT_meshopt_compression                   (geometría, decodifica rápido)
 *
 * Se usa meshopt y no Draco a propósito: el decodificador de meshopt es un
 * módulo ES que three.js ya trae (`meshopt_decoder.module.js`) y se empaqueta
 * con la app, mientras que Draco obliga a servir un .wasm aparte desde
 * `public/`.
 *
 * Por qué el paso de texturas es manual y no `gltf-transform optimize`: el CLI
 * falla con las máscaras en escala de grises con alfa de este modelo
 * ("colourspace: parameter space not set" de libvips). Forzar `toColourspace`
 * antes de convertir lo resuelve.
 *
 * Uso (las dependencias NO están en package.json; se instalan al vuelo porque
 * esto se ejecuta una vez, no en cada build):
 *
 *   npm i --no-save @gltf-transform/core @gltf-transform/extensions \
 *                   @gltf-transform/functions meshoptimizer sharp
 *   node tools/optimizar-modelo.mjs <origen.glb> public/models/destino.glb [tamaño] [calidad]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, meshopt, prune, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const [origen, destino, tamano = '1024', calidad = '78'] = process.argv.slice(2);

if (!origen || !destino) {
  console.error('Uso: node tools/optimizar-modelo.mjs <origen.glb> <destino.glb> [tamaño] [calidad]');
  process.exit(1);
}

await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const doc = await io.read(origen);

let antes = 0;
let despues = 0;
for (const textura of doc.getRoot().listTextures()) {
  const datos = textura.getImage();
  if (!datos) continue;
  antes += datos.byteLength;

  const meta = await sharp(datos).metadata();
  // `toColourspace('srgb')` es obligatorio: sin él, las máscaras b-w con alfa
  // hacen reventar a libvips al convertir a WebP.
  let tuberia = sharp(datos).toColourspace('srgb').resize(Number(tamano), Number(tamano), { fit: 'inside' });
  if (meta.hasAlpha) tuberia = tuberia.ensureAlpha();

  const salida = await tuberia.webp({ quality: Number(calidad), effort: 6, alphaQuality: 90 }).toBuffer();
  textura.setImage(new Uint8Array(salida)).setMimeType('image/webp');
  despues += salida.byteLength;
}
console.log(`texturas: ${(antes / 1048576).toFixed(1)} MB -> ${(despues / 1048576).toFixed(2)} MB`);

await doc.transform(
  dedup(),
  flatten(),
  join(),
  weld(),
  prune({ keepAttributes: false, keepLeaves: false }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

await io.write(destino, doc);
console.log(`escrito: ${destino}`);
