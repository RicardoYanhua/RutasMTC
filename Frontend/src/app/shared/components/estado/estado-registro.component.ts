import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Etiqueta de estado de un registro del catálogo.
 *
 * Dos banderas independientes que el operador tiene que poder distinguir de un
 * vistazo, porque las decide gente distinta:
 *
 *   baja       -> la retiró su dueño (PeruRail o Travel Group)
 *   pendiente  -> está viva pero el gestor MTC aún no la ha publicado
 *   publicada  -> visible en el planificador del ciudadano
 *
 * Se muestra UNA sola etiqueta, la que manda: una zona dada de baja no está
 * "pendiente de publicar", está de baja y punto.
 */
@Component({
  selector: 'app-estado-registro',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="estado" [class]="'estado estado--' + estado()">
      <app-icon [name]="icono()" [size]="11" [strokeWidth]="2.4" />
      {{ texto() }}
    </span>
  `,
  styles: [':host { display: inline-flex; }'],
})
export class EstadoRegistroComponent {
  readonly activo = input.required<number | boolean>();
  readonly publicado = input.required<number | boolean>();
  /** Nombre en femenino o masculino según la entidad ("dada"/"dado" de baja). */
  readonly genero = input<'f' | 'm'>('f');

  readonly estado = computed<'baja' | 'pendiente' | 'publicado'>(() => {
    if (!this.activo()) return 'baja';
    return this.publicado() ? 'publicado' : 'pendiente';
  });

  readonly icono = computed(() => {
    const e = this.estado();
    if (e === 'baja') return 'close' as const;
    return e === 'publicado' ? ('check' as const) : ('clock' as const);
  });

  readonly texto = computed(() => {
    const e = this.estado();
    if (e === 'publicado') return 'Publicada'.replace(/a$/, this.genero() === 'f' ? 'a' : 'o');
    if (e === 'pendiente') return 'Pendiente';
    return this.genero() === 'f' ? 'De baja' : 'De baja';
  });
}
