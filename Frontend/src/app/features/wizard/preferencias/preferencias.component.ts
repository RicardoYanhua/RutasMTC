import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WizardStateService } from '../../../core/services/wizard-state.service';
import { ZonaService } from '../../../core/services/zona.service';
import { IMAGEN_INTERES } from '../../../core/config/intereses-imagenes';
import { CATEGORIAS, Categoria, DIFICULTADES, Dificultad } from '../../../core/models/preferencias.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SegmentedComponent } from '../../../shared/components/segmented/segmented.component';
import { ImageSlotComponent } from '../../../shared/components/image-slot/image-slot.component';
import { iconoDeCategoria } from '../../../shared/components/icon/icon.util';
import { fadeUp, pulso } from '../../../shared/animations/animar.util';

/** Ritmo de caminata usado para estimar el alcance: 4 km/h, paso turístico en cuesta. */
const KMH_A_PIE = 4;

const NOTA_POR_DIFICULTAD: Record<Dificultad, string> = {
  Fácil: 'Terreno llano o urbano, sin desniveles marcados.',
  Moderada: 'Incluye cuestas y tramos de tierra; calzado cerrado recomendado.',
  Exigente: 'Pendientes sostenidas y altitud. Solo con buen estado físico.',
};

@Component({
  selector: 'app-preferencias',
  imports: [IconComponent, SegmentedComponent, ImageSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './preferencias.component.html',
  styleUrl: './preferencias.component.css',
})
export class PreferenciasComponent implements OnInit {
  @ViewChild('panel', { static: true }) private panel!: ElementRef<HTMLElement>;
  @ViewChild('conteo') private conteo?: ElementRef<HTMLElement>;

  readonly wizard = inject(WizardStateService);
  private readonly zonaService = inject(ZonaService);
  private readonly router = inject(Router);

  readonly categorias = CATEGORIAS;
  readonly dificultades = DIFICULTADES;
  readonly zonasQueCalifican = signal<number | null>(null);
  readonly hoy = new Date().toISOString().slice(0, 10);
  readonly errorFecha = signal<string | null>(null);

  /** Relleno del slider (30-240 min). Solo presentación, no es estado del wizard. */
  readonly progresoRango = computed(() => Math.round(((this.wizard.minutosMax() - 30) / (240 - 30)) * 100));
  readonly horasLegibles = computed(() => {
    const min = this.wizard.minutosMax();
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  });
  /** Mitad del tiempo es la ida, a 4 km/h. Es una estimación y se etiqueta como tal. */
  readonly alcanceKm = computed(() => Number(((this.wizard.minutosMax() / 2 / 60) * KMH_A_PIE).toFixed(1)));
  readonly notaDificultad = computed(() => NOTA_POR_DIFICULTAD[this.wizard.dificultadMax()]);
  readonly puedeContinuar = computed(() => this.wizard.preferenciasCompletas() && !this.errorFecha());

  ngOnInit(): void {
    fadeUp(this.panel.nativeElement.querySelectorAll('.stagger-item'), { stagger: 0.06 });
    this.actualizarConteo();
  }

  iconoCategoria(categoria: Categoria) {
    return iconoDeCategoria(categoria);
  }

  imagenInteres(categoria: Categoria): string {
    return IMAGEN_INTERES[categoria];
  }

  interesActivo(categoria: Categoria): boolean {
    return this.wizard.intereses().includes(categoria);
  }

  alternarInteres(categoria: Categoria): void {
    this.wizard.alternarInteres(categoria);
    this.actualizarConteo();
  }

  elegirDificultad(valor: string): void {
    this.wizard.dificultadMax.set(valor as Dificultad);
    this.actualizarConteo();
  }

  onMinutosChange(valor: string): void {
    this.wizard.minutosMax.set(Number(valor));
    this.actualizarConteo();
  }

  onFechaChange(valor: string): void {
    if (valor < this.hoy) {
      this.errorFecha.set('La fecha del viaje no puede ser anterior a hoy.');
      return;
    }
    this.errorFecha.set(null);
    this.wizard.fecha.set(valor);
  }

  private actualizarConteo(): void {
    this.zonaService
      .listar({
        intereses: this.wizard.intereses().length ? this.wizard.intereses() : undefined,
        dificultadMax: this.wizard.dificultadMax(),
        minutosMax: this.wizard.minutosMax(),
      })
      .subscribe((zonas) => {
        this.zonasQueCalifican.set(zonas.length);
        // Rebote corto sobre la cifra. Motivo: feedback. Confirma que el cambio
        // de filtro llegó al servidor y ya se recalculó.
        queueMicrotask(() => pulso(this.conteo?.nativeElement ?? null));
      });
  }

  continuar(): void {
    if (!this.puedeContinuar()) return;
    this.router.navigateByUrl('/planificar/estacion');
  }
}
