import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { MEDIA_BASE_URL } from '../../../core/config/api.config';
import { IconComponent, IconName } from '../icon/icon.component';

/**
 * Hueco de imagen del sistema.
 *
 * Mientras no haya foto real (`src` vacío, o una ruta que devuelve 404) pinta un
 * marcador de posición neutro con trama diagonal, reservando ya la caja
 * definitiva: así el layout no salta cuando se sustituye por la foto (CLS ~ 0).
 *
 * Resuelve él mismo las rutas relativas que devuelve la API (`/uploads/...`)
 * contra `MEDIA_BASE_URL`. De este modo la landing, el planificador y el panel
 * comparten una única regla y basta con guardar la ruta en la base de datos.
 *
 * Dos modos:
 *  · normal  -> la caja la define `ratio` ("16 / 9", "4 / 3", "1")
 *  · `fill`  -> se estira sobre el padre posicionado; es el modo de las
 *               tarjetas que llevan la fotografía de fondo cubriendo todo
 *
 * El radio se hereda del contenedor, de forma que el mismo componente sirve
 * dentro de una tarjeta (16px) o de una superficie grande (28px).
 */
@Component({
  selector: 'app-image-slot',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url(); as fuente) {
      <img
        [src]="fuente"
        [alt]="alt()"
        [attr.loading]="priority() ? null : 'lazy'"
        [attr.fetchpriority]="priority() ? 'high' : null"
        decoding="async"
        (error)="fallo.set(true)"
      />
    } @else {
      <div class="slot__ph" role="img" [attr.aria-label]="alt() || 'Imagen pendiente'">
        <app-icon [name]="icon()" [size]="iconSize()" [strokeWidth]="1.6" />
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
        overflow: hidden;
        border-radius: inherit;
        background: var(--surface-2);
        aspect-ratio: var(--slot-ratio, 16 / 9);
      }
      /* Modo cobertura: la caja la manda el padre, no la relación de aspecto. */
      :host([data-fill='true']) {
        position: absolute;
        inset: 0;
        aspect-ratio: auto;
        background: none;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .slot__ph {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        color: var(--ink-300);
        /* Trama diagonal muy tenue: comunica "pendiente" sin gritar. */
        background-image: repeating-linear-gradient(
          -45deg,
          transparent 0 9px,
          color-mix(in srgb, var(--ink-200) 30%, transparent) 9px 10px
        );
      }
    `,
  ],
  host: {
    '[style.--slot-ratio]': 'ratio()',
    '[attr.data-fill]': 'fill()',
  },
})
export class ImageSlotComponent {
  readonly src = input<string | null>(null);
  readonly alt = input('');
  readonly ratio = input('16 / 9');
  readonly iconSize = input(30);
  readonly icon = input<IconName>('image');
  readonly priority = input(false);
  readonly fill = input(false);

  /** La ruta existía pero la imagen no cargó: se cae al hueco con trama. */
  readonly fallo = signal(false);

  constructor() {
    // Si cambia el origen hay que volver a intentarlo: si no, una tarjeta que
    // reutiliza el componente (listas con `track`) arrastraría el fallo de la
    // imagen anterior.
    effect(() => {
      this.src();
      this.fallo.set(false);
    });
  }

  /** Una ruta que empieza por `/` viene de la API y necesita su origen delante. */
  readonly url = computed(() => {
    const bruta = this.src();
    if (!bruta || this.fallo()) return null;
    return bruta.startsWith('/') ? `${MEDIA_BASE_URL}${bruta}` : bruta;
  });
}
