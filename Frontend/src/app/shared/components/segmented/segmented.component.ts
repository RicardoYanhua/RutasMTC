import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import { moverThumbSeg } from '../../animations/animar.util';

/**
 * Control segmentado con pulgar deslizante.
 *
 * El fondo blanco viaja de una opción a otra en vez de parpadear: la animación
 * comunica una transición de estado (de dónde venía la selección y a dónde
 * fue). El reposicionamiento también se dispara en `resize`, porque el ancho de
 * cada opción depende del texto y del viewport.
 */
@Component({
  selector: 'app-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #host class="seg" role="group" [attr.aria-label]="ariaLabel()">
      <span class="seg__thumb" aria-hidden="true"></span>
      @for (opcion of options(); track opcion) {
        <button
          type="button"
          class="seg-opt"
          [class.is-active]="opcion === value()"
          [attr.aria-pressed]="opcion === value()"
          (click)="elegir(opcion)"
        >
          {{ opcion }}
        </button>
      }
    </div>
  `,
  styles: [':host { display: inline-flex; max-width: 100%; } .seg { max-width: 100%; overflow: hidden; }'],
})
export class SegmentedComponent implements AfterViewInit {
  @ViewChild('host', { static: true }) private host!: ElementRef<HTMLDivElement>;

  readonly options = input.required<readonly string[]>();
  readonly value = input.required<string>();
  readonly ariaLabel = input('Opciones');
  readonly valueChange = output<string>();

  constructor(destroyRef: DestroyRef) {
    // Sigue al valor: cuando cambia desde fuera (p. ej. un reset del wizard) el
    // pulgar se recoloca igual que si el usuario hubiese pulsado.
    effect(() => {
      this.value();
      queueMicrotask(() => this.sincronizar());
    });

    const onResize = () => this.sincronizar();
    window.addEventListener('resize', onResize);
    destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
  }

  ngAfterViewInit(): void {
    this.sincronizar();
  }

  elegir(opcion: string): void {
    if (opcion !== this.value()) this.valueChange.emit(opcion);
  }

  private sincronizar(): void {
    const contenedor = this.host?.nativeElement;
    if (!contenedor) return;
    const activo = contenedor.querySelector<HTMLElement>('.seg-opt.is-active');
    moverThumbSeg(contenedor, activo);
  }
}
