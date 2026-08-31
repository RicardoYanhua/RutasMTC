import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WizardStateService } from '../../../core/services/wizard-state.service';
import { ZonaService } from '../../../core/services/zona.service';
import { ClimaService } from '../../../core/services/clima.service';
import { ServicioService } from '../../../core/services/servicio.service';
import { ZonaTuristica } from '../../../core/models/zona.model';
import { Clima } from '../../../core/models/clima.model';
import { Servicio } from '../../../core/models/servicio.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ImageSlotComponent } from '../../../shared/components/image-slot/image-slot.component';
import { iconoDeCategoria, iconoDeClima } from '../../../shared/components/icon/icon.util';
import { fadeUp, staggerIn } from '../../../shared/animations/animar.util';

@Component({
  selector: 'app-alternativas',
  imports: [IconComponent, ImageSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alternativas.component.html',
  styleUrl: './alternativas.component.css',
})
export class AlternativasComponent implements OnInit {
  @ViewChild('panel', { static: true }) private panel!: ElementRef<HTMLElement>;

  readonly wizard = inject(WizardStateService);
  private readonly zonaService = inject(ZonaService);
  private readonly climaService = inject(ClimaService);
  private readonly servicioService = inject(ServicioService);
  private readonly router = inject(Router);

  readonly zonas = signal<ZonaTuristica[]>([]);
  readonly clima = signal<Clima | null>(null);
  readonly servicio = signal<Servicio | null>(null);
  readonly cargando = signal(true);
  readonly cargandoClima = signal(true);
  readonly cargandoServicio = signal(true);

  readonly zonaActivaId = computed(() => this.wizard.zona()?.zon_id_zona ?? null);

  ngOnInit(): void {
    const estacion = this.wizard.estacion();
    if (!estacion) return;

    this.zonaService
      .listar({
        estacionId: estacion.est_id_estacion,
        intereses: this.wizard.intereses(),
        dificultadMax: this.wizard.dificultadMax(),
        minutosMax: this.wizard.minutosMax(),
      })
      .subscribe({
        next: (zonas) => {
          this.zonas.set(zonas);
          this.cargando.set(false);
          queueMicrotask(() => {
            fadeUp(this.panel.nativeElement.querySelectorAll('.stagger-item'), { stagger: 0.05 });
            staggerIn(this.panel.nativeElement.querySelectorAll('.zona-card'), { delay: 0.1 });
          });
        },
        error: () => this.cargando.set(false),
      });

    this.climaService.obtener(estacion.est_id_estacion, this.wizard.fecha()).subscribe({
      next: (c) => {
        this.clima.set(c);
        this.cargandoClima.set(false);
      },
      error: () => this.cargandoClima.set(false),
    });

    this.servicioService.listar(estacion.est_id_estacion).subscribe({
      next: (servicios) => {
        this.servicio.set(servicios[0] ?? null);
        this.cargandoServicio.set(false);
      },
      error: () => this.cargandoServicio.set(false),
    });
  }

  iconoCategoria(zona: ZonaTuristica) {
    return iconoDeCategoria(zona.zon_categoria);
  }

  iconoClima(): 'sun' | 'cloud-rain' {
    return this.clima() ? (iconoDeClima(this.clima()!.cli_condicion) as 'sun' | 'cloud-rain') : 'sun';
  }

  seleccionar(zona: ZonaTuristica): void {
    this.wizard.seleccionarZona(zona);
  }

  ajustarPreferencias(): void {
    this.router.navigateByUrl('/planificar/preferencias');
  }

  cambiarEstacion(): void {
    this.router.navigateByUrl('/planificar/estacion');
  }

  continuar(): void {
    if (!this.wizard.zonaSeleccionada()) return;
    this.router.navigateByUrl('/planificar/ruta');
  }
}
