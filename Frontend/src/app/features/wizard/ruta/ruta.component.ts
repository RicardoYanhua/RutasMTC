import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WizardStateService } from '../../../core/services/wizard-state.service';
import { ClimaService } from '../../../core/services/clima.service';
import { Clima } from '../../../core/models/clima.model';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { ImageSlotComponent } from '../../../shared/components/image-slot/image-slot.component';
import { LeafletMapComponent, MapaMarcador } from '../../../shared/components/map/leaflet-map.component';
import { iconoDeClima } from '../../../shared/components/icon/icon.util';
import { construirTimelinePreview } from '../../../shared/utils/ruta-preview.util';
import { fadeUp, staggerIn } from '../../../shared/animations/animar.util';

@Component({
  selector: 'app-ruta',
  imports: [IconComponent, ImageSlotComponent, LeafletMapComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ruta.component.html',
  styleUrl: './ruta.component.css',
})
export class RutaComponent implements OnInit {
  @ViewChild('panel', { static: true }) private panel!: ElementRef<HTMLElement>;

  readonly wizard = inject(WizardStateService);
  private readonly climaService = inject(ClimaService);
  private readonly router = inject(Router);

  readonly clima = signal<Clima | null>(null);
  readonly cargandoClima = signal(true);

  readonly distanciaTotal = computed(() => Number(((this.wizard.zona()?.zon_distancia_km ?? 0) * 2).toFixed(2)));
  readonly tiempoTotal = computed(() => this.wizard.zona()?.zon_minutos_ida_vuelta ?? 0);

  readonly timeline = computed(() => {
    const zona = this.wizard.zona();
    const estacion = this.wizard.estacion();
    if (!zona || !estacion) return [];
    return construirTimelinePreview(estacion.est_nombre, zona.zon_nombre, this.tiempoTotal(), zona.hitos ?? []);
  });

  /**
   * El mapa de este paso ancla la estación (inicio y fin del recorrido) y dibuja
   * el alcance real de la zona elegida. No se inventan coordenadas para la zona
   * porque el catálogo no las registra: el círculo es distancia declarada, no
   * una ruta trazada.
   */
  readonly marcadorEstacion = computed<MapaMarcador[]>(() => {
    const e = this.wizard.estacion();
    if (!e) return [];
    return [
      {
        id: e.est_id_estacion,
        lat: e.est_latitud,
        lng: e.est_longitud,
        label: e.est_nombre,
        detalle: 'Salida y retorno',
      },
    ];
  });

  ngOnInit(): void {
    const estacion = this.wizard.estacion();
    if (estacion) {
      this.climaService.obtener(estacion.est_id_estacion, this.wizard.fecha()).subscribe({
        next: (c) => {
          this.clima.set(c);
          this.cargandoClima.set(false);
        },
        error: () => this.cargandoClima.set(false),
      });
    }
    queueMicrotask(() => {
      fadeUp(this.panel.nativeElement.querySelectorAll('.stagger-item'), { stagger: 0.05 });
      staggerIn(this.panel.nativeElement.querySelectorAll('.timeline__paso'), { delay: 0.15, y: 12 });
    });
  }

  iconoClima(): IconName {
    return this.clima() ? iconoDeClima(this.clima()!.cli_condicion) : 'sun';
  }

  iconoPaso(tipo: string): IconName {
    if (tipo === 'salida') return 'train';
    if (tipo === 'retorno') return 'flag';
    if (tipo === 'destino') return 'pin';
    return 'walk';
  }

  esHito(tipo: string): boolean {
    return tipo === 'hito_ida' || tipo === 'hito_vuelta';
  }

  verOtrasZonas(): void {
    this.router.navigateByUrl('/planificar/alternativas');
  }

  generarInforme(): void {
    this.router.navigateByUrl('/planificar/informe');
  }
}
