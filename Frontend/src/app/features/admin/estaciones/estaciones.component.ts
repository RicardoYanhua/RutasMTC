import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EstacionService } from '../../../core/services/estacion.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { Estacion } from '../../../core/models/estacion.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ImageSlotComponent } from '../../../shared/components/image-slot/image-slot.component';
import { EstadoRegistroComponent } from '../../../shared/components/estado/estado-registro.component';
import { SegmentedComponent } from '../../../shared/components/segmented/segmented.component';

const FILTROS = ['Todas', 'Publicadas', 'Pendientes', 'De baja'] as const;

/**
 * Catálogo de estaciones. Dueño del dato: PeruRail, que aquí sí tiene CRUD
 * completo (antes era una pantalla de solo lectura para todo el mundo).
 *
 * Travel Group entra en modo consulta: necesita ver el catálogo para vincular
 * sus zonas a un punto de partida, tal como pide el caso.
 */
@Component({
  selector: 'app-admin-estaciones',
  imports: [IconComponent, ImageSlotComponent, EstadoRegistroComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estaciones.component.html',
  styleUrls: ['../admin-shared.css', '../zonas/zonas.component.css'],
})
export class EstacionesComponent implements OnInit {
  private readonly estacionService = inject(EstacionService);
  private readonly notificaciones = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly estaciones = signal<Estacion[]>([]);
  readonly cargando = signal(true);
  readonly aDarDeBaja = signal<Estacion | null>(null);
  readonly ocupado = signal(false);

  readonly busqueda = signal('');
  readonly filtroEstado = signal<string>('Todas');
  readonly filtrosEstado = [...FILTROS];

  readonly puedeEditar = computed(() => this.auth.edita('estaciones'));

  // Cifras derivadas del catálogo ya cargado: ningún endpoint adicional.
  readonly publicadas = computed(() => this.estaciones().filter((e) => e.est_activo && e.est_publicado).length);
  readonly regiones = computed(() => new Set(this.estaciones().map((e) => e.est_region)).size);
  readonly zonasTotales = computed(() => this.estaciones().reduce((t, e) => t + (e.zonasCount ?? 0), 0));
  readonly andenesTotales = computed(() => this.estaciones().reduce((t, e) => t + e.est_andenes, 0));

  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();
    return this.estaciones().filter((e) => {
      if (estado === 'Publicadas' && !(e.est_activo && e.est_publicado)) return false;
      if (estado === 'Pendientes' && !(e.est_activo && !e.est_publicado)) return false;
      if (estado === 'De baja' && e.est_activo) return false;
      if (!texto) return true;
      return `${e.est_nombre} ${e.est_codigo} ${e.est_region}`.toLowerCase().includes(texto);
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.estacionService.listar().subscribe({
      next: (estaciones) => {
        this.estaciones.set(estaciones);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  nueva(): void {
    this.router.navigateByUrl('/admin/estaciones/nueva');
  }

  editar(estacion: Estacion): void {
    this.router.navigate(['/admin/estaciones', estacion.est_id_estacion, 'editar']);
  }

  pedirBaja(estacion: Estacion): void {
    this.aDarDeBaja.set(estacion);
  }

  confirmarBaja(): void {
    const estacion = this.aDarDeBaja();
    if (!estacion) return;
    this.ocupado.set(true);
    this.estacionService.desactivar(estacion.est_id_estacion).subscribe({
      next: () => {
        this.notificaciones.exito(`"${estacion.est_nombre}" quedó de baja. Puedes reactivarla cuando quieras.`);
        this.ocupado.set(false);
        this.aDarDeBaja.set(null);
        this.cargar();
      },
      error: () => this.ocupado.set(false),
    });
  }

  reactivar(estacion: Estacion): void {
    this.ocupado.set(true);
    this.estacionService.reactivar(estacion.est_id_estacion).subscribe({
      next: () => {
        this.notificaciones.exito(`"${estacion.est_nombre}" vuelve a estar activa.`);
        this.ocupado.set(false);
        this.cargar();
      },
      error: () => this.ocupado.set(false),
    });
  }
}
