import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export interface PasoWizard {
  numero: number;
  etiqueta: string;
}

export const PASOS_WIZARD: PasoWizard[] = [
  { numero: 1, etiqueta: 'Preferencias' },
  { numero: 2, etiqueta: 'Estación' },
  { numero: 3, etiqueta: 'Alternativas' },
  { numero: 4, etiqueta: 'Ruta' },
  { numero: 5, etiqueta: 'Informe' },
];

/**
 * Progreso del planificador. Sobre la lista de pasos hay una barra que se
 * rellena: la animación comunica avance, y en móvil (donde solo cabe la
 * etiqueta activa) es la única pista de "cuánto queda".
 */
@Component({
  selector: 'app-stepper',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stepper no-imprimir">
      <div class="stepper__rail" aria-hidden="true">
        <span class="stepper__fill" [style.width.%]="progreso()"></span>
      </div>
      <nav class="stepper__steps" aria-label="Progreso del planificador de rutas">
        @for (paso of pasos; track paso.numero; let last = $last) {
          <div
            class="stepper__step"
            [class.stepper__step--active]="paso.numero === actual()"
            [class.stepper__step--done]="paso.numero < actual()"
            [attr.aria-current]="paso.numero === actual() ? 'step' : null"
          >
            <span class="stepper__num">
              @if (paso.numero < actual()) {
                <app-icon name="check" [size]="12" [strokeWidth]="2.4" />
              } @else {
                {{ paso.numero }}
              }
            </span>
            <span>{{ paso.etiqueta }}</span>
          </div>
          @if (!last) {
            <span class="stepper__sep" aria-hidden="true"></span>
          }
        }
      </nav>
    </div>
  `,
})
export class StepperComponent {
  readonly actual = input.required<number>();
  readonly pasos = PASOS_WIZARD;

  readonly progreso = computed(() => Math.round(((this.actual() - 1) / (PASOS_WIZARD.length - 1)) * 100));
}
