import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ServicioService } from '../../../core/services/servicio.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { Servicio } from '../../../core/models/servicio.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { EstadoRegistroComponent } from '../../../shared/components/estado/estado-registro.component';
import { SegmentedComponent } from '../../../shared/components/segmented/segmented.component';

const FILTROS = ['Todos', 'Publicados', 'Pendientes', 'De baja'] as const;

/**
 * Horarios y tarifas de PeruRail, en tarjetas. Cada tarjeta muestra el trayecto
 * como recorrido (origen -> destino) y el horario como una línea de salida a
 * retorno: es como se lee un servicio ferroviario, no como una fila de celdas.
 *
 * El alta y la edición viven en su propia pantalla (`/admin/servicios/nuevo`,
 * `.../:id/editar`).
 */
@Component({
  selector: 'app-admin-servicios',
  imports: [IconComponent, EstadoRegistroComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './servicios.component.html',
  styleUrls: ['../admin-shared.css', './servicios.component.css'],
})
export class ServiciosComponent implements OnInit {
  private readonly servicioService = inject(ServicioService);
  private readonly notificaciones = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly servicios = signal<Servicio[]>([]);
  readonly cargando = signal(true);
  readonly aDarDeBaja = signal<Servicio | null>(null);
  readonly ocupado = signal(false);

  readonly busqueda = signal('');
  readonly filtroEstado = signal<string>('Todos');
  readonly filtrosEstado = [...FILTROS];

  readonly puedeEditar = computed(() => this.auth.edita('servicios'));

  readonly publicados = computed(
    () => this.servicios().filter((s) => s.est_serv_activo && s.est_serv_publicado).length,
  );
  readonly rutasDistintas = computed(
    () => new Set(this.servicios().map((s) => `${s.est_id_estacion_origen}-${s.est_id_estacion_destino}`)).size,
  );
  readonly tarifaMedia = computed(() => {
    const lista = this.servicios();
    if (!lista.length) return 0;
    return Math.round(lista.reduce((total, s) => total + Number(s.est_precio), 0) / lista.length);
  });
  readonly transitoMedio = computed(() => {
    const lista = this.servicios();
    if (!lista.length) return 0;
    return Math.round(lista.reduce((total, s) => total + Number(s.est_minutos_transito), 0) / lista.length);
  });

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();
    return this.servicios().filter((s) => {
      if (estado === 'Publicados' && !(s.est_serv_activo && s.est_serv_publicado)) return false;
      if (estado === 'Pendientes' && !(s.est_serv_activo && !s.est_serv_publicado)) return false;
      if (estado === 'De baja' && s.est_serv_activo) return false;
      if (!texto) return true;
      return `${s.est_nombre_servicio} ${s.origenNombre ?? ''} ${s.destinoNombre ?? ''}`.toLowerCase().includes(texto);
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.servicioService.listar().subscribe({
      next: (servicios) => {
        this.servicios.set(servicios);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  nuevo(): void {
    this.router.navigateByUrl('/admin/servicios/nuevo');
  }

  editar(servicio: Servicio): void {
    this.router.navigate(['/admin/servicios', servicio.est_id_servicio, 'editar']);
  }

  pedirBaja(servicio: Servicio): void {
    this.aDarDeBaja.set(servicio);
  }

  confirmarBaja(): void {
    const servicio = this.aDarDeBaja();
    if (!servicio) return;
    this.ocupado.set(true);
    this.servicioService.desactivar(servicio.est_id_servicio).subscribe({
      next: () => {
        this.notificaciones.exito(`"${servicio.est_nombre_servicio}" quedó de baja.`);
        this.ocupado.set(false);
        this.aDarDeBaja.set(null);
        this.cargar();
      },
      error: () => this.ocupado.set(false),
    });
  }

  reactivar(servicio: Servicio): void {
    this.ocupado.set(true);
    this.servicioService.reactivar(servicio.est_id_servicio).subscribe({
      next: () => {
        this.notificaciones.exito(`"${servicio.est_nombre_servicio}" vuelve a estar activo.`);
        this.ocupado.set(false);
        this.cargar();
      },
      error: () => this.ocupado.set(false),
    });
  }
}
