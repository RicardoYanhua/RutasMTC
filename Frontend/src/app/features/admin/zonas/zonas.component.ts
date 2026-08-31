import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ZonaService } from '../../../core/services/zona.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { ZonaTuristica } from '../../../core/models/zona.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ImageSlotComponent } from '../../../shared/components/image-slot/image-slot.component';
import { EstadoRegistroComponent } from '../../../shared/components/estado/estado-registro.component';
import { SegmentedComponent } from '../../../shared/components/segmented/segmented.component';
import { iconoDeCategoria } from '../../../shared/components/icon/icon.util';

const FILTROS = ['Todas', 'Publicadas', 'Pendientes', 'De baja'] as const;

/**
 * Catálogo de zonas turísticas en tarjetas, no en tabla: con 40+ zonas con
 * fotografía, una retícula se recorre de un vistazo y una tabla de ocho
 * columnas obliga a leer fila por fila.
 *
 * El alta y la edición viven en su propia pantalla (`/admin/zonas/nueva`,
 * `.../:id/editar`): un formulario de diez campos desplegándose sobre el
 * listado empujaba el contenido y hacía perder el sitio.
 *
 * Travel Group edita; PeruRail y cualquier otro rol con acceso lo ven en
 * consulta (`puedeEditar`).
 */
@Component({
  selector: 'app-admin-zonas',
  imports: [IconComponent, ImageSlotComponent, EstadoRegistroComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zonas.component.html',
  styleUrls: ['../admin-shared.css', './zonas.component.css'],
})
export class ZonasComponent implements OnInit {
  private readonly zonaService = inject(ZonaService);
  private readonly notificaciones = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly zonas = signal<ZonaTuristica[]>([]);
  readonly cargando = signal(true);
  readonly aDarDeBaja = signal<ZonaTuristica | null>(null);
  readonly ocupado = signal(false);

  readonly busqueda = signal('');
  readonly filtroEstado = signal<string>('Todas');
  readonly filtrosEstado = [...FILTROS];

  readonly puedeEditar = computed(() => this.auth.edita('zonas'));

  readonly publicadas = computed(() => this.zonas().filter((z) => z.zon_activo && z.zon_publicado).length);
  readonly pendientes = computed(() => this.zonas().filter((z) => z.zon_activo && !z.zon_publicado).length);
  readonly sinFoto = computed(() => this.zonas().filter((z) => !z.zon_imagen_url).length);
  readonly estacionesCubiertas = computed(() => new Set(this.zonas().map((z) => z.zon_id_estacion)).size);

  /** Búsqueda y filtro se resuelven en cliente: el catálogo entero ya está cargado. */
  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();
    return this.zonas().filter((z) => {
      if (estado === 'Publicadas' && !(z.zon_activo && z.zon_publicado)) return false;
      if (estado === 'Pendientes' && !(z.zon_activo && !z.zon_publicado)) return false;
      if (estado === 'De baja' && z.zon_activo) return false;
      if (!texto) return true;
      return `${z.zon_nombre} ${z.zon_codigo} ${z.estacionNombre ?? ''} ${z.zon_categoria}`
        .toLowerCase()
        .includes(texto);
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.zonaService.listar().subscribe({
      next: (zonas) => {
        this.zonas.set(zonas);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  iconoCategoria(zona: ZonaTuristica) {
    return iconoDeCategoria(zona.zon_categoria);
  }

  nueva(): void {
    this.router.navigateByUrl('/admin/zonas/nueva');
  }

  editar(zona: ZonaTuristica): void {
    this.router.navigate(['/admin/zonas', zona.zon_id_zona, 'editar']);
  }

  pedirBaja(zona: ZonaTuristica): void {
    this.aDarDeBaja.set(zona);
  }

  confirmarBaja(): void {
    const zona = this.aDarDeBaja();
    if (!zona) return;
    this.ocupado.set(true);
    this.zonaService.desactivar(zona.zon_id_zona).subscribe({
      next: () => {
        this.notificaciones.exito(`"${zona.zon_nombre}" quedó de baja. Puedes reactivarla cuando quieras.`);
        this.ocupado.set(false);
        this.aDarDeBaja.set(null);
        this.cargar();
      },
      error: () => this.ocupado.set(false),
    });
  }

  reactivar(zona: ZonaTuristica): void {
    this.ocupado.set(true);
    this.zonaService.reactivar(zona.zon_id_zona).subscribe({
      next: () => {
        this.notificaciones.exito(`"${zona.zon_nombre}" vuelve a estar activa.`);
        this.ocupado.set(false);
        this.cargar();
      },
      error: () => this.ocupado.set(false),
    });
  }
}
