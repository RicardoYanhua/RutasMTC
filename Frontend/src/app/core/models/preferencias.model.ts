export type Categoria = 'Naturaleza' | 'Historia' | 'Aventura' | 'Cultura' | 'Gastronomía';
export type Dificultad = 'Fácil' | 'Moderada' | 'Exigente';

export const CATEGORIAS: Categoria[] = ['Naturaleza', 'Historia', 'Aventura', 'Cultura', 'Gastronomía'];
export const DIFICULTADES: Dificultad[] = ['Fácil', 'Moderada', 'Exigente'];
export const DIFICULTAD_RANGO: Record<Dificultad, number> = { Fácil: 1, Moderada: 2, Exigente: 3 };

export interface Preferencias {
  intereses: Categoria[];
  dificultadMax: Dificultad;
  minutosMax: number;
  fecha: string;
}
