import { Categoria } from '../models/preferencias.model';

/**
 * Fotografía de cada categoría de interés del paso 1 del planificador.
 *
 * Antes eran filas de `cfg_interes` que el gestor MTC subía desde el panel.
 * Se volvieron a archivos del repositorio (`public/img/intereses/`) porque en
 * la práctica nunca cambiaron por campaña como se previó: son 5 fotos fijas,
 * así que mantener tabla, endpoint, subida y pantalla de configuración solo
 * para esto era complejidad sin beneficio real.
 *
 * Sin `/` inicial a propósito: con `<base href="/">` en index.html, Angular
 * resuelve la ruta contra la raíz del sitio sin importar la URL activa (mismo
 * patrón que `models/intercity-125.glb` en la escena del landing).
 */
export const IMAGEN_INTERES: Record<Categoria, string> = {
  Naturaleza: 'img/intereses/naturaleza.jpg',
  Historia: 'img/intereses/historia.jpg',
  Aventura: 'img/intereses/aventura.jpg',
  Cultura: 'img/intereses/cultura.jpg',
  Gastronomía: 'img/intereses/gastronomia.jpg',
};
