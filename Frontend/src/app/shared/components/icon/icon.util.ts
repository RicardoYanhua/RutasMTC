import { Categoria } from '../../../core/models/preferencias.model';
import { IconName } from './icon.component';

const ICONO_POR_CATEGORIA: Record<Categoria, IconName> = {
  Naturaleza: 'leaf',
  Historia: 'book',
  Aventura: 'mountain',
  Cultura: 'landmark',
  Gastronomía: 'utensils',
};

export function iconoDeCategoria(categoria: Categoria): IconName {
  return ICONO_POR_CATEGORIA[categoria] ?? 'pin';
}

export function iconoDeClima(condicion: string): IconName {
  const c = condicion.toLowerCase();
  if (c.includes('lluvia') || c.includes('llovizna') || c.includes('chubasco') || c.includes('tormenta')) return 'cloud-rain';
  return 'sun';
}
