import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { WizardStateService } from '../../../core/services/wizard-state.service';
import { EstacionService } from '../../../core/services/estacion.service';
import { Estacion } from '../../../core/models/estacion.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { SwitchComponent } from '../../../shared/components/switch/switch.component';
import { ImageSlotComponent } from '../../../shared/components/image-slot/image-slot.component';
import { LeafletMapComponent, MapaMarcador } from '../../../shared/components/map/leaflet-map.component';
import { fadeUp } from '../../../shared/animations/animar.util';

/** Ritmo de caminata usado para estimar el alcance: 4 km/h, paso turístico en cuesta. */
const KMH_A_PIE = 4;

@Component({
  selector: 'app-estacion',
  imports: [IconComponent, SwitchComponent, LeafletMapComponent, ImageSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estacion.component.html',
  styleUrl: './estacion.component.css',
})
export class EstacionComponent implements OnInit, OnDestroy {
  @ViewChild('panel', { static: true }) private panel!: ElementRef<HTMLElement>;

  readonly wizard = inject(WizardStateService);
  private readonly estacionService = inject(EstacionService);
  private readonly router = inject(Router);

  readonly estaciones = signal<Estacion[]>([]);
  readonly cargando = signal(true);
  readonly resaltadaId = signal<number | null>(null);
  readonly verAlcance = signal(true);

  readonly marcadores = computed<MapaMarcador[]>(() =>
    this.estaciones().map((e) => ({
      id: e.est_id_estacion,
      lat: e.est_latitud,
      lng: e.est_longitud,
      label: e.est_nombre,
      detalle: `${e.est_region} · ${e.est_altitud_msnm} msnm`,
    })),
  );

  readonly estacionActivaId = computed(() => this.wizard.estacion()?.est_id_estacion ?? null);

  /**
   * Alcance aproximado de ida, derivado de los minutos que el usuario declaró
   * en el paso anterior: la mitad del tiempo es la ida, a 4 km/h. Es una
   * estimación y se etiqueta como tal en la interfaz.
   */
  readonly alcanceKm = computed(() => Number(((this.wizard.minutosMax() / 2 / 60) * KMH_A_PIE).toFixed(1)));

  /**
   * Relleno del encuadre: reserva el ancho de los dos paneles superpuestos
   * sobre el lienzo para que ningún marcador quede debajo. Bajo 1080px los
   * paneles salen del mapa y se apilan, así que vuelve al relleno normal.
   */
  readonly anchoVentana = signal(typeof window === 'undefined' ? 1440 : window.innerWidth);
  readonly rellenoInicio = computed<[number, number]>(() =>
    this.anchoVentana() > 1080 ? [430, 96] : [48, 64],
  );
  readonly rellenoFin = computed<[number, number]>(() =>
    this.anchoVentana() > 1080 ? [356, 112] : [48, 72],
  );

  private onResize?: () => void;

  ngOnInit(): void {
    this.onResize = () => this.anchoVentana.set(window.innerWidth);
    window.addEventListener('resize', this.onResize);

    this.estacionService.listar().subscribe({
      next: (estaciones) => {
        this.estaciones.set(estaciones);
        this.cargando.set(false);
        queueMicrotask(() => fadeUp(this.panel.nativeElement.querySelectorAll('.stagger-item'), { stagger: 0.06 }));
      },
      error: () => this.cargando.set(false),
    });
  }

  ngOnDestroy(): void {
    if (this.onResize) window.removeEventListener('resize', this.onResize);
  }

  seleccionar(estacion: Estacion): void {
    this.wizard.seleccionarEstacion(estacion);
  }

  onMarkerClick(id: number): void {
    const estacion = this.estaciones().find((e) => e.est_id_estacion === id);
    if (estacion) this.seleccionar(estacion);
  }

  resaltar(id: number | null): void {
    this.resaltadaId.set(id);
  }

  volver(): void {
    this.router.navigateByUrl('/planificar/preferencias');
  }

  continuar(): void {
    if (!this.wizard.estacionSeleccionada()) return;
    this.router.navigateByUrl('/planificar/alternativas');
  }
}
