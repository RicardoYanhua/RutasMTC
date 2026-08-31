import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnInit,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WizardStateService } from '../../../core/services/wizard-state.service';
import { InformeService } from '../../../core/services/informe.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Informe } from '../../../core/models/informe.model';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { ImageSlotComponent } from '../../../shared/components/image-slot/image-slot.component';
import { iconoDeCategoria, iconoDeClima } from '../../../shared/components/icon/icon.util';
import { fadeUp } from '../../../shared/animations/animar.util';

interface TramoJornada {
  tipo: 'tren' | 'pie';
  icono: IconName;
  /** Ausente cuando no hay servicio ferroviario del que derivar el reloj. */
  hora: string | null;
  titulo: string;
  detalle: string;
}

/** Escala del índice UV en la que el 11 ya es "extremo": el tope de la barra. */
const UV_MAXIMO = 11;

/** "07:05:00" o "07:05" -> minutos desde medianoche. Devuelve null si no parsea. */
function aMinutos(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const partes = hora.split(':');
  const h = Number(partes[0]);
  const m = Number(partes[1] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** Minutos desde medianoche -> "HH:MM", dando la vuelta al pasar de 24 h. */
function aHora(minutos: number): string {
  const total = ((minutos % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

@Component({
  selector: 'app-informe',
  imports: [IconComponent, ImageSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './informe.component.html',
  styleUrl: './informe.component.css',
})
export class InformeComponent implements OnInit {
  @ViewChild('documento') private documento?: ElementRef<HTMLElement>;

  readonly wizard = inject(WizardStateService);
  private readonly informeService = inject(InformeService);
  private readonly notificaciones = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  readonly informe = signal<Informe | null>(null);
  readonly cargando = signal(true);

  /**
   * La jornada completa como cinta horizontal: tren de ida, llegada, caminata,
   * regreso al andén y tren de vuelta. Las horas se derivan del servicio; sin
   * servicio ferroviario se conserva solo el tramo a pie, sin reloj inventado.
   */
  readonly jornada = computed<TramoJornada[]>(() => {
    const inf = this.informe();
    if (!inf) return [];

    const servicio = inf.servicio;
    const salida = aMinutos(servicio?.est_hora_salida);
    const transito = servicio?.est_minutos_transito ?? 0;
    const llegada = salida === null ? null : salida + transito;
    const finCaminata = llegada === null ? null : llegada + inf.ruta.tiempoTotalMin;

    const tramos: TramoJornada[] = [];

    if (servicio && salida !== null) {
      tramos.push({
        tipo: 'tren',
        icono: 'train',
        hora: aHora(salida),
        titulo: 'Sale el tren',
        detalle: `${servicio.est_nombre_servicio} · ${transito} min de tránsito`,
      });
    }

    tramos.push({
      tipo: 'pie',
      icono: 'pin',
      hora: llegada === null ? null : aHora(llegada),
      titulo: `Andén de ${inf.estacion.est_nombre}`,
      detalle: `${inf.estacion.est_andenes} andenes · ${inf.estacion.est_altitud_msnm} msnm`,
    });

    tramos.push({
      tipo: 'pie',
      icono: 'walk',
      hora: llegada === null ? null : aHora(llegada),
      titulo: `A pie hacia ${inf.zona.zon_nombre}`,
      detalle: `${inf.zona.zon_distancia_km} km de ida · esfuerzo ${inf.ruta.dificultadResultado}`,
    });

    tramos.push({
      tipo: 'pie',
      icono: 'flag',
      hora: finCaminata === null ? null : aHora(finCaminata),
      titulo: 'De vuelta en la estación',
      detalle: `${inf.ruta.distanciaTotalKm} km y ${inf.ruta.tiempoTotalMin} min caminando`,
    });

    if (servicio) {
      tramos.push({
        tipo: 'tren',
        icono: 'train',
        hora: aHora(aMinutos(servicio.est_hora_retorno) ?? 0),
        titulo: 'Tren de retorno',
        detalle: `Tarifa ida y vuelta S/ ${servicio.est_precio}`,
      });
    }

    return tramos;
  });

  ngOnInit(): void {
    const codigo = this.route.snapshot.paramMap.get('codigo');
    if (codigo) {
      this.informeService.obtener(codigo).subscribe({
        next: (informe) => this.mostrar(informe),
        error: () => {
          this.notificaciones.error('No se encontró el informe solicitado.');
          this.router.navigateByUrl('/planificar/preferencias');
        },
      });
      return;
    }

    const estacion = this.wizard.estacion();
    const zona = this.wizard.zona();
    if (!estacion || !zona) {
      this.router.navigateByUrl('/planificar/preferencias');
      return;
    }

    this.informeService
      .generar({
        estacionId: estacion.est_id_estacion,
        zonaId: zona.zon_id_zona,
        intereses: this.wizard.intereses(),
        dificultadMax: this.wizard.dificultadMax(),
        minutosMax: this.wizard.minutosMax(),
        fecha: this.wizard.fecha(),
      })
      .subscribe({
        next: (informe) => {
          this.mostrar(informe);
          this.router.navigate(['/planificar/informe', informe.codigo], { replaceUrl: true });
        },
        error: () => this.router.navigateByUrl('/planificar/ruta'),
      });
  }

  iconoClima(): IconName {
    const c = this.informe()?.clima;
    return c ? iconoDeClima(c.cli_condicion) : 'sun';
  }

  iconoZona(): IconName {
    const zona = this.informe()?.zona;
    return zona ? iconoDeCategoria(zona.zon_categoria) : 'pin';
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

  /** Índice UV a porcentaje de barra, con 11 como tope de la escala. */
  porcentajeUv(uv: number): number {
    return Math.min(Math.round((uv / UV_MAXIMO) * 100), 100);
  }

  private mostrar(informe: Informe): void {
    this.informe.set(informe);
    this.cargando.set(false);
    // El <article #documento> solo existe tras el @if de la plantilla; se espera
    // al siguiente ciclo de render antes de leer el ViewChild.
    afterNextRender(() => this.documento && fadeUp(this.documento.nativeElement, { y: 12 }), { injector: this.injector });
  }

  descargarPdf(): void {
    window.print();
  }

  volverARuta(): void {
    this.router.navigateByUrl('/planificar/ruta');
  }

  planificarOtro(): void {
    this.wizard.reiniciar();
    this.router.navigateByUrl('/');
  }
}
