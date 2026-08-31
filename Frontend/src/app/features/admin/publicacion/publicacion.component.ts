import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { ZonaService } from '../../../core/services/zona.service';
import { EstacionService } from '../../../core/services/estacion.service';
import { ServicioService } from '../../../core/services/servicio.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ZonaTuristica } from '../../../core/models/zona.model';
import { Estacion } from '../../../core/models/estacion.model';
import { Servicio } from '../../../core/models/servicio.model';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { ImageSlotComponent } from '../../../shared/components/image-slot/image-slot.component';
import { EstadoRegistroComponent } from '../../../shared/components/estado/estado-registro.component';
import { SegmentedComponent } from '../../../shared/components/segmented/segmented.component';
import { iconoDeCategoria } from '../../../shared/components/icon/icon.util';

/** Fila normalizada del tablero: las tres entidades se gobiernan igual. */
export interface FilaPublicacion {
  tipo: 'zona' | 'estacion' | 'servicio';
  id: number;
  titulo: string;
  subtitulo: string;
  detalle: string;
  imagenUrl: string | null;
  icono: IconName;
  activo: boolean;
  publicado: boolean;
  fuente: string;
}

const PESTANAS = ['Pendientes', 'Publicados', 'De baja', 'Todo'] as const;

/**
 * Tablero de publicación del gestor MTC.
 *
 * Aquí el ministerio decide qué del catálogo de PeruRail y de Travel Group
 * llega al ciudadano. Las tres entidades se muestran en un solo tablero y no en
 * tres pantallas: la pregunta que trae aquí al gestor es "¿qué está esperando
 * mi visto bueno?", no "¿qué zonas hay?".
 *
 * Publicar es la ÚNICA operación de esta pantalla. Dar de alta o de baja sigue
 * siendo del dueño del dato, y el backend lo impone.
 */
@Component({
  selector: 'app-admin-publicacion',
  imports: [IconComponent, ImageSlotComponent, EstadoRegistroComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publicacion.component.html',
  styleUrls: ['../admin-shared.css', './publicacion.component.css'],
})
export class PublicacionComponent implements OnInit {
  private readonly zonaService = inject(ZonaService);
  private readonly estacionService = inject(EstacionService);
  private readonly servicioService = inject(ServicioService);
  private readonly notificaciones = inject(NotificationService);

  readonly zonas = signal<ZonaTuristica[]>([]);
  readonly estaciones = signal<Estacion[]>([]);
  readonly servicios = signal<Servicio[]>([]);
  readonly cargando = signal(true);
  /** Id en curso, con su tipo, para deshabilitar solo esa tarjeta. */
  readonly ocupado = signal<string | null>(null);

  readonly pestanas = [...PESTANAS];
  readonly pestana = signal<string>('Pendientes');
  readonly tipos = ['Todo el catálogo', 'Zonas', 'Estaciones', 'Servicios'];
  readonly tipo = signal<string>('Todo el catálogo');

  readonly filas = computed<FilaPublicacion[]>(() => [
    ...this.estaciones().map((e) => ({
      tipo: 'estacion' as const,
      id: e.est_id_estacion,
      titulo: e.est_nombre,
      subtitulo: `${e.est_region} · ${e.est_altitud_msnm} msnm`,
      detalle: `${e.est_andenes} andenes · ${e.zonasCount ?? 0} zonas a pie`,
      imagenUrl: e.est_imagen_url,
      icono: 'train' as IconName,
      activo: !!e.est_activo,
      publicado: !!e.est_publicado,
      fuente: 'PeruRail',
    })),
    ...this.zonas().map((z) => ({
      tipo: 'zona' as const,
      id: z.zon_id_zona,
      titulo: z.zon_nombre,
      subtitulo: `${z.zon_categoria} · desde ${z.estacionNombre}`,
      detalle: `${z.zon_distancia_km} km ida · ${z.zon_minutos_ida_vuelta} min · ${z.zon_dificultad}`,
      imagenUrl: z.zon_imagen_url,
      icono: iconoDeCategoria(z.zon_categoria),
      activo: !!z.zon_activo,
      publicado: !!z.zon_publicado,
      fuente: 'Travel Group Perú',
    })),
    ...this.servicios().map((s) => ({
      tipo: 'servicio' as const,
      id: s.est_id_servicio,
      titulo: s.est_nombre_servicio,
      subtitulo: `${s.origenNombre} a ${s.destinoNombre}`,
      detalle: `${s.est_hora_salida} · ${s.est_minutos_transito} min · S/ ${s.est_precio}`,
      imagenUrl: null,
      icono: 'ticket' as IconName,
      activo: !!s.est_serv_activo,
      publicado: !!s.est_serv_publicado,
      fuente: 'PeruRail',
    })),
  ]);

  readonly pendientes = computed(() => this.filas().filter((f) => f.activo && !f.publicado).length);
  readonly publicados = computed(() => this.filas().filter((f) => f.activo && f.publicado).length);
  readonly deBaja = computed(() => this.filas().filter((f) => !f.activo).length);

  readonly visibles = computed(() => {
    const pestana = this.pestana();
    const tipo = this.tipo();
    return this.filas().filter((f) => {
      if (pestana === 'Pendientes' && !(f.activo && !f.publicado)) return false;
      if (pestana === 'Publicados' && !(f.activo && f.publicado)) return false;
      if (pestana === 'De baja' && f.activo) return false;
      if (tipo === 'Zonas' && f.tipo !== 'zona') return false;
      if (tipo === 'Estaciones' && f.tipo !== 'estacion') return false;
      if (tipo === 'Servicios' && f.tipo !== 'servicio') return false;
      return true;
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    forkJoin({
      zonas: this.zonaService.listar(),
      estaciones: this.estacionService.listar(),
      servicios: this.servicioService.listar(),
    }).subscribe({
      next: ({ zonas, estaciones, servicios }) => {
        this.zonas.set(zonas);
        this.estaciones.set(estaciones);
        this.servicios.set(servicios);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  clave(fila: FilaPublicacion): string {
    return `${fila.tipo}-${fila.id}`;
  }

  alternarPublicacion(fila: FilaPublicacion): void {
    const publicar = !fila.publicado;
    this.ocupado.set(this.clave(fila));

    // El tipo se estrecha a `Observable<unknown>` a propósito: las tres
    // llamadas devuelven entidades distintas y aquí solo importa que terminen.
    const operacion: Observable<unknown> =
      fila.tipo === 'zona'
        ? this.zonaService.publicar(fila.id, publicar)
        : fila.tipo === 'estacion'
          ? this.estacionService.publicar(fila.id, publicar)
          : this.servicioService.publicar(fila.id, publicar);

    operacion.subscribe({
      next: () => {
        this.notificaciones.exito(
          publicar ? `"${fila.titulo}" ya es visible en el sitio.` : `"${fila.titulo}" se retiró del sitio.`,
        );
        this.ocupado.set(null);
        this.cargar();
      },
      error: () => this.ocupado.set(null),
    });
  }
}
