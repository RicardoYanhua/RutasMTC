/**
 * Roles del panel. Cada uno corresponde a una de las fuentes que describe el
 * caso, más el ministerio que gobierna la plataforma.
 */
export type RolPanel = 'perurail' | 'travelgroup' | 'mtc';

/** Módulos del panel. El rol decide cuáles se ven y cuáles se pueden editar. */
export type ModuloPanel = 'zonas' | 'estaciones' | 'servicios' | 'publicacion';

export interface AdminUsuario {
  id: number;
  usuario: string;
  nombreCompleto: string | null;
  rol: RolPanel;
  entidad: string | null;
}

export interface CuentaDemo {
  usuario: string;
  clave: string;
  nombreCompleto: string | null;
  rol: RolPanel;
  entidad: string | null;
}

export interface LoginRequest {
  usuario: string;
  clave: string;
}

export interface LoginResponse {
  success: boolean;
  mensaje: string;
  token: string;
  usuario: AdminUsuario;
}

/** Etiquetas legibles de cada rol, para el panel y la pantalla de acceso. */
export const ETIQUETA_ROL: Record<RolPanel, string> = {
  perurail: 'PeruRail',
  travelgroup: 'Travel Group Perú',
  mtc: 'Gestor MTC',
};

export const DESCRIPCION_ROL: Record<RolPanel, string> = {
  perurail: 'Registra estaciones, horarios y tarifas.',
  travelgroup: 'Registra zonas turísticas y las vincula a una estación.',
  mtc: 'Ve todos los módulos y decide qué se publica al ciudadano.',
};

/**
 * Permisos por rol, en un solo sitio.
 *
 * `ve` decide qué aparece en el menú; `edita` decide si el módulo se abre en
 * modo escritura o en consulta. El gestor MTC ve todo, y en los módulos que no
 * son suyos entra igualmente con permiso de escritura porque es quien responde
 * por la plataforma.
 *
 * Esto es comodidad de interfaz, no seguridad: el permiso real lo comprueba el
 * backend en cada ruta (ver `middleware/auth.middleware.js`).
 */
export const PERMISOS: Record<RolPanel, { ve: ModuloPanel[]; edita: ModuloPanel[] }> = {
  travelgroup: {
    ve: ['zonas', 'estaciones', 'servicios'],
    edita: ['zonas'],
  },
  perurail: {
    ve: ['estaciones', 'servicios', 'zonas'],
    edita: ['estaciones', 'servicios'],
  },
  mtc: {
    ve: ['zonas', 'estaciones', 'servicios', 'publicacion'],
    edita: ['zonas', 'estaciones', 'servicios', 'publicacion'],
  },
};
