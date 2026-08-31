export const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Origen que sirve los archivos estáticos subidos por el panel. En la base de
 * datos las zonas guardan solo la ruta relativa (`/uploads/<archivo>`), así que
 * hace falta este prefijo para resolverla a una URL cargable.
 */
export const MEDIA_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');
