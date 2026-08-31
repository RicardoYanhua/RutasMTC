import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { StepperComponent } from '../../shared/components/stepper/stepper.component';
import { transicionPaso } from '../../shared/animations/animar.util';

const PASO_POR_SEGMENTO: Record<string, number> = {
  preferencias: 1,
  estacion: 2,
  alternativas: 3,
  ruta: 4,
  informe: 5,
};

@Component({
  selector: 'app-wizard-layout',
  imports: [RouterOutlet, StepperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // El contenedor NO envuelve al paso: los pasos con mapa a sección completa
  // (estación) necesitan llegar de borde a borde. Cada paso aplica `.container`
  // a sus propios bloques de texto, que es lo único que debe ir centrado.
  template: `
    <app-stepper [actual]="pasoActual()" />
    <div #contenido class="wizard-paso">
      <router-outlet />
    </div>
  `,
  styles: [
    `
      .wizard-paso {
        padding-block: clamp(28px, 4vw, 56px) var(--space-16);
      }
    `,
  ],
})
export class WizardLayoutComponent {
  @ViewChild('contenido', { static: true }) private contenido!: ElementRef<HTMLElement>;

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly pasoActual = signal(1);

  constructor() {
    this.actualizarPaso(this.router.url);
    const sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.actualizarPaso(e.urlAfterRedirects);
        // Transición entre pasos: el contenido entrante sube. Motivo: transición
        // de estado, deja claro que cambió el paso y no solo parte del contenido.
        queueMicrotask(() => transicionPaso(this.contenido.nativeElement));
      });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  /** Deriva el paso activo del propio URL (evita depender del árbol de ActivatedRoute, que aún puede no estar activado en el constructor). */
  private actualizarPaso(url: string): void {
    const segmentos = url.split('?')[0].split('/').filter(Boolean);
    for (let i = segmentos.length - 1; i >= 0; i--) {
      const paso = PASO_POR_SEGMENTO[segmentos[i]];
      if (paso) {
        this.pasoActual.set(paso);
        return;
      }
    }
  }
}
